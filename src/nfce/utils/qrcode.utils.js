import crypto from 'crypto';
import { NFCE_QRCODE_URLS, NFCE_URL_CHAVE } from '../constants/qrcode.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

/**
 * Extrai DigestValue da assinatura XML para compor QR Code v3.
 * @param {string} xmlAssinado
 */
export function extrairDigestValor(xmlAssinado) {
  const match = xmlAssinado.match(/<DigestValue>([^<]+)<\/DigestValue>/);
  return match?.[1] ?? '';
}

/**
 * Hash SHA-1 do QR Code no formato antigo desta lib. O QR Code v3 on-line (NT 2025.001)
 * não usa CSC nem hash.
 * @deprecated Mantida por compatibilidade; não é usada por gerarUrlQrCodeV3.
 */
export function gerarHashQrCodeV3(chaveAcesso, ambiente, cDest, vNF, vICMS, digVal, idCSC, csc) {
  const vNFStr = Number(vNF).toFixed(2);
  const vICMSStr = Number(vICMS).toFixed(2);
  const id = idCSC.padStart(6, '0');
  const input = `${chaveAcesso}3${ambiente}${cDest}${vNFStr}${vICMSStr}${digVal}${id}${csc}`;
  return crypto.createHash('sha1').update(input).digest('hex').toUpperCase();
}

/**
 * Monta URL do QR Code NFC-e versão 3 para emissão on-line (NT 2025.001):
 * {url}?p={chave}|3|{tpAmb}. O CSC foi descontinuado nesta versão.
 * Contingência off-line (tpEmis=9) exige assinatura e não é suportada.
 * @param {{
 *   chaveAcesso: string,
 *   uf: string,
 *   ambiente?: number,
 * }} params Demais campos (cDest, valorNF, idCSC, csc...) são ignorados
 */
export function gerarUrlQrCodeV3(params) {
  const ambiente = params.ambiente ?? 2;
  const uf = params.uf.toUpperCase();
  const baseUrl = NFCE_QRCODE_URLS[uf]?.[ambiente];

  if (!baseUrl) {
    throw new GhinfeError(
      `URL de QR Code NFC-e não configurada para UF ${uf} ambiente ${ambiente}`,
      'NFCE_QRCODE_URL_MISSING'
    );
  }
  if (params.chaveAcesso?.[34] === '9') {
    throw new GhinfeError(
      'QR Code v3 em contingência off-line (tpEmis=9) não é suportado',
      'NFCE_QRCODE_OFFLINE_NAO_SUPORTADO'
    );
  }

  return `${baseUrl}?p=${params.chaveAcesso}|3|${ambiente}`;
}

/**
 * @param {string} uf
 * @param {number} [ambiente]
 */
export function obterUrlChave(uf, ambiente = 2) {
  const url = NFCE_URL_CHAVE[uf.toUpperCase()]?.[ambiente];
  if (!url) {
    return NFCE_QRCODE_URLS[uf.toUpperCase()]?.[ambiente] ?? 'https://www.nfce.fazenda.sp.gov.br/consulta';
  }
  return url;
}

/**
 * Insere infNFeSupl no XML assinado da NFC-e, entre infNFe e Signature (ordem do XSD).
 * A assinatura cobre só infNFe, então a inserção não a invalida.
 * @param {string} xmlAssinado
 * @param {string} qrCodeUrl
 * @param {string} urlChave
 */
export function inserirInfNFeSupl(xmlAssinado, qrCodeUrl, urlChave) {
  const supl = `<infNFeSupl><qrCode><![CDATA[${qrCodeUrl}]]></qrCode><urlChave>${urlChave}</urlChave></infNFeSupl>`;
  return xmlAssinado.replace('</infNFe>', `</infNFe>${supl}`);
}
