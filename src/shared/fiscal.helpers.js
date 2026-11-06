import { UF_IBGE } from '../constants/sefaz.js';
import { appendIBSCBS } from '../reforma/ibscbs.js';
import { appendIcms } from './icms.js';

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
 * Anexa detPag. xPag é obrigatório quando tPag=99 (outros); sem descrição, usa "Outros".
 * @param {import('xmlbuilder2').XMLBuilder} pag
 * @param {import('../nfe/types/NFeDocument.js').NFePagamento} pagamento
 */
export function appendDetPag(pag, pagamento) {
  const detPag = pag.ele('detPag');
  detPag.ele('tPag').txt(pagamento.forma).up();
  const descricao = pagamento.descricao ?? (pagamento.forma === '99' ? 'Outros' : undefined);
  if (descricao) detPag.ele('xPag').txt(descricao).up();
  detPag.ele('vPag').txt(formatDecimal(pagamento.valor, 2)).up();
  detPag.up();
}

/**
 * Anexa ICMS (conforme CRT do emitente), PIS, COFINS e IBS/CBS do item.
 * @param {import('xmlbuilder2').XMLBuilder} impostoNode
 * @param {import('../nfe/types/NFeDocument.js').NFeItem} item
 * @param {{ crt: string|number }} opcoes
 * @returns {import('./icms.js').IcmsTotais} valores do item para ICMSTot
 */
export function appendImpostosItem(impostoNode, item, opcoes) {
  const totaisIcms = appendIcms(impostoNode, item, opcoes.crt);

  impostoNode.ele('PIS').ele('PISNT').ele('CST').txt('07').up().up().up();
  impostoNode.ele('COFINS').ele('COFINSNT').ele('CST').txt('07').up().up().up();

  if (item.reforma) {
    appendIBSCBS(impostoNode, item.reforma);
  }

  return totaisIcms;
}
