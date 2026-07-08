import { NFCeXmlService } from './NFCeXmlService.js';
import { NFeSignService } from '../../nfe/services/NFeSignService.js';
import { NFeSoapService } from '../../nfe/services/NFeSoapService.js';
import { GhinfeError } from '../../errors/GhinfeError.js';
import { gerarChaveAcesso, validarChaveAcesso } from '../../utils/chave.utils.js';
import { SefazEndpointResolver } from '../../sefaz/SefazEndpointResolver.js';
import {
  extrairDigestValor,
  gerarUrlQrCodeV3,
  obterUrlChave,
  inserirInfNFeSupl,
} from '../utils/qrcode.utils.js';

/**
 * Orquestrador da NFC-e (modelo 65).
 */
export class NFCeService {
  /**
   * @param {{
   *   mock?: boolean,
   *   uf?: string,
   *   ambiente?: number,
   *   sefazEndpoint?: string,
   *   mockScenario?: string,
   *   validarXsd?: boolean,
   * }} [options]
   */
  constructor(options = {}) {
    this.options = options;
    this.xmlService = new NFCeXmlService({ validarXsd: options.validarXsd });
    this.signService = new NFeSignService();

    let endpoint = options.sefazEndpoint;
    if (!endpoint && options.uf && !options.mock) {
      endpoint = SefazEndpointResolver.paraNFCe(options.uf, options.ambiente ?? 2).endpoint;
    }

    this.soapService = new NFeSoapService({
      mock: options.mock ?? true,
      endpoint,
      mockScenario: options.mockScenario,
    });
  }

  /** @param {string} uf @param {number} [ambiente] */
  configurarUf(uf, ambiente = 2) {
    const urls = SefazEndpointResolver.paraNFCe(uf, ambiente);
    this.soapService.endpoint = urls.endpoint;
    this.soapService.mock = false;
    return urls;
  }

  /** @param {import('../types/NFCeDocument.js').NFCeDocumento} documento */
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
      modelo: '65',
      serie: documento.ide.serie ?? 1,
      numero: documento.ide.numero,
    });

    return { ...documento, chaveAcesso };
  }

  /** @param {import('../types/NFCeDocument.js').NFCeDocumento} documento */
  #calcularTotais(documento) {
    const valorProdutos = documento.itens.reduce((s, i) => s + i.valorTotal, 0);
    const valorIcms = documento.itens.reduce((s, i) => s + (i.valorIcms ?? 0), 0);
    const valorDesc = documento.itens.reduce((s, i) => s + (i.valorDesconto ?? 0), 0);
    return { valorNF: valorProdutos - valorDesc, valorIcms };
  }

  /**
   * Gera XML base (infNFe) sem QR Code — QR é adicionado após assinatura.
   * @param {import('../types/NFCeDocument.js').NFCeDocumento} documento
   * @param {{ validarXsd?: boolean }} [options]
   */
  gerarXml(documento, options = {}) {
    const doc = this.resolverDocumento(documento);
    return this.xmlService.gerarXml(doc, { ...options, validarXsd: false });
  }

  /**
   * Adiciona infNFeSupl com QR Code v3 ao XML já assinado.
   * @param {string} xmlAssinado
   * @param {import('../types/NFCeDocument.js').NFCeDocumento} documento
   */
  adicionarQrCode(xmlAssinado, documento) {
    const doc = this.resolverDocumento(documento);
    const { valorNF, valorIcms } = this.#calcularTotais(doc);
    const digVal = extrairDigestValor(xmlAssinado);
    const cDest = (doc.destinatario?.cnpj ?? doc.destinatario?.cpf ?? '').replace(/\D/g, '');

    const qrCode = gerarUrlQrCodeV3({
      chaveAcesso: doc.chaveAcesso,
      uf: doc.ide.uf,
      ambiente: doc.ambiente ?? 2,
      cDest,
      valorNF,
      valorICMS: valorIcms,
      digVal,
      idCSC: doc.csc.idCSC,
      csc: doc.csc.codigo,
    });

    const urlChave = obterUrlChave(doc.ide.uf, doc.ambiente ?? 2);
    const xmlCompleto = inserirInfNFeSupl(xmlAssinado, qrCode, urlChave);

    return { xmlCompleto, qrCode, urlChave };
  }

  /**
   * @param {import('../types/NFCeDocument.js').NFCeDocumento} documento
   * @param {{ pfx: Buffer|string, senha: string }} certificado
   * @param {{ validarXsd?: boolean }} [options]
   */
  gerarXmlAssinado(documento, certificado, options = {}) {
    const doc = this.resolverDocumento(documento);
    const xml = this.xmlService.gerarXml(doc, { validarXsd: false });
    const xmlAssinado = this.signService.assinar(xml, certificado.pfx, certificado.senha);
    const { xmlCompleto, qrCode } = this.adicionarQrCode(xmlAssinado, doc);

    if (options.validarXsd) {
      this.xmlService.validarXml(xmlCompleto);
    }

    return { xml: xmlCompleto, qrCode };
  }

  /**
   * @param {import('../types/NFCeDocument.js').NFCeDocumento} documento
   * @param {{ pfx: Buffer|string, senha: string }} certificado
   */
  async emitir(documento, certificado) {
    const doc = this.resolverDocumento(documento);

    if (!this.soapService.mock && this.options.uf === undefined && !this.options.sefazEndpoint) {
      this.configurarUf(doc.ide.uf, doc.ambiente ?? 2);
    }

    const { xml, qrCode } = this.gerarXmlAssinado(doc, certificado);
    const retorno = await this.soapService.autorizar(xml, doc.chaveAcesso);

    return {
      chaveAcesso: doc.chaveAcesso,
      qrCode,
      xmlGerado: this.gerarXml(doc),
      xmlAssinado: xml,
      retorno,
    };
  }

  /** @param {string} xml */
  validarXsd(xml) {
    return this.xmlService.validarXml(xml);
  }

  async enviar(xmlAssinado, chaveAcesso) {
    return this.soapService.autorizar(xmlAssinado, chaveAcesso);
  }

  /** @param {Awaited<ReturnType<NFCeService['emitir']>>} resultado */
  toPersistencePayload(resultado) {
    if (!resultado.retorno.autorizado) {
      throw new GhinfeError('NFC-e não autorizada', 'NFCE_NOT_AUTHORIZED', resultado.retorno);
    }

    return {
      chave_acesso: resultado.chaveAcesso,
      modelo: '65',
      xml_nfce: resultado.xmlAssinado,
      xml_protocolo: resultado.retorno.xmlProtocolo,
      protocolo: resultado.retorno.protocolo,
      qrcode_url: resultado.qrCode,
      status: resultado.retorno.cStat,
      motivo: resultado.retorno.xMotivo,
      autorizado_em: new Date(),
    };
  }
}
