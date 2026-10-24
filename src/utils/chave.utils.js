import { UF_IBGE } from '../constants/sefaz.js';
import { GhinfeError } from '../errors/GhinfeError.js';

/**
 * Gera código numérico aleatório de 8 dígitos (cNF).
 * @returns {string}
 */
export function gerarCodigoNumerico() {
  const valor = Math.floor(Math.random() * 99_999_999) + 1;
  return String(valor).padStart(8, '0');
}

/**
 * Calcula dígito verificador da chave NF-e (módulo 11).
 * @param {string} chave43 Primeiros 43 dígitos da chave (sem DV)
 * @returns {string} Dígito verificador (0-9)
 */
export function calcularDigitoVerificador(chave43) {
  if (!/^\d{43}$/.test(chave43)) {
    throw new GhinfeError('Chave deve conter exatamente 43 dígitos para cálculo do DV', 'CHAVE_INVALID_LENGTH');
  }

  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  let pesoIndex = 0;

  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += parseInt(chave43[i], 10) * pesos[pesoIndex];
    pesoIndex = (pesoIndex + 1) % pesos.length;
  }

  const resto = soma % 11;
  return String(resto < 2 ? 0 : 11 - resto);
}

/**
 * Valida se a chave de acesso possui DV correto.
 * @param {string} chaveAcesso 44 dígitos
 * @returns {boolean}
 */
export function validarChaveAcesso(chaveAcesso) {
  const chave = chaveAcesso.replace(/\D/g, '');
  if (chave.length !== 44) return false;
  const dvCalculado = calcularDigitoVerificador(chave.substring(0, 43));
  return dvCalculado === chave[43];
}

/**
 * Gera chave de acesso NF-e/NFC-e (44 dígitos) conforme layout SEFAZ.
 *
 * Composição: cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8) + cDV(1)
 *
 * @param {{
 *   uf: string,
 *   cnpj: string,
 *   modelo?: string|number,
 *   serie: number,
 *   numero: number,
 *   tipoEmissao?: number,
 *   codigoNumerico?: string,
 *   dataEmissao?: Date,
 * }} params
 * @returns {string}
 */
export function gerarChaveAcesso(params) {
  const uf = params.uf?.toUpperCase();
  const cUF = UF_IBGE[uf];

  if (!cUF) {
    throw new GhinfeError(`UF inválida: ${params.uf}`, 'UF_INVALIDA');
  }

  const data = params.dataEmissao ?? new Date();
  const ano = String(data.getFullYear()).slice(-2);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const aamm = `${ano}${mes}`;

  const cnpj = params.cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) {
    throw new GhinfeError('CNPJ deve conter 14 dígitos', 'CNPJ_INVALIDO');
  }

  const modelo = String(params.modelo ?? '55').padStart(2, '0');
  const serie = String(params.serie).padStart(3, '0');
  const numero = String(params.numero).padStart(9, '0');
  const tpEmis = String(params.tipoEmissao ?? 1);
  const cNF = (params.codigoNumerico ?? gerarCodigoNumerico()).padStart(8, '0');

  const chave43 = `${cUF}${aamm}${cnpj}${modelo}${serie}${numero}${tpEmis}${cNF}`;
  const cDV = calcularDigitoVerificador(chave43);

  return chave43 + cDV;
}

/**
 * Gera código numérico da DC-e (cDC, 6 dígitos).
 * A SEFAZ rejeita (897) sequências repetidas (000000, 111111...) e cDC igual a nDC.
 * @param {number} [numero] nDC da declaração
 * @returns {string}
 */
export function gerarCodigoNumericoDCe(numero) {
  for (;;) {
    const cDC = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    if (/^(\d)\1{5}$/.test(cDC)) continue;
    if (numero !== undefined && Number(cDC) === Number(numero)) continue;
    return cDC;
  }
}

/**
 * Gera chave de acesso da DC-e (modelo 99, 44 dígitos).
 *
 * Composição: cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nDC(9) + tpEmis(1)
 *   + tpEmit(1) + nSiteAutoriz(1) + cDC(6) + cDV(1)
 *
 * O CNPJ é o de quem emite/assina: Fisco, Marketplace, Transportadora, ECT
 * ou o próprio usuário emitente (emissão própria).
 *
 * @param {{
 *   uf: string,
 *   cnpj: string,
 *   serie: number,
 *   numero: number,
 *   tipoEmitente: number,
 *   tipoEmissao?: number,
 *   siteAutorizador?: number,
 *   codigoNumerico?: string,
 *   dataEmissao?: Date,
 * }} params
 * @returns {string}
 */
export function gerarChaveAcessoDCe(params) {
  const cUF = UF_IBGE[params.uf?.toUpperCase()];
  if (!cUF) {
    throw new GhinfeError(`UF inválida: ${params.uf}`, 'UF_INVALIDA');
  }

  const cnpj = params.cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) {
    throw new GhinfeError('CNPJ deve conter 14 dígitos', 'CNPJ_INVALIDO');
  }

  const data = params.dataEmissao ?? new Date();
  const aamm = `${String(data.getFullYear()).slice(-2)}${String(data.getMonth() + 1).padStart(2, '0')}`;

  const serie = String(params.serie).padStart(3, '0');
  const numero = String(params.numero).padStart(9, '0');
  const tpEmis = String(params.tipoEmissao ?? 1);
  const tpEmit = String(params.tipoEmitente);
  const nSiteAutoriz = String(params.siteAutorizador ?? 0);
  const cDC = (params.codigoNumerico ?? gerarCodigoNumericoDCe(params.numero)).padStart(6, '0');

  const chave43 = `${cUF}${aamm}${cnpj}99${serie}${numero}${tpEmis}${tpEmit}${nSiteAutoriz}${cDC}`;
  return chave43 + calcularDigitoVerificador(chave43);
}

/**
 * Extrai campos da chave de acesso da DC-e.
 * @param {string} chaveAcesso
 */
export function parseChaveAcessoDCe(chaveAcesso) {
  const chave = chaveAcesso.replace(/\D/g, '');
  if (chave.length !== 44) {
    throw new GhinfeError('Chave de acesso deve ter 44 dígitos', 'CHAVE_INVALID_LENGTH');
  }

  return {
    cUF: chave.substring(0, 2),
    aamm: chave.substring(2, 6),
    cnpj: chave.substring(6, 20),
    modelo: chave.substring(20, 22),
    serie: parseInt(chave.substring(22, 25), 10),
    numero: parseInt(chave.substring(25, 34), 10),
    tipoEmissao: parseInt(chave[34], 10),
    tipoEmitente: parseInt(chave[35], 10),
    siteAutorizador: parseInt(chave[36], 10),
    codigoNumerico: chave.substring(37, 43),
    digitoVerificador: chave[43],
    valida: validarChaveAcesso(chave),
  };
}

/**
 * Extrai campos da chave de acesso para conferência.
 * @param {string} chaveAcesso
 */
export function parseChaveAcesso(chaveAcesso) {
  const chave = chaveAcesso.replace(/\D/g, '');
  if (chave.length !== 44) {
    throw new GhinfeError('Chave de acesso deve ter 44 dígitos', 'CHAVE_INVALID_LENGTH');
  }

  return {
    cUF: chave.substring(0, 2),
    aamm: chave.substring(2, 6),
    cnpj: chave.substring(6, 20),
    modelo: chave.substring(20, 22),
    serie: parseInt(chave.substring(22, 25), 10),
    numero: parseInt(chave.substring(25, 34), 10),
    tipoEmissao: parseInt(chave[34], 10),
    codigoNumerico: chave.substring(35, 43),
    digitoVerificador: chave[43],
    valida: validarChaveAcesso(chave),
  };
}
