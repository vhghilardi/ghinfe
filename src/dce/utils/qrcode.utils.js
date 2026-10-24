import crypto from 'crypto';
import { DCE_QRCODE_URL, DCE_TIPO_EMISSAO } from '../constants/dce.js';
import { loadPfxCertificate } from '../../utils/certificate.utils.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

/**
 * Assina a chave de acesso (RSA-SHA1, Base64) para o parâmetro sign do QR Code
 * em contingência off-line. Deve usar o mesmo certificado que assina a DC-e.
 * @param {string} chaveAcesso
 * @param {Buffer|string} pfx
 * @param {string} senha
 */
export function assinarChaveQrCodeDCe(chaveAcesso, pfx, senha) {
  const { privateKeyPem } = loadPfxCertificate(pfx, senha);
  return crypto.createSign('RSA-SHA1').update(chaveAcesso).sign(privateKeyPem, 'base64');
}

/**
 * Monta URL do QR Code da DC-e (Manual DC-e — Anexo II, item 3.2).
 *
 * Normal:       {url}?chDCe={chave}&tpAmb={amb}
 * Contingência: {url}?chDCe={chave}&tpAmb={amb}&sign={assinatura}&{CNPJ|CPF|idOutros}={doc}
 *
 * O pattern de qrCodDCe no XSD exige "&sign=" logo após tpAmb, embora o exemplo
 * do manual traga a identificação do emitente antes de sign.
 *
 * @param {{
 *   chaveAcesso: string,
 *   ambiente?: number,
 *   tipoEmissao?: number,
 *   emitente?: { cnpj?: string, cpf?: string, idOutros?: string },
 *   sign?: string,
 *   baseUrl?: string,
 * }} params
 */
export function gerarUrlQrCodeDCe(params) {
  const baseUrl = params.baseUrl ?? DCE_QRCODE_URL;
  let url = `${baseUrl}?chDCe=${params.chaveAcesso}&tpAmb=${params.ambiente ?? 2}`;

  if ((params.tipoEmissao ?? DCE_TIPO_EMISSAO.NORMAL) !== DCE_TIPO_EMISSAO.CONTINGENCIA_OFFLINE) {
    return url;
  }

  if (!params.sign) {
    throw new GhinfeError(
      'Parâmetro sign obrigatório no QR Code em contingência off-line',
      'DCE_QRCODE_SIGN_MISSING'
    );
  }

  url += `&sign=${params.sign}`;

  const emit = params.emitente ?? {};
  if (emit.cnpj) url += `&CNPJ=${emit.cnpj.replace(/\D/g, '')}`;
  else if (emit.cpf) url += `&CPF=${emit.cpf.replace(/\D/g, '')}`;
  else if (emit.idOutros) url += `&idOutros=${emit.idOutros}`;

  return url;
}
