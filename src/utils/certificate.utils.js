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
 * @returns {{ privateKeyPem: string, certificatePem: string, certificate: forge.pki.Certificate }}
 */
export function loadPfxCertificate(pfxBuffer, password) {
  try {
    const buffer = Buffer.isBuffer(pfxBuffer) ? pfxBuffer : Buffer.from(pfxBuffer);
    const p12Asn1 = forge.asn1.fromDer(buffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];

    if (!certBag?.cert || !keyBag?.key) {
      throw new GhinfeError(
        'Certificado ou chave privada não encontrados no arquivo PFX',
        'CERT_NOT_FOUND'
      );
    }

    const certificate = certBag.cert;
    const privateKey = keyBag.key;

    return {
      privateKeyPem: forge.pki.privateKeyToPem(privateKey),
      certificatePem: forge.pki.certificateToPem(certificate),
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
