import zlib from 'zlib';
import axios from 'axios';
import { criarHttpsAgentSefaz } from '../../sefaz/httpsAgent.js';
import { GhinfeError } from '../../errors/GhinfeError.js';
import { SefazError } from '../../errors/SefazError.js';
import { UF_IBGE } from '../../constants/sefaz.js';
import { DCE_NAMESPACE, DCE_VERSAO, DCE_WEBSERVICES, DCE_STATUS } from '../constants/dce.js';

const SERVICOS = {
  autorizacao: { wsdl: 'DCeAutorizacao', metodo: 'dceAutorizacao' },
  consulta: { wsdl: 'DCeConsulta', metodo: 'dceConsulta' },
  status: { wsdl: 'DCeStatusServico', metodo: 'dceStatusServico' },
  evento: { wsdl: 'DCeRecepcaoEvento', metodo: 'dceRecepcaoEvento' },
};

// O WSDL de DCeConsulta declara dceResultMsg, mas o servidor responde dceConsultaResult
const RESULTADO_SOAP = /<(dce\w*Result(?:Msg)?)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/;

const semDeclaracao = (xml) => xml.replace(/^\s*<\?xml[^>]*\?>\s*/, '');

/** @param {string} xml @param {string} nome */
function tag(xml, nome) {
  return xml?.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([^<]*)</${nome}>`))?.[1];
}

/** @param {string} xml @param {string} nome */
function grupo(xml, nome) {
  return xml?.match(new RegExp(`<${nome}[\\s>][\\s\\S]*?</${nome}>`))?.[0];
}

/**
 * Cliente SOAP 1.2 dos web services da DC-e, com TLS mútuo (certificado A1).
 */
export class DCeSoapService {
  /**
   * @param {{
   *   certificado: { pfx: Buffer|string, senha: string },
   *   ambiente?: number,
   *   timeout?: number,
   *   endpoints?: Partial<Record<keyof typeof SERVICOS, string>>,
   *   ca?: string|string[],
   * }} options
   */
  constructor(options) {
    if (!options?.certificado) {
      throw new GhinfeError('Certificado A1 obrigatório para comunicação com a SEFAZ', 'DCE_CERTIFICADO_AUSENTE');
    }
    this.ambiente = options.ambiente ?? 2;
    this.timeout = options.timeout ?? 30000;
    this.endpoints = { ...DCE_WEBSERVICES[this.ambiente], ...options.endpoints };
    this.httpsAgent = criarHttpsAgentSefaz(options.certificado, { ca: options.ca });
  }

  /**
   * @param {keyof typeof SERVICOS} servico
   * @param {string} xmlDados
   * @param {{ compactar?: boolean }} [options]
   * @returns {Promise<string>} XML de retorno (conteúdo do elemento *Result)
   */
  async #chamar(servico, xmlDados, options = {}) {
    const { wsdl, metodo } = SERVICOS[servico];
    const ns = `http://www.portalfiscal.inf.br/dce/wsdl/${wsdl}`;
    const acao = options.compactar ? `${metodo}Zip` : metodo;

    const corpo = options.compactar
      ? `<dceDadosMsgZip xmlns="${ns}">${zlib.gzipSync(Buffer.from(semDeclaracao(xmlDados), 'utf8')).toString('base64')}</dceDadosMsgZip>`
      : `<dceDadosMsg xmlns="${ns}">${semDeclaracao(xmlDados)}</dceDadosMsg>`;

    const envelope =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
      `<soap12:Body>${corpo}</soap12:Body></soap12:Envelope>`;

    let response;
    try {
      response = await axios.post(this.endpoints[servico], envelope, {
        httpsAgent: this.httpsAgent,
        timeout: this.timeout,
        responseType: 'text',
        headers: { 'Content-Type': `application/soap+xml; charset=utf-8; action="${ns}/${acao}"` },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new GhinfeError(
          `Falha na comunicação SOAP (${wsdl}): ${error.message}`,
          'SEFAZ_HTTP_ERROR',
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw error;
    }

    const conteudo = response.data.match(RESULTADO_SOAP)?.[2];
    if (!conteudo) {
      throw new GhinfeError(`Resposta SOAP de ${wsdl} sem elemento de resultado`, 'SEFAZ_RESPOSTA_INVALIDA', {
        data: response.data,
      });
    }
    return conteudo;
  }

  /**
   * Consulta status do serviço (DCeStatusServico).
   * @param {string} [uf] UF consultada (o autorizador responde por todas)
   */
  async consultarStatus(uf = 'PR') {
    const cUF = UF_IBGE[uf.toUpperCase()];
    const xml =
      `<consStatServDCe xmlns="${DCE_NAMESPACE}" versao="${DCE_VERSAO}">` +
      `<tpAmb>${this.ambiente}</tpAmb><cUF>${cUF}</cUF><xServ>STATUS</xServ></consStatServDCe>`;

    const retorno = await this.#chamar('status', xml);
    const cStat = tag(retorno, 'cStat');
    return {
      emOperacao: cStat === DCE_STATUS.SERVICO_EM_OPERACAO,
      cStat,
      xMotivo: tag(retorno, 'xMotivo'),
      cUF: tag(retorno, 'cUF'),
      dhRecbto: tag(retorno, 'dhRecbto'),
      tMed: tag(retorno, 'tMed'),
      xObs: tag(retorno, 'xObs'),
      xmlRetorno: retorno,
    };
  }

  /**
   * Envia DC-e assinada para autorização (síncrono). Lança SefazError se não autorizada.
   * @param {string} xmlAssinado
   * @param {{ compactar?: boolean }} [options] compactar: usa dceAutorizacaoZip (GZip + Base64)
   */
  async autorizar(xmlAssinado, options = {}) {
    const retorno = await this.#chamar('autorizacao', xmlAssinado, options);
    const protDCe = grupo(retorno, 'protDCe');
    const fonte = protDCe ?? retorno;
    const cStat = tag(fonte, 'cStat');
    const xMotivo = tag(fonte, 'xMotivo');

    if (cStat !== DCE_STATUS.AUTORIZADO) {
      throw new SefazError(cStat ?? '999', xMotivo ?? 'Retorno não identificado', {
        cStatRetorno: tag(retorno, 'cStat'),
        xmlRetorno: retorno,
      });
    }

    return {
      autorizado: true,
      cStat,
      xMotivo,
      protocolo: tag(protDCe, 'nProt'),
      chaveAcesso: tag(protDCe, 'chDCe'),
      dhRecbto: tag(protDCe, 'dhRecbto'),
      digVal: tag(protDCe, 'digVal'),
      xmlProtocolo: protDCe,
      xmlProc: this.montarDCeProc(xmlAssinado, protDCe),
      xmlRetorno: retorno,
    };
  }

  /**
   * Consulta situação da DC-e (DCeConsulta). Não lança erro para cStat de rejeição.
   * @param {string} chaveAcesso
   */
  async consultar(chaveAcesso) {
    const xml =
      `<consSitDCe xmlns="${DCE_NAMESPACE}" versao="${DCE_VERSAO}">` +
      `<tpAmb>${this.ambiente}</tpAmb><xServ>CONSULTAR</xServ><chDCe>${chaveAcesso}</chDCe></consSitDCe>`;

    const retorno = await this.#chamar('consulta', xml);
    const protDCe = grupo(retorno, 'protDCe');
    const cStat = tag(retorno, 'cStat');

    return {
      cStat,
      xMotivo: tag(retorno, 'xMotivo'),
      autorizada: cStat === DCE_STATUS.AUTORIZADO,
      cancelada: cStat === DCE_STATUS.CANCELADO,
      protocolo: tag(protDCe, 'nProt'),
      xmlProtocolo: protDCe,
      eventos: [...retorno.matchAll(/<procEventoDCe[\s>][\s\S]*?<\/procEventoDCe>/g)].map((m) => m[0]),
      xmlRetorno: retorno,
    };
  }

  /**
   * Envia evento assinado (DCeRecepcaoEvento). Lança SefazError se não registrado.
   * @param {string} xmlEventoAssinado
   */
  async enviarEvento(xmlEventoAssinado) {
    const retorno = await this.#chamar('evento', xmlEventoAssinado);
    const infEvento = grupo(retorno, 'infEvento') ?? retorno;
    const cStat = tag(infEvento, 'cStat');
    const xMotivo = tag(infEvento, 'xMotivo');
    const sucesso = [
      DCE_STATUS.EVENTO_REGISTRADO,
      DCE_STATUS.EVENTO_REGISTRADO_SEM_VINCULO,
      DCE_STATUS.CANCELAMENTO_FORA_PRAZO,
    ];

    if (!sucesso.includes(cStat)) {
      throw new SefazError(cStat ?? '999', xMotivo ?? 'Retorno não identificado', { xmlRetorno: retorno });
    }

    const retEvento = grupo(retorno, 'retEventoDCe');
    return {
      registrado: true,
      cStat,
      xMotivo,
      protocolo: tag(infEvento, 'nProt'),
      tpEvento: tag(infEvento, 'tpEvento'),
      dhRegEvento: tag(infEvento, 'dhRegEvento'),
      xmlRetorno: retorno,
      xmlProc: retEvento
        ? `<?xml version="1.0" encoding="UTF-8"?><procEventoDCe xmlns="${DCE_NAMESPACE}" versao="${DCE_VERSAO}">` +
          `${semDeclaracao(xmlEventoAssinado)}${retEvento}</procEventoDCe>`
        : undefined,
    };
  }

  /**
   * Monta dceProc (DC-e assinada + protocolo de autorização) para armazenamento.
   * @param {string} xmlAssinado
   * @param {string} protDCe
   */
  montarDCeProc(xmlAssinado, protDCe) {
    // A SEFA-PR devolve protDCe sem o atributo versao, obrigatório em procDCe_v1.00.xsd
    const prot = /^<protDCe[^>]*\sversao=/.test(protDCe)
      ? protDCe
      : protDCe.replace(/^<protDCe/, `<protDCe versao="${DCE_VERSAO}"`);

    return (
      `<?xml version="1.0" encoding="UTF-8"?><dceProc xmlns="${DCE_NAMESPACE}" versao="${DCE_VERSAO}">` +
      `${semDeclaracao(xmlAssinado)}${prot}</dceProc>`
    );
  }
}
