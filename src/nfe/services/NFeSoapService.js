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

/**
 * Extrai cStat e xMotivo de um XML de retorno SEFAZ.
 * @param {string} xml
 */
function parseRetorno(xml) {
  const cStatMatch = xml.match(/<cStat>(\d+)<\/cStat>/);
  const xMotivoMatch = xml.match(/<xMotivo>([^<]+)<\/xMotivo>/);
  const nProtMatch = xml.match(/<nProt>(\d+)<\/nProt>/);
  const chNFeMatch = xml.match(/<chNFe>(\d{44})<\/chNFe>/);

  return {
    cStat: cStatMatch?.[1] ?? '999',
    xMotivo: xMotivoMatch?.[1] ?? 'Retorno não identificado',
    nProt: nProtMatch?.[1],
    chNFe: chNFeMatch?.[1],
    xmlRetorno: xml,
  };
}

/**
 * Serviço de comunicação SOAP com a SEFAZ.
 * Suporta modo mock para desenvolvimento sem certificado/homologação.
 */
export class NFeSoapService {
  /**
   * @param {{ mock?: boolean, endpoint?: string, eventoEndpoint?: string, timeout?: number, mockScenario?: string, mockEventoScenario?: string }} [options]
   */
  constructor(options = {}) {
    this.mock = options.mock ?? true;
    this.endpoint = options.endpoint;
    this.eventoEndpoint = options.eventoEndpoint;
    this.statusEndpoint = options.statusEndpoint;
    this.timeout = options.timeout ?? 30000;
    this.mockScenario = options.mockScenario ?? 'autorizado';
    this.mockEventoScenario = options.mockEventoScenario ?? 'registrado';
    this.mockStatusScenario = options.mockStatusScenario ?? 'ok';
  }

  /**
   * Monta envelope SOAP para NFeAutorizacao4.
   * @param {string} xmlNFeAssinado
   * @param {string} idLote
   */
  buildAutorizacaoEnvelope(xmlNFeAssinado, idLote) {
    const nfeBase64 = Buffer.from(xmlNFeAssinado, 'utf-8').toString('base64');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <idLote>${idLote}</idLote>
        <indSinc>1</indSinc>
        <NFe>${nfeBase64}</NFe>
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Envia NF-e para autorização na SEFAZ (ou mock).
   * @param {string} xmlNFeAssinado
   * @param {string} chaveAcesso
   * @param {string} [idLote]
   */
  async autorizar(xmlNFeAssinado, chaveAcesso, idLote = '1') {
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

    try {
      const response = await axios.post(this.endpoint, envelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
        },
        timeout: this.timeout,
        responseType: 'text',
      });

      const bodyMatch = response.data.match(/<nfeResultMsg[^>]*>([\s\S]*?)<\/nfeResultMsg>/);
      const innerXml = bodyMatch?.[1] ?? response.data;
      return this.#processarRetorno(innerXml);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new GhinfeError(
          `Falha na comunicação SOAP com SEFAZ: ${error.message}`,
          'SEFAZ_HTTP_ERROR',
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw error;
    }
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

    if (retorno.cStat === SEFAZ_STATUS.AUTORIZADO) {
      return {
        sucesso: true,
        autorizado: true,
        cStat: retorno.cStat,
        xMotivo: retorno.xMotivo,
        protocolo: retorno.nProt,
        chaveAcesso: retorno.chNFe,
        xmlProtocolo: xml,
        ...meta,
      };
    }

    if (retorno.cStat.startsWith('1')) {
      return {
        sucesso: true,
        autorizado: false,
        cStat: retorno.cStat,
        xMotivo: retorno.xMotivo,
        xmlProtocolo: xml,
        ...meta,
      };
    }

    throw new SefazError(retorno.cStat, retorno.xMotivo, { xmlRetorno: xml, ...meta });
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
   * @param {string} xmlEventoAssinado
   * @param {string} idLote
   */
  buildEventoEnvelope(xmlEventoAssinado, idLote = '1') {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      ${xmlEventoAssinado}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Envia evento NF-e (cancelamento, CC-e) para SEFAZ.
   * @param {string} xmlEventoAssinado
   * @param {string} chaveAcesso
   * @param {string} tpEvento
   * @param {string} [idLote]
   */
  async enviarEvento(xmlEventoAssinado, chaveAcesso, tpEvento, idLote = '1') {
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

    const envelope = this.buildEventoEnvelope(xmlEventoAssinado, idLote);

    try {
      const response = await axios.post(endpoint, envelope, {
        headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
        timeout: this.timeout,
        responseType: 'text',
      });

      const bodyMatch = response.data.match(/<nfeResultMsg[^>]*>([\s\S]*?)<\/nfeResultMsg>/);
      const innerXml = bodyMatch?.[1] ?? response.data;
      return this.#processarRetornoEvento(innerXml);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new GhinfeError(
          `Falha na comunicação SOAP (evento) com SEFAZ: ${error.message}`,
          'SEFAZ_HTTP_ERROR',
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw error;
    }
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

    if (cStatEvento === SEFAZ_STATUS.EVENTO_REGISTRADO) {
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
    return `<?xml version="1.0" encoding="UTF-8"?>
<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${ambiente}</tpAmb>
  <cUF>${cUF}</cUF>
  <xServ>STATUS</xServ>
</consStatServ>`;
  }

  /**
   * Consulta status do webservice SEFAZ (NfeStatusServico4).
   * @param {string} uf
   * @param {number} [ambiente]
   */
  async consultarStatus(uf, ambiente = 2) {
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

    const dados = this.buildStatusServicoXml(uf, ambiente);
    const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      ${dados}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

    try {
      const response = await axios.post(statusEndpoint, envelope, {
        headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
        timeout: this.timeout,
        responseType: 'text',
      });
      const bodyMatch = response.data.match(/<nfeResultMsg[^>]*>([\s\S]*?)<\/nfeResultMsg>/);
      return this.#processarRetornoStatus(bodyMatch?.[1] ?? response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new GhinfeError(
          `Falha na consulta de status SEFAZ: ${error.message}`,
          'SEFAZ_HTTP_ERROR',
          { status: error.response?.status }
        );
      }
      throw error;
    }
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
