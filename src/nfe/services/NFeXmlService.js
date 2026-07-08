import { NFeXmlBuilder } from '../builders/NFeXmlBuilder.js';
import { NFeXsdService } from './NFeXsdService.js';
import { reformaHabilitada } from '../../reforma/ibscbs.js';

/**
 * Serviço responsável pela geração e validação XSD do XML da NF-e.
 */
export class NFeXmlService {
  /**
   * @param {{ validarXsd?: boolean }} [options]
   */
  constructor(options = {}) {
    this.builder = new NFeXmlBuilder();
    this.xsdService = new NFeXsdService();
    this.validarXsd = options.validarXsd ?? false;
  }

  /**
   * @param {import('../types/NFeDocument.js').NFeDocument} documento
   * @param {{ validarXsd?: boolean }} [options]
   */
  gerarXml(documento, options = {}) {
    const xml = this.builder.build(documento);
    const deveValidar = options.validarXsd ?? this.validarXsd;

    // PL_009 não conhece IBSCBS — não validar XSD quando reforma está ativa
    if (deveValidar && !reformaHabilitada(documento)) {
      this.xsdService.validarNFe(xml, { preAssinatura: true });
    }

    return xml;
  }

  /**
   * @param {string} xml
   * @param {{ preAssinatura?: boolean }} [options]
   */
  validarXml(xml, options = {}) {
    return this.xsdService.validarNFe(xml, options);
  }
}
