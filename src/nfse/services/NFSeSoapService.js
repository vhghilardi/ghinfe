import axios from 'axios';
import { GhinfeError } from '../../errors/GhinfeError.js';
import { NFSeMunicipioResolver } from '../NFSeMunicipioResolver.js';
import {
  buildMockGerarNfseResponse,
  buildMockCancelarNfseResponse,
  buildMockSubstituirNfseResponse,
  NFSE_MOCK_RESPONSES,
} from '../mocks/nfse-responses.js';

export class NFSeSoapError extends GhinfeError {
  /**
   * @param {string} codigo
   * @param {string} mensagem
   * @param {Record<string, unknown>} [details]
   */
  constructor(codigo, mensagem, details = {}) {
    super(`NFS-e [${codigo}]: ${mensagem}`, `NFSE_${codigo}`, { codigo, mensagem, ...details });
    this.name = 'NFSeSoapError';
    this.codigo = codigo;
  }
}

/**
 * Comunicação SOAP com prefeituras (NFS-e ABRASF).
 */
export class NFSeSoapService {
  /**
   * @param {{ mock?: boolean, endpoint?: string, timeout?: number, mockScenario?: string }} [options]
   */
  constructor(options = {}) {
    this.mock = options.mock ?? true;
    this.endpoint = options.endpoint;
    this.timeout = options.timeout ?? 30000;
    this.mockScenario = options.mockScenario ?? 'autorizada';
  }

  /**
   * @param {string} xmlRps
   * @param {string} codigoMunicipio
   * @param {number} [ambiente]
   */
  async gerarNfse(xmlRps, codigoMunicipio, ambiente = 2) {
    if (this.mock) {
      return this.#mockGerarNfse(xmlRps);
    }

    const { url } = this.endpoint
      ? { url: this.endpoint }
      : NFSeMunicipioResolver.resolver(codigoMunicipio, ambiente);

    const envelope = this.#buildEnvelope('GerarNfse', xmlRps);

    try {
      const response = await axios.post(url, envelope, {
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'GerarNfse' },
        timeout: this.timeout,
        responseType: 'text',
      });

      return this.#processarRetorno(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new GhinfeError(`Falha SOAP NFS-e: ${error.message}`, 'NFSE_HTTP_ERROR', {
          status: error.response?.status,
        });
      }
      throw error;
    }
  }

  /** @param {string} metodo @param {string} xml */
  #buildEnvelope(metodo, xml) {
    const escaped = xml.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${metodo} xmlns="http://www.abrasf.org.br/nfse.xsd">
      <nfseDadosMsg>${escaped}</nfseDadosMsg>
    </${metodo}>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * @param {string} xmlCancelamento
   * @param {string} codigoMunicipio
   * @param {number} [ambiente]
   */
  async cancelarNfse(xmlCancelamento, codigoMunicipio, ambiente = 2) {
    if (this.mock) {
      await new Promise((r) => setTimeout(r, 150));
      const numero = xmlCancelamento.match(/<Numero>(\d+)<\/Numero>/)?.[1] ?? '';
      const resultado = this.mockScenario === 'rejeicao'
        ? NFSE_MOCK_RESPONSES.rejeicao
        : NFSE_MOCK_RESPONSES.cancelada;
      const xml = buildMockCancelarNfseResponse(numero, resultado);
      return this.#processarRetornoEvento(xml, { mock: true, operacao: 'cancelamento' });
    }

    return this.#postMetodo('CancelarNfse', xmlCancelamento, codigoMunicipio, ambiente, 'cancelamento');
  }

  /**
   * @param {string} xmlSubstituicao
   * @param {string} codigoMunicipio
   * @param {number} [ambiente]
   */
  async substituirNfse(xmlSubstituicao, codigoMunicipio, ambiente = 2) {
    if (this.mock) {
      await new Promise((r) => setTimeout(r, 150));
      const resultado = this.mockScenario === 'rejeicao'
        ? NFSE_MOCK_RESPONSES.rejeicao
        : NFSE_MOCK_RESPONSES.substituida;
      const xml = buildMockSubstituirNfseResponse(resultado);
      return this.#processarRetornoEvento(xml, { mock: true, operacao: 'substituicao' });
    }

    return this.#postMetodo('SubstituirNfse', xmlSubstituicao, codigoMunicipio, ambiente, 'substituicao');
  }

  /**
   * @param {string} metodo
   * @param {string} xml
   * @param {string} codigoMunicipio
   * @param {number} ambiente
   * @param {string} operacao
   */
  async #postMetodo(metodo, xml, codigoMunicipio, ambiente, operacao) {
    const { url } = this.endpoint
      ? { url: this.endpoint }
      : NFSeMunicipioResolver.resolver(codigoMunicipio, ambiente);

    const envelope = this.#buildEnvelope(metodo, xml);

    try {
      const response = await axios.post(url, envelope, {
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: metodo },
        timeout: this.timeout,
        responseType: 'text',
      });
      return this.#processarRetornoEvento(response.data, { operacao });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new GhinfeError(`Falha SOAP NFS-e (${operacao}): ${error.message}`, 'NFSE_HTTP_ERROR', {
          status: error.response?.status,
        });
      }
      throw error;
    }
  }

  /** @param {string} xmlRps */
  async #mockGerarNfse(xmlRps) {
    await new Promise((r) => setTimeout(r, 200));

    const numeroMatch = xmlRps.match(/<Numero>(\d+)<\/Numero>/);
    const numeroRps = numeroMatch?.[1] ?? '1';

    const scenario = this.mockScenario === 'rejeicao'
      ? NFSE_MOCK_RESPONSES.rejeicao
      : NFSE_MOCK_RESPONSES.autorizada;

    const innerXml = buildMockGerarNfseResponse(numeroRps, scenario);
    return this.#processarRetorno(innerXml, { mock: true });
  }

  /** @param {string} xml @param {Record<string, unknown>} [meta] */
  #processarRetorno(xml, meta = {}) {
    const codigoMatch = xml.match(/<Codigo>([^<]+)<\/Codigo>/);
    const mensagemMatch = xml.match(/<Mensagem>([^<]+)<\/Mensagem>/);
    const numeroNfseMatch = xml.match(/<InfNfse[\s\S]*?<Numero>(\d+)<\/Numero>/);
    const codVerifMatch = xml.match(/<CodigoVerificacao>([^<]+)<\/CodigoVerificacao>/);

    const temNfse = xml.includes('<ListaNfse>') || xml.includes('<InfNfse>');

    if (temNfse && !xml.includes('ListaMensagemRetorno')) {
      return {
        sucesso: true,
        autorizado: true,
        numeroNfse: numeroNfseMatch?.[1],
        codigoVerificacao: codVerifMatch?.[1],
        xmlRetorno: xml,
        ...meta,
      };
    }

    const codigo = codigoMatch?.[1] ?? 'E999';
    const mensagem = mensagemMatch?.[1] ?? 'Retorno não identificado';
    throw new NFSeSoapError(codigo, mensagem, { xmlRetorno: xml, ...meta });
  }

  /**
   * @param {string} xml
   * @param {Record<string, unknown>} [meta]
   */
  #processarRetornoEvento(xml, meta = {}) {
    if (xml.includes('ListaMensagemRetorno') && !xml.includes('RetCancelamento') && !xml.includes('RetSubstituicao')) {
      const codigo = xml.match(/<Codigo>([^<]+)<\/Codigo>/)?.[1] ?? 'E999';
      const mensagem = xml.match(/<Mensagem>([^<]+)<\/Mensagem>/)?.[1] ?? 'Retorno não identificado';
      throw new NFSeSoapError(codigo, mensagem, { xmlRetorno: xml, ...meta });
    }

    if (xml.includes('RetCancelamento') || xml.includes('Confirmacao')) {
      const numero = xml.match(/<Numero>(\d+)<\/Numero>/)?.[1];
      return {
        sucesso: true,
        cancelado: true,
        numeroNfse: numero,
        xmlRetorno: xml,
        ...meta,
      };
    }

    if (xml.includes('RetSubstituicao') || xml.includes('NfseSubstituidora')) {
      const nova = xml.match(/<NfseSubstituidora>[\s\S]*?<Numero>(\d+)<\/Numero>/)?.[1];
      const antiga = xml.match(/<NfseSubstituida>[\s\S]*?<Numero>(\d+)<\/Numero>/)?.[1];
      const codVerif = xml.match(/<CodigoVerificacao>([^<]+)<\/CodigoVerificacao>/)?.[1];
      return {
        sucesso: true,
        substituido: true,
        numeroNfse: nova,
        numeroNfseSubstituida: antiga,
        codigoVerificacao: codVerif,
        xmlRetorno: xml,
        ...meta,
      };
    }

    return this.#processarRetorno(xml, meta);
  }
}
