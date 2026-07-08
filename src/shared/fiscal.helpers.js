import { UF_IBGE } from '../constants/sefaz.js';
import { appendIBSCBS } from '../reforma/ibscbs.js';

/** @param {string} uf */
export function codigoUf(uf) {
  return UF_IBGE[uf?.toUpperCase()] ?? '35';
}

/** @param {number} value @param {number} decimals */
export function formatDecimal(value, decimals) {
  return Number(value).toFixed(decimals);
}

/**
 * @param {import('xmlbuilder2').XMLBuilder} parent
 * @param {string} tag
 * @param {import('../nfe/types/NFeDocument.js').NFeEndereco} endereco
 */
export function appendEndereco(parent, tag, endereco) {
  const node = parent.ele(tag);
  node.ele('xLgr').txt(endereco.logradouro).up();
  node.ele('nro').txt(endereco.numero).up();
  if (endereco.complemento) node.ele('xCpl').txt(endereco.complemento).up();
  node.ele('xBairro').txt(endereco.bairro).up();
  node.ele('cMun').txt(endereco.codigoMunicipio).up();
  node.ele('xMun').txt(endereco.municipio).up();
  node.ele('UF').txt(endereco.uf).up();
  node.ele('CEP').txt(endereco.cep.replace(/\D/g, '')).up();
  if (endereco.telefone) node.ele('fone').txt(endereco.telefone.replace(/\D/g, '')).up();
  node.up();
}

/**
 * @param {import('xmlbuilder2').XMLBuilder} impostoNode
 * @param {import('../nfe/types/NFeDocument.js').NFeItem} item
 */
export function appendImpostosItem(impostoNode, item) {
  const icms = impostoNode.ele('ICMS').ele('ICMS00');
  icms.ele('orig').txt('0').up();
  icms.ele('CST').txt(item.cst ?? '00').up();
  icms.ele('modBC').txt('0').up();
  icms.ele('vBC').txt(formatDecimal(item.valorTotal, 2)).up();
  icms.ele('pICMS').txt(formatDecimal(item.aliquotaIcms ?? 0, 4)).up();
  icms.ele('vICMS').txt(formatDecimal(item.valorIcms ?? 0, 2)).up();
  icms.up().up();

  impostoNode.ele('PIS').ele('PISNT').ele('CST').txt('07').up().up().up();
  impostoNode.ele('COFINS').ele('COFINSNT').ele('CST').txt('07').up().up().up();

  if (item.reforma) {
    appendIBSCBS(impostoNode, item.reforma);
  }
}
