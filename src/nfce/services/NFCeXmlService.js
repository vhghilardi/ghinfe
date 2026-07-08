import { NFCeXmlBuilder } from '../builders/NFCeXmlBuilder.js';
import { NFeXsdService } from '../../nfe/services/NFeXsdService.js';

/**
 * Serviço de geração e validação XSD da NFC-e.
 */
export class NFCeXmlService {
  /**
   * @param {{ validarXsd?: boolean }} [options]
   */
  constructor(options = {}) {
    this.builder = new NFCeXmlBuilder();
    this.xsdService = new NFeXsdService();
    this.validarXsd = options.validarXsd ?? false;
  }

  /**
   * @param {import('../types/NFCeDocument.js').NFCeDocumento} documento
   * @param {{ validarXsd?: boolean }} [options]
   */
  gerarXml(documento, options = {}) {
    const xml = this.builder.build(documento);
    const deveValidar = options.validarXsd ?? this.validarXsd;

    if (deveValidar) {
      this.xsdService.validarNFCe(xml, { preAssinatura: true });
    }

    return xml;
  }

  /**
   * @param {string} xml
   */
  validarXml(xml) {
    return this.xsdService.validarNFCe(xml);
  }
}
