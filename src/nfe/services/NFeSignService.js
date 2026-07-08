import { SignedXml } from 'xml-crypto';
import { DOMParser } from '@xmldom/xmldom';
import { loadPfxCertificate } from '../../utils/certificate.utils.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

/**
 * Serviço de assinatura digital XML-DSig para NF-e (certificado A1 .pfx).
 * Assina o elemento infNFe com algoritmo exigido pela SEFAZ.
 */
export class NFeSignService {
  /**
   * Assina o XML da NF-e usando certificado A1.
   * @param {string} xmlNFe XML da NF-e sem assinatura
   * @param {Buffer|string} pfxBuffer Conteúdo do arquivo .pfx
   * @param {string} pfxPassword Senha do certificado
   * @returns {string} XML assinado (NFe + Signature)
   */
  assinar(xmlNFe, pfxBuffer, pfxPassword) {
    return this.#assinarElemento(xmlNFe, 'infNFe', pfxBuffer, pfxPassword);
  }

  /**
   * Assina XML de evento NF-e (cancelamento, CC-e, etc.).
   * @param {string} xmlEvento
   * @param {Buffer|string} pfxBuffer
   * @param {string} pfxPassword
   * @returns {string}
   */
  assinarEvento(xmlEvento, pfxBuffer, pfxPassword) {
    return this.#assinarElemento(xmlEvento, 'infEvento', pfxBuffer, pfxPassword);
  }

  /**
   * Assina XML de RPS/NFS-e (elemento InfRps — ABRASF e derivados).
   * @param {string} xmlRps
   * @param {Buffer|string} pfxBuffer
   * @param {string} pfxPassword
   * @returns {string}
   */
  assinarRps(xmlRps, pfxBuffer, pfxPassword) {
    let tag = 'InfRps';
    if (xmlRps.includes('InfDeclaracaoPrestacaoServico')) tag = 'InfDeclaracaoPrestacaoServico';
    else if (xmlRps.includes('<infRps') || xmlRps.includes('infRps ')) tag = 'infRps';
    else if (xmlRps.includes('<InfRps') || xmlRps.includes('InfRps ')) tag = 'InfRps';
    return this.#assinarElemento(xmlRps, tag, pfxBuffer, pfxPassword);
  }

  /**
   * @param {string} xml
   * @param {string} tagName
   * @param {Buffer|string} pfxBuffer
   * @param {string} pfxPassword
   */
  #assinarElemento(xml, tagName, pfxBuffer, pfxPassword) {
    const { privateKeyPem, certificatePem } = loadPfxCertificate(pfxBuffer, pfxPassword);

    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const elemento = doc.getElementsByTagName(tagName)[0];

    if (!elemento) {
      throw new GhinfeError(`Elemento ${tagName} não encontrado no XML`, `SIGN_${tagName}_NOT_FOUND`);
    }

    const id = elemento.getAttribute('Id');
    if (!id) {
      throw new GhinfeError(`Atributo Id do ${tagName} é obrigatório para assinatura`, 'SIGN_MISSING_ID');
    }

    const signedXml = new SignedXml({
      privateKey: privateKeyPem,
      publicCert: certificatePem,
      signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
      canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    });

    signedXml.addReference({
      xpath: `//*[local-name()='${tagName}']`,
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
      ],
      digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
      uri: `#${id}`,
    });

    signedXml.computeSignature(xml, {
      location: { reference: `//*[local-name()='${tagName}']`, action: 'after' },
    });

    return signedXml.getSignedXml();
  }

  /**
   * Extrai informações do certificado para validação pré-envio.
   * @param {Buffer|string} pfxBuffer
   * @param {string} pfxPassword
   */
  obterInfoCertificado(pfxBuffer, pfxPassword) {
    const { certificate } = loadPfxCertificate(pfxBuffer, pfxPassword);
    const subject = certificate.subject.attributes
      .map((attr) => `${attr.shortName}=${attr.value}`)
      .join(', ');

    return {
      subject,
      validoDe: certificate.validity.notBefore,
      validoAte: certificate.validity.notAfter,
      serialNumber: certificate.serialNumber,
    };
  }
}
