import { GhinfeError } from '../errors/GhinfeError.js';

/**
 * Larguras (barra, espaço, barra, ...) de cada símbolo Code 128, em módulos.
 * Índice = valor do símbolo; 105 = Start C, 106 = Stop.
 */
const PADROES = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_C = 105;
const STOP = 106;

/**
 * Codifica dígitos em Code 128 subconjunto C (pares numéricos), com DV módulo 103.
 * @param {string} digitos Quantidade par de dígitos (ex.: chave de acesso, 44)
 * @returns {{ simbolos: number[], dv: number, larguras: number[] }}
 */
export function codificarCode128C(digitos) {
  if (!/^\d+$/.test(digitos) || digitos.length % 2 !== 0) {
    throw new GhinfeError('Code 128C exige quantidade par de dígitos', 'CODE128C_INVALIDO');
  }

  const dados = digitos.match(/\d{2}/g).map(Number);
  const soma = dados.reduce((acc, valor, i) => acc + valor * (i + 1), START_C);
  const dv = soma % 103;
  const simbolos = [START_C, ...dados, dv, STOP];
  const larguras = simbolos.flatMap((s) => [...PADROES[s]].map(Number));

  return { simbolos, dv, larguras };
}

/**
 * Gera SVG do código de barras Code 128C (barras em unidades de módulo, escalável via CSS).
 * @param {string} digitos
 * @param {{ altura?: number, margem?: number }} [opcoes] altura e margem clara em módulos (margem mínima: 10)
 * @returns {string}
 */
export function gerarSvgCode128C(digitos, opcoes = {}) {
  const altura = opcoes.altura ?? 50;
  const margem = Math.max(opcoes.margem ?? 10, 10);
  const { larguras } = codificarCode128C(digitos);

  let x = margem;
  const barras = [];
  larguras.forEach((largura, i) => {
    if (i % 2 === 0) barras.push(`<rect x="${x}" y="0" width="${largura}" height="${altura}"/>`);
    x += largura;
  });

  const total = x + margem;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${altura}" preserveAspectRatio="none" ` +
    `shape-rendering="crispEdges" role="img" aria-label="${digitos}">` +
    `<rect width="${total}" height="${altura}" fill="#fff"/><g fill="#000">${barras.join('')}</g></svg>`
  );
}
