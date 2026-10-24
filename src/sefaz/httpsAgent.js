import fs from 'fs';
import https from 'https';
import tls from 'tls';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadPfxCertificate } from '../utils/certificate.utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Raiz ICP-Brasil v10 (ITI). Os web services da SEFAZ usam cadeias ICP-Brasil,
 * que não fazem parte do repositório de confiança padrão do Node.
 */
export const ICP_BRASIL_RAIZ_V10 = fs.readFileSync(path.join(__dirname, 'ca/icp-brasil-raiz-v10.pem'), 'utf8');

/**
 * Cria https.Agent com autenticação mútua (TLS 1.2+) usando o certificado A1.
 * @param {{ pfx: Buffer|string, senha: string }} certificado
 * @param {{ ca?: string|string[], keepAlive?: boolean }} [options]
 *   ca: CAs adicionais; as raízes padrão do Node e a ICP-Brasil v10 são sempre incluídas
 */
export function criarHttpsAgentSefaz(certificado, options = {}) {
  const { privateKeyPem, certificatePem } = loadPfxCertificate(certificado.pfx, certificado.senha);
  const extras = [options.ca ?? []].flat();

  return new https.Agent({
    key: privateKeyPem,
    cert: certificatePem,
    ca: [...tls.rootCertificates, ICP_BRASIL_RAIZ_V10, ...extras],
    minVersion: 'TLSv1.2',
    keepAlive: options.keepAlive ?? true,
  });
}
