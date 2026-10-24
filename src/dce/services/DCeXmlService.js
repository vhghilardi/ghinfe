import { DCeXmlBuilder } from '../builders/DCeXmlBuilder.js';
import { XsdValidator } from '../../validation/XsdValidator.js';
import { XSD_SCHEMAS } from '../../validation/schemas.js';

/**
 * Serviço de geração e validação XSD da DC-e.
 */
export class DCeXmlService {
  /**
   * @param {{ validarXsd?: boolean }} [options]
   */
  constructor(options = {}) {
    this.builder = new DCeXmlBuilder();
    this.validarXsd = options.validarXsd ?? false;
  }

  /**
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento
   * @param {{ validarXsd?: boolean, qrCode?: string, urlChave?: string, sign?: string, qrCodeBaseUrl?: string }} [options]
   */
  gerarXml(documento, options = {}) {
    const { validarXsd, ...buildOptions } = options;
    const xml = this.builder.build(documento, buildOptions);

    if (validarXsd ?? this.validarXsd) {
      this.validarXml(xml);
    }

    return xml;
  }

  /**
   * Valida contra dce_v1.00.xsd. XML sem assinatura recebe Signature stub.
   * @param {string} xml
   */
  validarXml(xml) {
    return XsdValidator.validar(xml, XSD_SCHEMAS.DCE, {
      injetarAssinaturaStub: !xml.includes('</Signature>'),
      modelo: '99',
    });
  }

  /**
   * Valida evento assinado (eventoDCe) e o detalhe do cancelamento (evCancDCe).
   * @param {string} xmlEventoAssinado
   */
  validarEvento(xmlEventoAssinado) {
    XsdValidator.validar(xmlEventoAssinado, XSD_SCHEMAS.DCE_EVENTO);

    const detalhe = xmlEventoAssinado.match(/<evCancDCe>[\s\S]*?<\/evCancDCe>/)?.[0];
    if (detalhe) {
      XsdValidator.validar(
        detalhe.replace('<evCancDCe>', '<evCancDCe xmlns="http://www.portalfiscal.inf.br/dce">'),
        XSD_SCHEMAS.DCE_EVENTO_CANCELAMENTO
      );
    }
    return { valido: true, avisos: [] };
  }

  /** @param {string} xml */
  tentarValidar(xml) {
    return XsdValidator.tentarValidar(xml, XSD_SCHEMAS.DCE, {
      injetarAssinaturaStub: !xml.includes('</Signature>'),
      modelo: '99',
    });
  }
}
