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
 * Gera hash QR Code NFC-e versão 3.
 * SHA1(chave + versao + tpAmb + cDest + vNF + vICMS + digVal + idCSC + CSC)
 */
export function gerarHashQrCodeV3(chaveAcesso, ambiente, cDest, vNF, vICMS, digVal, idCSC, csc) {
  const vNFStr = Number(vNF).toFixed(2);
  const vICMSStr = Number(vICMS).toFixed(2);
  const id = idCSC.padStart(6, '0');
  const input = `${chaveAcesso}3${ambiente}${cDest}${vNFStr}${vICMSStr}${digVal}${id}${csc}`;
  return crypto.createHash('sha1').update(input).digest('hex').toUpperCase();
}

/**
 * Monta URL do QR Code NFC-e versão 3 (layout exigido pelo XSD PL_009_V4).
 * @param {{
 *   chaveAcesso: string,
 *   uf: string,
 *   ambiente?: number,
 *   cDest?: string,
 *   valorNF: number,
 *   valorICMS?: number,
 *   digVal: string,
 *   idCSC: string,
 *   csc: string,
 * }} params
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

  const cDest = (params.cDest ?? '').replace(/\D/g, '');
  const vNFStr = Number(params.valorNF).toFixed(2);
  const vICMSStr = Number(params.valorICMS ?? 0).toFixed(2);
  const idCSC = params.idCSC.padStart(6, '0');
  const hash = gerarHashQrCodeV3(
    params.chaveAcesso,
    ambiente,
    cDest,
    params.valorNF,
    params.valorICMS ?? 0,
    params.digVal,
    idCSC,
    params.csc
  );

  const p = `${params.chaveAcesso}|3|${ambiente}|${cDest}|${vNFStr}|${vICMSStr}|${params.digVal}|${idCSC}|${hash}`;
  return `${baseUrl}?p=${p}`;
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
 * Insere infNFeSupl no XML assinado da NFC-e.
 * @param {string} xmlAssinado
 * @param {string} qrCodeUrl
 * @param {string} urlChave
 */
export function inserirInfNFeSupl(xmlAssinado, qrCodeUrl, urlChave) {
  const supl = `<infNFeSupl><qrCode><![CDATA[${qrCodeUrl}]]></qrCode><urlChave>${urlChave}</urlChave></infNFeSupl>`;
  return xmlAssinado.replace('</NFe>', `${supl}</NFe>`);
}
