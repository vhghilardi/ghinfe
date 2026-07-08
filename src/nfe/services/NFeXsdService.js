import { XsdValidator } from '../../validation/XsdValidator.js';
import { XSD_SCHEMAS } from '../../validation/schemas.js';

/**
 * Validação XSD específica para NF-e / NFC-e (layout 4.00).
 */
export class NFeXsdService {
  /**
   * Valida XML da NF-e (modelo 55) contra schema oficial.
   * @param {string} xml
   * @param {{ preAssinatura?: boolean }} [options]
   *   preAssinatura=true injeta stub estrutural (Signature) para validar infNFe antes de assinar
   */
  validarNFe(xml, options = {}) {
    return XsdValidator.validar(xml, XSD_SCHEMAS.NFE, {
      injetarAssinaturaStub: options.preAssinatura ?? !xml.includes('</Signature>'),
      modelo: '55',
    });
  }

  /**
   * Valida XML da NFC-e (modelo 65) contra schema oficial.
   * @param {string} xml
   * @param {{ preAssinatura?: boolean }} [options]
   */
  validarNFCe(xml, options = {}) {
    return XsdValidator.validar(xml, XSD_SCHEMAS.NFE, {
      injetarAssinaturaStub: options.preAssinatura ?? !xml.includes('</Signature>'),
      modelo: '65',
    });
  }

  /**
   * @param {string} xml
   * @param {'55'|'65'} [modelo]
   */
  tentarValidar(xml, modelo = '55') {
    return modelo === '65' ? this.tentarValidarNFCe(xml) : this.tentarValidarNFe(xml);
  }

  /** @param {string} xml */
  tentarValidarNFe(xml) {
    return XsdValidator.tentarValidar(xml, XSD_SCHEMAS.NFE, {
      injetarAssinaturaStub: !xml.includes('</Signature>'),
      modelo: '55',
    });
  }

  /** @param {string} xml */
  tentarValidarNFCe(xml) {
    return XsdValidator.tentarValidar(xml, XSD_SCHEMAS.NFE, {
      injetarAssinaturaStub: !xml.includes('</Signature>'),
      modelo: '65',
    });
  }
}
