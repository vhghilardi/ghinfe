import forge from 'node-forge';
import { GhinfeError } from '../errors/GhinfeError.js';

/**
 * Monta um PFX em memória a partir de certificado e chave PEM (ex.: cert.pem + key.pem),
 * para uso nas APIs que recebem { pfx, senha }.
 * @param {string} certificatePem
 * @param {string} privateKeyPem Chave sem senha
 * @param {string} senha Senha do PFX gerado
 * @returns {Buffer}
 */
export function criarPfxDePem(certificatePem, privateKeyPem, senha) {
  try {
    const p12 = forge.pkcs12.toPkcs12Asn1(
      forge.pki.privateKeyFromPem(privateKeyPem),
      [forge.pki.certificateFromPem(certificatePem)],
      senha,
      { algorithm: '3des' }
    );
    return Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary');
  } catch (error) {
    throw new GhinfeError('Falha ao converter certificado/chave PEM em PFX', 'CERT_PEM_ERROR', error);
  }
}

/**
 * Carrega certificado A1 (.pfx / .p12) e retorna chave privada + certificado PEM.
 * @param {Buffer|string} pfxBuffer
 * @param {string} password
 * @returns {{
 *   privateKeyPem: string,
 *   certificatePem: string,
 *   chainPem: string,
 *   certificate: forge.pki.Certificate,
 * }} certificatePem: titular; chainPem: titular seguido das ACs contidas no PFX
 */
export function loadPfxCertificate(pfxBuffer, password) {
  try {
    const buffer = Buffer.isBuffer(pfxBuffer) ? pfxBuffer : Buffer.from(pfxBuffer);
    const p12Asn1 = forge.asn1.fromDer(buffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    const certificados = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [])
      .map((bag) => bag.cert)
      .filter(Boolean);
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];

    // O PFX pode trazer as ACs antes do titular; o titular é o que casa com a chave privada
    const privateKey = keyBag?.key;
    const certificate =
      certificados.find((c) => privateKey && c.publicKey?.n?.equals(privateKey.n)) ?? certificados[0];

    if (!certificate || !privateKey) {
      throw new GhinfeError(
        'Certificado ou chave privada não encontrados no arquivo PFX',
        'CERT_NOT_FOUND'
      );
    }

    const cadeia = [certificate, ...certificados.filter((c) => c !== certificate)];

    return {
      privateKeyPem: forge.pki.privateKeyToPem(privateKey),
      certificatePem: forge.pki.certificateToPem(certificate),
      chainPem: cadeia.map((c) => forge.pki.certificateToPem(c)).join(''),
      certificate,
    };
  } catch (error) {
    if (error instanceof GhinfeError) throw error;
    throw new GhinfeError(
      'Falha ao carregar certificado PFX. Verifique o arquivo e a senha.',
      'CERT_LOAD_ERROR',
      error
    );
  }
}
