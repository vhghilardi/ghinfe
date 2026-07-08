import fs from 'fs';
import path from 'path';
import libxmljs from 'libxmljs2';
import { pathToFileURL } from 'url';
import { XsdValidationError } from '../errors/XsdValidationError.js';
import { GhinfeError } from '../errors/GhinfeError.js';

const schemaCache = new Map();

/**
 * Validador XSD genérico usando libxmljs2 e schemas oficiais SEFAZ.
 */
export class XsdValidator {
  /**
   * @param {string} xsdPath Caminho absoluto do arquivo .xsd
   */
  static loadSchema(xsdPath) {
    if (schemaCache.has(xsdPath)) {
      return schemaCache.get(xsdPath);
    }

    if (!fs.existsSync(xsdPath)) {
      throw new GhinfeError(
        `Schema XSD não encontrado: ${xsdPath}. Execute: node scripts/download-schemas.js`,
        'XSD_SCHEMA_NOT_FOUND'
      );
    }

    const dir = path.dirname(xsdPath);
    const baseUrl = pathToFileURL(dir + path.sep).href;
    const content = fs.readFileSync(xsdPath, 'utf8');
    const schema = libxmljs.parseXml(content, { baseUrl });

    schemaCache.set(xsdPath, schema);
    return schema;
  }

  /**
   * Valida XML contra schema XSD.
   * @param {string} xml
   * @param {string} xsdPath
   * @param {{ injetarAssinaturaStub?: boolean, modelo?: '55'|'65' }} [options]
   * @returns {{ valido: true, avisos: string[] }}
   */
  static validar(xml, xsdPath, options = {}) {
    let xmlParaValidar = xml;

    if (options.injetarAssinaturaStub) {
      xmlParaValidar = this.#prepararXmlEstrutural(xml, options.modelo ?? '55');
    }

    const schema = this.loadSchema(xsdPath);
    const doc = libxmljs.parseXml(xmlParaValidar);

    const valido = doc.validate(schema);
    if (valido) {
      return { valido: true, avisos: [] };
    }

    const erros = doc.validationErrors.map((e) => e.message).filter(Boolean);
    throw new XsdValidationError(erros, path.basename(xsdPath));
  }

  /**
   * Valida e retorna boolean (sem lançar exceção).
   * @param {string} xml
   * @param {string} xsdPath
   * @param {object} [options]
   */
  static tentarValidar(xml, xsdPath, options = {}) {
    try {
      return this.validar(xml, xsdPath, options);
    } catch (error) {
      if (error instanceof XsdValidationError) {
        return { valido: false, erros: error.erros };
      }
      throw error;
    }
  }

  /**
   * Injeta elementos exigidos pelo XSD para validação estrutural pré-assinatura.
   * O schema exige Signature (NF-e) ou infNFeSupl + Signature (NFC-e).
   * @param {string} xml
   * @param {'55'|'65'} modelo
   */
  static #prepararXmlEstrutural(xml, modelo) {
    if (xml.includes('</Signature>')) return xml;

    const idMatch = xml.match(/Id="(NFe\d{44})"/);
    const id = idMatch?.[1];
    if (!id) return xml;

    let complemento = '';

    if (modelo === '65' && !xml.includes('infNFeSupl')) {
      const qrStub = 'https://nfce.sefaz.example/qr?p=STUB';
      complemento += `<infNFeSupl><qrCode><![CDATA[${qrStub}]]></qrCode><urlChave>${qrStub}</urlChave></infNFeSupl>`;
    }

    complemento += this.#assinaturaStub(id);
    return xml.replace('</NFe>', `${complemento}</NFe>`);
  }

  /** @param {string} id */
  static #assinaturaStub(id) {
    return `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI="#${id}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><DigestValue>WCF0TVY=</DigestValue></Reference></SignedInfo><SignatureValue>WCF0TVY=</SignatureValue><KeyInfo><X509Data><X509Certificate>WCF0TVY=</X509Certificate></X509Data></KeyInfo></Signature>`;
  }

  /** Limpa cache de schemas (útil em testes). */
  static limparCache() {
    schemaCache.clear();
  }
}
