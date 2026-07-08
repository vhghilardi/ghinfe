import { NFSeXmlBuilder } from '../builders/NFSeXmlBuilder.js';
import { NFSeEventoXmlBuilder } from '../builders/NFSeEventoXmlBuilder.js';
import { NFSeSoapService } from './NFSeSoapService.js';
import { NFeSignService } from '../../nfe/services/NFeSignService.js';
import { NFSeMunicipioResolver } from '../NFSeMunicipioResolver.js';
import { NFSE_LAYOUTS } from '../constants/municipios.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

/**
 * Orquestrador NFS-e — emissão, cancelamento e substituição.
 */
export class NFSeService {
  /**
   * @param {{
   *   mock?: boolean,
   *   endpoint?: string,
   *   mockScenario?: string,
   *   layout?: string,
   * }} [options]
   */
  constructor(options = {}) {
    this.options = options;
    this.builder = new NFSeXmlBuilder();
    this.eventoBuilder = new NFSeEventoXmlBuilder();
    this.signService = new NFeSignService();
    this.soapService = new NFSeSoapService(options);
  }

  /** @param {import('../types/NFSeDocument.js').NFSeDocumento} documento */
  resolverLayout(documento) {
    if (this.options.layout) return this.options.layout;
    try {
      const info = NFSeMunicipioResolver.resolver(
        documento.codigoMunicipio,
        documento.ambiente ?? 2
      );
      return info.layout ?? NFSE_LAYOUTS.ABRASF;
    } catch {
      return NFSE_LAYOUTS.ABRASF;
    }
  }

  /**
   * @param {import('../types/NFSeDocument.js').NFSeDocumento} documento
   * @param {string} [layout]
   */
  gerarXml(documento, layout) {
    return this.builder.buildGerarNfse(documento, layout ?? this.resolverLayout(documento));
  }

  /**
   * @param {import('../types/NFSeDocument.js').NFSeDocumento} documento
   * @param {{ pfx: Buffer|string, senha: string }} certificado
   * @param {string} [layout]
   */
  gerarXmlAssinado(documento, certificado, layout) {
    const xml = this.gerarXml(documento, layout);
    return this.signService.assinarRps(xml, certificado.pfx, certificado.senha);
  }

  /**
   * @param {{
   *   numeroNfse: string,
   *   cnpjPrestador: string,
   *   inscricaoMunicipal: string,
   *   codigoMunicipio: string,
   *   codigoCancelamento?: string,
   * }} dados
   */
  gerarXmlCancelamento(dados) {
    return this.eventoBuilder.buildCancelamento(dados);
  }

  /**
   * @param {{
   *   numeroNfseSubstituida: string,
   *   cnpjPrestador: string,
   *   inscricaoMunicipal: string,
   *   codigoMunicipio: string,
   *   codigoCancelamento?: string,
   *   documentoSubstituto: import('../types/NFSeDocument.js').NFSeDocumento,
   * }} dados
   */
  gerarXmlSubstituicao(dados) {
    const xmlRps = this.gerarXml(dados.documentoSubstituto);
    return this.eventoBuilder.buildSubstituicao({
      ...dados,
      xmlRpsSubstituto: xmlRps,
    });
  }

  /**
   * @param {import('../types/NFSeDocument.js').NFSeDocumento} documento
   * @param {{ pfx?: Buffer|string, senha?: string }} [certificado]
   */
  async emitir(documento, certificado) {
    const layout = this.resolverLayout(documento);
    let xml = this.gerarXml(documento, layout);
    let xmlAssinado = null;

    if (certificado?.pfx && certificado?.senha) {
      xmlAssinado = this.signService.assinarRps(xml, certificado.pfx, certificado.senha);
      xml = xmlAssinado;
    }

    const retorno = await this.soapService.gerarNfse(
      xml,
      documento.codigoMunicipio,
      documento.ambiente ?? 2
    );

    return {
      layout,
      xmlGerado: xmlAssinado ? this.gerarXml(documento, layout) : xml,
      xmlAssinado,
      retorno,
    };
  }

  /**
   * Cancela NFS-e já autorizada.
   * @param {{
   *   numeroNfse: string,
   *   cnpjPrestador: string,
   *   inscricaoMunicipal: string,
   *   codigoMunicipio: string,
   *   codigoCancelamento?: string,
   *   ambiente?: number,
   * }} dados
   */
  async cancelar(dados) {
    const xml = this.gerarXmlCancelamento(dados);
    const retorno = await this.soapService.cancelarNfse(
      xml,
      dados.codigoMunicipio,
      dados.ambiente ?? 2
    );
    return { tipo: 'cancelamento', xmlGerado: xml, retorno };
  }

  /**
   * Substitui NFS-e por um novo RPS.
   * @param {{
   *   numeroNfseSubstituida: string,
   *   cnpjPrestador: string,
   *   inscricaoMunicipal: string,
   *   codigoMunicipio: string,
   *   codigoCancelamento?: string,
   *   documentoSubstituto: import('../types/NFSeDocument.js').NFSeDocumento,
   *   ambiente?: number,
   * }} dados
   * @param {{ pfx?: Buffer|string, senha?: string }} [certificado]
   */
  async substituir(dados, certificado) {
    let xmlEnvio = this.gerarXmlSubstituicao(dados);

    if (certificado?.pfx && certificado?.senha) {
      const xmlRps = this.gerarXmlAssinado(dados.documentoSubstituto, certificado);
      xmlEnvio = this.eventoBuilder.buildSubstituicao({
        ...dados,
        xmlRpsSubstituto: xmlRps,
      });
    }

    const retorno = await this.soapService.substituirNfse(
      xmlEnvio,
      dados.codigoMunicipio,
      dados.ambiente ?? 2
    );

    return { tipo: 'substituicao', xmlGerado: xmlEnvio, retorno };
  }

  /**
   * @param {Awaited<ReturnType<NFSeService['emitir']>>} resultado
   */
  toPersistencePayload(resultado) {
    if (!resultado.retorno.autorizado) {
      throw new GhinfeError('NFS-e não autorizada', 'NFSE_NOT_AUTHORIZED', resultado.retorno);
    }

    return {
      numero_nfse: resultado.retorno.numeroNfse,
      codigo_verificacao: resultado.retorno.codigoVerificacao,
      layout: resultado.layout,
      xml_rps: resultado.xmlAssinado ?? resultado.xmlGerado,
      xml_retorno: resultado.retorno.xmlRetorno,
      autorizado_em: new Date(),
    };
  }
}
