import axios from 'axios';
import { SEFAZ_STATUS } from '../../constants/sefaz.js';
import { SefazError } from '../../errors/SefazError.js';
import { GhinfeError } from '../../errors/GhinfeError.js';
import {
  SEFAZ_MOCK_RESPONSES,
  buildMockProtNFeXml,
  buildMockRetEnvEventoXml,
  buildMockRetConsStatServXml,
  wrapSoapResponse,
  wrapSoapEventoResponse,
  wrapSoapStatusResponse,
} from '../mocks/sefaz-responses.js';
import { UF_IBGE } from '../../constants/sefaz.js';
import { SEFAZ_SERVICO, SefazEndpointResolver } from '../../sefaz/SefazEndpointResolver.js';
import { criarHttpsAgentSefaz } from '../../sefaz/httpsAgent.js';

const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';

/** Serviço WSDL e operação (action SOAP 1.2) de cada web service da NF-e 4.00. */
const WEBSERVICES = {
  autorizacao: { wsdl: 'NFeAutorizacao4', operacao: 'nfeAutorizacaoLote' },
  evento: { wsdl: 'NFeRecepcaoEvento4', operacao: 'nfeRecepcaoEvento' },
  status: { wsdl: 'NFeStatusServico4', operacao: 'nfeStatusServicoNF' },
};

const semDeclaracao = (xml) => xml.replace(/^\s*<\?xml[^>]*\?>\s*/, '');

/**
 * Extrai cStat e xMotivo de um XML de retorno SEFAZ.
 * No modo síncrono o lote vem com cStat 104 e o resultado da NF-e fica em protNFe.
 * @param {string} xml
 */
function parseRetorno(xml) {
  const protNFe = xml.match(/<protNFe[\s>][\s\S]*?<\/protNFe>/)?.[0];
  const fonte = protNFe ?? xml;
  const tag = (src, nome) => src.match(new RegExp(`<${nome}>([^<]*)</${nome}>`))?.[1];

  return {
    cStat: tag(fonte, 'cStat') ?? '999',
    xMotivo: tag(fonte, 'xMotivo') ?? 'Retorno não identificado',
    cStatLote: tag(xml, 'cStat'),
    nProt: tag(fonte, 'nProt'),
    chNFe: tag(fonte, 'chNFe'),
    protNFe,
    xmlRetorno: xml,
  };
}

/**
 * Serviço de comunicação SOAP com a SEFAZ.
 * Suporta modo mock para desenvolvimento sem certificado/homologação.
 */
export class NFeSoapService {
  /**
   * @param {{
   *   mock?: boolean,
   *   endpoint?: string,
   *   eventoEndpoint?: string,
   *   statusEndpoint?: string,
   *   certificado?: { pfx: Buffer|string, senha: string },
   *   ca?: string|string[],
   *   timeout?: number,
   *   mockScenario?: string,
   *   mockEventoScenario?: string,
   *   mockStatusScenario?: string,
   * }} [options]
   *   certificado: A1 usado no TLS mútuo exigido pela SEFAZ (pode ser informado por chamada)
   *   ca: CAs extras além das raízes do Node e da ICP-Brasil v10
   */
  constructor(options = {}) {
    this.mock = options.mock ?? true;
    this.endpoint = options.endpoint;
    this.eventoEndpoint = options.eventoEndpoint;
    this.statusEndpoint = options.statusEndpoint;
    this.certificado = options.certificado;
    this.ca = options.ca;
    this.timeout = options.timeout ?? 30000;
    this.mockScenario = options.mockScenario ?? 'autorizado';
    this.mockEventoScenario = options.mockEventoScenario ?? 'registrado';
    this.mockStatusScenario = options.mockStatusScenario ?? 'ok';
    this.agentes = new WeakMap();
  }

  /** @param {{ pfx: Buffer|string, senha: string }} [certificado] */
  #httpsAgent(certificado) {
    const cert = certificado ?? this.certificado;
    if (!cert?.pfx) {
      throw new GhinfeError(
        'Certificado A1 obrigatório para comunicar com a SEFAZ (TLS mútuo). Informe options.certificado ou o certificado na chamada',
        'SEFAZ_CERTIFICADO_AUSENTE'
      );
    }
    if (!this.agentes.has(cert)) {
      this.agentes.set(cert, criarHttpsAgentSefaz(cert, { ca: this.ca }));
    }
    return this.agentes.get(cert);
  }

  /**
   * Envelope SOAP 1.2 com o XML de dados direto em nfeDadosMsg (sem base64, sem declaração aninhada).
   * @param {keyof typeof WEBSERVICES} servico
   * @param {string} xmlDados
   */
  #envelope(servico, xmlDados) {
    const { wsdl } = WEBSERVICES[servico];
    return (
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>' +
      `<nfeDadosMsg xmlns="${NFE_NAMESPACE}/wsdl/${wsdl}">${semDeclaracao(xmlDados)}</nfeDadosMsg>` +
      '</soap12:Body></soap12:Envelope>'
    );
  }

  /**
   * @param {keyof typeof WEBSERVICES} servico
   * @param {string} url
   * @param {string} envelope
   * @param {{ pfx: Buffer|string, senha: string }} [certificado]
   * @returns {Promise<string>} conteúdo de nfeResultMsg
   */
  async #post(servico, url, envelope, certificado) {
    const { wsdl, operacao } = WEBSERVICES[servico];
    try {
      const response = await axios.post(url, envelope, {
        httpsAgent: this.#httpsAgent(certificado),
        headers: {
          'Content-Type': `application/soap+xml; charset=utf-8; action="${NFE_NAMESPACE}/wsdl/${wsdl}/${operacao}"`,
        },
        timeout: this.timeout,
        responseType: 'text',
      });
      const bodyMatch = response.data.match(/<nfeResultMsg[^>]*>([\s\S]*?)<\/nfeResultMsg>/);
      return bodyMatch?.[1] ?? response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new GhinfeError(
          `Falha na comunicação SOAP (${wsdl}) com SEFAZ: ${error.message}`,
          'SEFAZ_HTTP_ERROR',
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw error;
    }
  }

  /**
   * Monta enviNFe síncrono com a NF-e assinada como XML (não base64).
   * @param {string} xmlNFeAssinado
   * @param {string} [idLote]
   */
  buildEnviNFe(xmlNFeAssinado, idLote = '1') {
    return (
      `<enviNFe xmlns="${NFE_NAMESPACE}" versao="4.00">` +
      `<idLote>${idLote}</idLote><indSinc>1</indSinc>${semDeclaracao(xmlNFeAssinado)}</enviNFe>`
    );
  }

  /**
   * Monta envelope SOAP para NFeAutorizacao4.
   * @param {string} xmlNFeAssinado
   * @param {string} [idLote]
   */
  buildAutorizacaoEnvelope(xmlNFeAssinado, idLote = '1') {
    return this.#envelope('autorizacao', this.buildEnviNFe(xmlNFeAssinado, idLote));
  }

  /**
   * Envia NF-e para autorização na SEFAZ (ou mock).
   * @param {string} xmlNFeAssinado
   * @param {string} chaveAcesso
   * @param {string} [idLote]
   * @param {{ pfx: Buffer|string, senha: string }} [certificado] Padrão: options.certificado
   */
  async autorizar(xmlNFeAssinado, chaveAcesso, idLote = '1', certificado) {
    if (this.mock) {
      return this.#mockAutorizar(chaveAcesso);
    }

    if (!this.endpoint) {
      throw new GhinfeError(
        'Endpoint SEFAZ não configurado. Defina options.endpoint ou use mock: true',
        'SEFAZ_ENDPOINT_MISSING'
      );
    }

    const envelope = this.buildAutorizacaoEnvelope(xmlNFeAssinado, idLote);
    const innerXml = await this.#post('autorizacao', this.endpoint, envelope, certificado);
    return this.#processarRetorno(innerXml);
  }

  /**
   * Simula envio à SEFAZ com cenários configuráveis.
   * @param {string} chaveAcesso
   */
  async #mockAutorizar(chaveAcesso) {
    await new Promise((r) => setTimeout(r, 300));

    const scenarioMap = {
      autorizado: SEFAZ_MOCK_RESPONSES.autorizado,
      duplicidade: SEFAZ_MOCK_RESPONSES.rejeicaoDuplicidade,
      schema: SEFAZ_MOCK_RESPONSES.rejeicaoSchema,
      certificado: SEFAZ_MOCK_RESPONSES.rejeicaoCertificado,
      paralisado: SEFAZ_MOCK_RESPONSES.servicoParalisado,
    };

    const resultado = scenarioMap[this.mockScenario] ?? SEFAZ_MOCK_RESPONSES.autorizado;
    const innerXml = buildMockProtNFeXml(chaveAcesso, resultado);
    const soapXml = wrapSoapResponse(innerXml);

    return this.#processarRetorno(innerXml, { soapXml, mock: true });
  }

  /**
   * @param {string} xml
   * @param {Record<string, unknown>} [meta]
   */
  #processarRetorno(xml, meta = {}) {
    const retorno = parseRetorno(xml);

    // 150 = autorizado fora de prazo (ex.: emissão em contingência)
    if ([SEFAZ_STATUS.AUTORIZADO, '150'].includes(retorno.cStat)) {
      return {
        sucesso: true,
        autorizado: true,
        cStat: retorno.cStat,
        xMotivo: retorno.xMotivo,
        cStatLote: retorno.cStatLote,
        protocolo: retorno.nProt,
        chaveAcesso: retorno.chNFe,
        xmlProtocolo: retorno.protNFe ?? xml,
        xmlRetorno: xml,
        ...meta,
      };
    }

    if (retorno.cStat.startsWith('1')) {
      return {
        sucesso: true,
        autorizado: false,
        cStat: retorno.cStat,
        xMotivo: retorno.xMotivo,
        cStatLote: retorno.cStatLote,
        xmlProtocolo: retorno.protNFe ?? xml,
        xmlRetorno: xml,
        ...meta,
      };
    }

    throw new SefazError(retorno.cStat, retorno.xMotivo, {
      cStatLote: retorno.cStatLote,
      xmlRetorno: xml,
      ...meta,
    });
  }

  /**
   * Define cenário do mock em runtime.
   * @param {'autorizado'|'duplicidade'|'schema'|'certificado'|'paralisado'} scenario
   */
  setMockScenario(scenario) {
    this.mockScenario = scenario;
  }

  /**
   * Monta envelope SOAP para NFeRecepcaoEvento4.
   * O idLote já vem no envEvento montado pelo NFeEventoXmlBuilder.
   * @param {string} xmlEventoAssinado envEvento assinado
   */
  buildEventoEnvelope(xmlEventoAssinado) {
    return this.#envelope('evento', xmlEventoAssinado);
  }

  /**
   * Envia evento NF-e (cancelamento, CC-e) para SEFAZ.
   * @param {string} xmlEventoAssinado
   * @param {string} chaveAcesso
   * @param {string} tpEvento
   * @param {string} [idLote] Não usado no envio real (o idLote está no envEvento)
   * @param {{ pfx: Buffer|string, senha: string }} [certificado] Padrão: options.certificado
   */
  async enviarEvento(xmlEventoAssinado, chaveAcesso, tpEvento, idLote, certificado) {
    if (this.mock) {
      return this.#mockEnviarEvento(chaveAcesso, tpEvento);
    }

    const endpoint = this.eventoEndpoint ?? this.endpoint;
    if (!endpoint) {
      throw new GhinfeError(
        'Endpoint SEFAZ de eventos não configurado. Defina eventoEndpoint ou use mock: true',
        'SEFAZ_EVENTO_ENDPOINT_MISSING'
      );
    }

    const envelope = this.buildEventoEnvelope(xmlEventoAssinado);
    const innerXml = await this.#post('evento', endpoint, envelope, certificado);
    return this.#processarRetornoEvento(innerXml);
  }

  /**
   * @param {string} chaveAcesso
   * @param {string} tpEvento
   */
  async #mockEnviarEvento(chaveAcesso, tpEvento) {
    await new Promise((r) => setTimeout(r, 200));

    const scenarioMap = {
      registrado: SEFAZ_MOCK_RESPONSES.eventoRegistrado,
      rejeitado: SEFAZ_MOCK_RESPONSES.eventoRejeitado,
    };

    const resultado = scenarioMap[this.mockEventoScenario] ?? SEFAZ_MOCK_RESPONSES.eventoRegistrado;
    const innerXml = buildMockRetEnvEventoXml(chaveAcesso, tpEvento, resultado);
    const soapXml = wrapSoapEventoResponse(innerXml);

    return this.#processarRetornoEvento(innerXml, { soapXml, mock: true });
  }

  /**
   * @param {string} xml
   * @param {Record<string, unknown>} [meta]
   */
  #processarRetornoEvento(xml, meta = {}) {
    const cStatMatches = [...xml.matchAll(/<cStat>(\d+)<\/cStat>/g)];
    const xMotivoMatches = [...xml.matchAll(/<xMotivo>([^<]+)<\/xMotivo>/g)];
    const nProtMatch = xml.match(/<nProt>(\d+)<\/nProt>/);
    const tpEventoMatch = xml.match(/<tpEvento>(\d+)<\/tpEvento>/);

    const cStatLote = cStatMatches[0]?.[1] ?? '999';
    const cStatEvento = cStatMatches[1]?.[1] ?? cStatLote;
    const xMotivo = xMotivoMatches.at(-1)?.[1] ?? 'Retorno não identificado';

    // 135 registrado, 136 registrado sem vínculo, 155 cancelamento homologado fora de prazo
    if ([SEFAZ_STATUS.EVENTO_REGISTRADO, '136', '155'].includes(cStatEvento)) {
      return {
        sucesso: true,
        registrado: true,
        cStat: cStatEvento,
        xMotivo,
        protocolo: nProtMatch?.[1],
        tpEvento: tpEventoMatch?.[1],
        xmlRetorno: xml,
        ...meta,
      };
    }

    if (cStatLote.startsWith('1') && cStatEvento.startsWith('1')) {
      return {
        sucesso: true,
        registrado: false,
        cStat: cStatEvento,
        xMotivo,
        xmlRetorno: xml,
        ...meta,
      };
    }

    throw new SefazError(cStatEvento, xMotivo, { xmlRetorno: xml, ...meta });
  }

  /**
   * @param {'registrado'|'rejeitado'} scenario
   */
  setMockEventoScenario(scenario) {
    this.mockEventoScenario = scenario;
  }

  /**
   * Monta XML de consulta de status do serviço.
   * @param {string} uf
   * @param {number} [ambiente]
   */
  buildStatusServicoXml(uf, ambiente = 2) {
    const cUF = UF_IBGE[uf?.toUpperCase()] ?? '35';
    return (
      `<consStatServ xmlns="${NFE_NAMESPACE}" versao="4.00">` +
      `<tpAmb>${ambiente}</tpAmb><cUF>${cUF}</cUF><xServ>STATUS</xServ></consStatServ>`
    );
  }

  /**
   * Consulta status do webservice SEFAZ (NfeStatusServico4).
   * @param {string} uf
   * @param {number} [ambiente]
   * @param {{ pfx: Buffer|string, senha: string }} [certificado] Padrão: options.certificado
   */
  async consultarStatus(uf, ambiente = 2, certificado) {
    if (this.mock) {
      return this.#mockConsultarStatus(uf);
    }

    const statusEndpoint =
      this.statusEndpoint ??
      (() => {
        try {
          return SefazEndpointResolver.resolver({
            uf,
            ambiente,
            servico: SEFAZ_SERVICO.STATUS,
          });
        } catch {
          return null;
        }
      })();

    if (!statusEndpoint) {
      throw new GhinfeError(
        `Endpoint de status SEFAZ não disponível para UF ${uf}`,
        'SEFAZ_STATUS_ENDPOINT_MISSING'
      );
    }

    const envelope = this.#envelope('status', this.buildStatusServicoXml(uf, ambiente));
    const innerXml = await this.#post('status', statusEndpoint, envelope, certificado);
    return this.#processarRetornoStatus(innerXml);
  }

  /** @param {string} uf */
  async #mockConsultarStatus(uf) {
    await new Promise((r) => setTimeout(r, 150));
    const scenarioMap = {
      ok: SEFAZ_MOCK_RESPONSES.statusOk,
      paralisado: SEFAZ_MOCK_RESPONSES.statusParalisado,
    };
    const resultado = scenarioMap[this.mockStatusScenario ?? 'ok'] ?? SEFAZ_MOCK_RESPONSES.statusOk;
    const cUF = UF_IBGE[uf?.toUpperCase()] ?? '35';
    const innerXml = buildMockRetConsStatServXml(resultado, cUF);
    return this.#processarRetornoStatus(innerXml, {
      soapXml: wrapSoapStatusResponse(innerXml),
      mock: true,
    });
  }

  /**
   * @param {string} xml
   * @param {Record<string, unknown>} [meta]
   */
  #processarRetornoStatus(xml, meta = {}) {
    const cStat = xml.match(/<cStat>(\d+)<\/cStat>/)?.[1] ?? '999';
    const xMotivo = xml.match(/<xMotivo>([^<]+)<\/xMotivo>/)?.[1] ?? 'Retorno não identificado';
    const tMed = xml.match(/<tMed>([^<]+)<\/tMed>/)?.[1];
    const cUF = xml.match(/<cUF>(\d+)<\/cUF>/)?.[1];
    const emOperacao = cStat === SEFAZ_STATUS.SERVICO_EM_OPERACAO;

    return {
      sucesso: emOperacao,
      emOperacao,
      cStat,
      xMotivo,
      tMed,
      cUF,
      xmlRetorno: xml,
      ...meta,
    };
  }

  /**
   * @param {'ok'|'paralisado'} scenario
   */
  setMockStatusScenario(scenario) {
    this.mockStatusScenario = scenario;
  }
}
