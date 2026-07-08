import { NFeXmlService } from './NFeXmlService.js';
import { NFeSignService } from './NFeSignService.js';
import { NFeSoapService } from './NFeSoapService.js';
import { NFeEventoService } from './NFeEventoService.js';
import { GhinfeError } from '../../errors/GhinfeError.js';
import { gerarChaveAcesso, validarChaveAcesso } from '../../utils/chave.utils.js';
import { SefazEndpointResolver } from '../../sefaz/SefazEndpointResolver.js';

/**
 * @param {{
 *   mock?: boolean,
 *   uf?: string,
 *   ambiente?: number,
 *   sefazEndpoint?: string,
 *   sefazEventoEndpoint?: string,
 *   mockScenario?: string,
 *   mockEventoScenario?: string,
 * }} options
 */
function buildSoapOptions(options) {
  if (options.mock ?? true) {
    return {
      mock: true,
      endpoint: options.sefazEndpoint,
      eventoEndpoint: options.sefazEventoEndpoint,
      mockScenario: options.mockScenario,
      mockEventoScenario: options.mockEventoScenario,
    };
  }

  if (options.sefazEndpoint) {
    return {
      mock: false,
      endpoint: options.sefazEndpoint,
      eventoEndpoint: options.sefazEventoEndpoint,
    };
  }

  if (options.uf) {
    const urls = SefazEndpointResolver.paraNFe(options.uf, options.ambiente ?? 2);
    return { mock: false, endpoint: urls.endpoint, eventoEndpoint: urls.eventoEndpoint };
  }

  return { mock: true };
}

/**
 * Orquestrador principal da NF-e — une geração, assinatura e envio.
 */
export class NFeService {
  /**
   * @param {{
   *   mock?: boolean,
   *   uf?: string,
   *   ambiente?: number,
   *   sefazEndpoint?: string,
   *   sefazEventoEndpoint?: string,
   *   mockScenario?: string,
   *   mockEventoScenario?: string,
   *   validarXsd?: boolean,
   * }} [options]
   */
  constructor(options = {}) {
    this.options = options;
    const soapOptions = buildSoapOptions(options);

    this.xmlService = new NFeXmlService({ validarXsd: options.validarXsd });
    this.signService = new NFeSignService();
    this.soapService = new NFeSoapService(soapOptions);
    this.eventoService = new NFeEventoService(soapOptions);
  }

  /** Resolve endpoints SEFAZ para a UF do documento. */
  configurarUf(uf, ambiente = 2) {
    const urls = SefazEndpointResolver.paraNFe(uf, ambiente);
    this.soapService.endpoint = urls.endpoint;
    this.soapService.eventoEndpoint = urls.eventoEndpoint;
    this.soapService.mock = false;
    this.eventoService.soapService.endpoint = urls.endpoint;
    this.eventoService.soapService.eventoEndpoint = urls.eventoEndpoint;
    this.eventoService.soapService.mock = false;
    return urls;
  }

  /** @param {Parameters<typeof gerarChaveAcesso>[0]} params */
  gerarChaveAcesso(params) {
    return gerarChaveAcesso(params);
  }

  /** @param {import('../types/NFeDocument.js').NFeDocument} documento */
  resolverDocumento(documento) {
    if (documento.chaveAcesso) {
      if (!validarChaveAcesso(documento.chaveAcesso)) {
        throw new GhinfeError('chaveAcesso com dígito verificador inválido', 'CHAVE_DV_INVALIDO');
      }
      return documento;
    }

    const chaveAcesso = gerarChaveAcesso({
      uf: documento.ide.uf,
      cnpj: documento.emitente.cnpj,
      modelo: '55',
      serie: documento.ide.serie ?? 1,
      numero: documento.ide.numero,
      tipoEmissao: documento.ide.tipoEmissao ?? 1,
    });

    return { ...documento, chaveAcesso };
  }

  async emitir(documento, certificado, idLote) {
    const doc = this.resolverDocumento(documento);

    if (!this.soapService.mock && this.options.uf === undefined && !this.options.sefazEndpoint) {
      this.configurarUf(doc.ide.uf, doc.ambiente ?? 2);
    }

    const xml = this.xmlService.gerarXml(doc);
    const xmlAssinado = this.signService.assinar(xml, certificado.pfx, certificado.senha);
    const retorno = await this.soapService.autorizar(xmlAssinado, doc.chaveAcesso, idLote);

    return { chaveAcesso: doc.chaveAcesso, xmlGerado: xml, xmlAssinado, retorno };
  }

  gerarXml(documento, options = {}) {
    const doc = this.resolverDocumento(documento);
    return this.xmlService.gerarXml(doc, options);
  }

  gerarXmlAssinado(documento, certificado) {
    const doc = this.resolverDocumento(documento);
    const xml = this.xmlService.gerarXml(doc);
    return this.signService.assinar(xml, certificado.pfx, certificado.senha);
  }

  async enviar(xmlAssinado, chaveAcesso) {
    return this.soapService.autorizar(xmlAssinado, chaveAcesso);
  }

  validarXsd(xml, options = {}) {
    return this.xmlService.validarXml(xml, options);
  }

  async cancelar(dados, certificado) {
    return this.eventoService.cancelar(dados, certificado);
  }

  async cartaCorrecao(dados, certificado) {
    return this.eventoService.cartaCorrecao(dados, certificado);
  }

  gerarXmlCancelamento(dados) {
    return this.eventoService.gerarXmlCancelamento(dados);
  }

  gerarXmlCartaCorrecao(dados) {
    return this.eventoService.gerarXmlCartaCorrecao(dados);
  }

  async enviarEventoMock(xmlEvento, chaveAcesso, tpEvento) {
    return this.eventoService.enviar(xmlEvento, chaveAcesso, tpEvento);
  }

  /**
   * Consulta status do webservice SEFAZ (NfeStatusServico4).
   * @param {string} [uf]
   * @param {number} [ambiente]
   */
  async consultarStatus(uf, ambiente) {
    const ufConsulta = uf ?? this.options.uf;
    if (!ufConsulta) {
      throw new GhinfeError('UF é obrigatória para consultar status SEFAZ', 'STATUS_UF_REQUIRED');
    }
    return this.soapService.consultarStatus(ufConsulta, ambiente ?? this.options.ambiente ?? 2);
  }

  toPersistencePayload(resultado) {
    if (!resultado.retorno.autorizado) {
      throw new GhinfeError('Não é possível persistir NF-e não autorizada', 'NFE_NOT_AUTHORIZED', resultado.retorno);
    }

    return {
      chave_acesso: resultado.chaveAcesso,
      xml_nfe: resultado.xmlAssinado,
      xml_protocolo: resultado.retorno.xmlProtocolo,
      protocolo: resultado.retorno.protocolo,
      status: resultado.retorno.cStat,
      motivo: resultado.retorno.xMotivo,
      autorizado_em: new Date(),
    };
  }

  toEventoPersistencePayload(resultado) {
    return this.eventoService.toPersistencePayload(resultado);
  }
}
