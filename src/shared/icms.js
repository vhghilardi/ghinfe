import { GhinfeError } from '../errors/GhinfeError.js';

/** Código de Regime Tributário do emitente (tag CRT). */
export const CRT = {
  SIMPLES_NACIONAL: '1',
  SIMPLES_EXCESSO_SUBLIMITE: '2',
  REGIME_NORMAL: '3',
  MEI: '4',
};

/** CRT 1 (Simples Nacional) e 4 (MEI) usam CSOSN; CRT 2 e 3 usam CST. */
export function usaCsosn(crt) {
  return [CRT.SIMPLES_NACIONAL, CRT.MEI].includes(String(crt));
}

const dec = (v, n) => Number(v ?? 0).toFixed(n);
const round2 = (v) => Math.round(Number(v) * 100) / 100;

/**
 * @typedef {Object} IcmsTotais Valores do item que compõem ICMSTot
 * @property {number} vBC
 * @property {number} vICMS
 * @property {number} vBCST
 * @property {number} vST
 */

/**
 * @param {import('xmlbuilder2').XMLBuilder} grupo
 * @param {import('../nfe/types/NFeDocument.js').NFeIcmsSt} [st]
 * @param {string} codigo
 */
function appendSt(grupo, st, codigo) {
  if (!st || st.base === undefined || st.aliquota === undefined || st.valor === undefined) {
    throw new GhinfeError(
      `ICMS ${codigo} exige item.icmsSt com base, aliquota e valor`,
      'ICMS_ST_INCOMPLETO'
    );
  }
  grupo.ele('modBCST').txt(String(st.modalidade ?? 4));
  if (st.mva !== undefined) grupo.ele('pMVAST').txt(dec(st.mva, 4));
  if (st.reducaoBase !== undefined) grupo.ele('pRedBCST').txt(dec(st.reducaoBase, 4));
  grupo.ele('vBCST').txt(dec(st.base, 2));
  grupo.ele('pICMSST').txt(dec(st.aliquota, 4));
  grupo.ele('vICMSST').txt(dec(st.valor, 2));
  return { vBCST: Number(st.base), vST: Number(st.valor) };
}

/** @param {import('xmlbuilder2').XMLBuilder} grupo */
function appendCreditoSn(grupo, item, codigo, obrigatorio) {
  if (item.aliquotaCreditoSn === undefined) {
    if (obrigatorio) {
      throw new GhinfeError(`CSOSN ${codigo} exige item.aliquotaCreditoSn`, 'ICMS_CREDITO_SN_AUSENTE');
    }
    return;
  }
  const valor = item.valorCreditoSn ?? round2((item.valorTotal * item.aliquotaCreditoSn) / 100);
  grupo.ele('pCredSN').txt(dec(item.aliquotaCreditoSn, 4));
  grupo.ele('vCredICMSSN').txt(dec(valor, 2));
}

/** ICMS próprio (modBC, vBC, pICMS, vICMS); vICMS é calculado se omitido. */
function appendIcmsProprio(grupo, item) {
  const vBC = Number(item.baseIcms ?? item.valorTotal);
  const pICMS = Number(item.aliquotaIcms ?? 0);
  const vICMS = item.valorIcms ?? round2((vBC * pICMS) / 100);
  grupo.ele('modBC').txt(String(item.modalidadeBcIcms ?? 3));
  grupo.ele('vBC').txt(dec(vBC, 2));
  grupo.ele('pICMS').txt(dec(pICMS, 4));
  grupo.ele('vICMS').txt(dec(vICMS, 2));
  return { vBC, vICMS: Number(vICMS) };
}

/**
 * Regime normal (CRT 2 ou 3).
 * @returns {IcmsTotais}
 */
function appendIcmsNormal(icms, item) {
  const cst = String(item.cst ?? '00');
  const orig = String(item.origem ?? 0);
  const totais = { vBC: 0, vICMS: 0, vBCST: 0, vST: 0 };

  if (cst === '00') {
    const g = icms.ele('ICMS00');
    g.ele('orig').txt(orig);
    g.ele('CST').txt(cst);
    return { ...totais, ...appendIcmsProprio(g, item) };
  }
  if (['40', '41', '50'].includes(cst)) {
    const g = icms.ele('ICMS40');
    g.ele('orig').txt(orig);
    g.ele('CST').txt(cst);
    return totais;
  }
  if (cst === '60') {
    const g = icms.ele('ICMS60');
    g.ele('orig').txt(orig);
    g.ele('CST').txt(cst);
    return totais;
  }

  throw new GhinfeError(
    `CST ${cst} não suportado (suportados: 00, 40, 41, 50, 60). Para Simples Nacional use CRT 1 e item.csosn`,
    'ICMS_CST_NAO_SUPORTADO'
  );
}

/**
 * Simples Nacional / MEI (CRT 1 ou 4).
 * @returns {IcmsTotais}
 */
function appendIcmsSimples(icms, item) {
  const csosn = String(item.csosn ?? '102');
  const orig = String(item.origem ?? 0);
  const totais = { vBC: 0, vICMS: 0, vBCST: 0, vST: 0 };

  const grupo = (tag) => {
    const g = icms.ele(tag);
    g.ele('orig').txt(orig);
    g.ele('CSOSN').txt(csosn);
    return g;
  };

  switch (csosn) {
    case '101':
      appendCreditoSn(grupo('ICMSSN101'), item, csosn, true);
      return totais;
    case '102':
    case '103':
    case '300':
    case '400':
      grupo('ICMSSN102');
      return totais;
    case '201': {
      const g = grupo('ICMSSN201');
      const st = appendSt(g, item.icmsSt, csosn);
      appendCreditoSn(g, item, csosn, true);
      return { ...totais, ...st };
    }
    case '202':
    case '203':
      return { ...totais, ...appendSt(grupo('ICMSSN202'), item.icmsSt, csosn) };
    case '500':
      grupo('ICMSSN500');
      return totais;
    case '900': {
      const g = grupo('ICMSSN900');
      const proprio =
        item.aliquotaIcms !== undefined || item.baseIcms !== undefined ? appendIcmsProprio(g, item) : {};
      const st = item.icmsSt ? appendSt(g, item.icmsSt, csosn) : {};
      appendCreditoSn(g, item, csosn, false);
      return { ...totais, ...proprio, ...st };
    }
    default:
      throw new GhinfeError(
        `CSOSN ${csosn} não suportado (suportados: 101, 102, 103, 201, 202, 203, 300, 400, 500, 900)`,
        'ICMS_CSOSN_NAO_SUPORTADO'
      );
  }
}

/**
 * Anexa o grupo ICMS do item conforme o regime do emitente.
 * @param {import('xmlbuilder2').XMLBuilder} impostoNode
 * @param {import('../nfe/types/NFeDocument.js').NFeItem} item
 * @param {string|number} crt
 * @returns {IcmsTotais}
 */
export function appendIcms(impostoNode, item, crt) {
  const simples = usaCsosn(crt);
  if (!simples && item.csosn !== undefined) {
    throw new GhinfeError(
      `item.csosn informado, mas o emitente é do regime normal (CRT ${crt}); use item.cst`,
      'ICMS_CSOSN_REGIME_NORMAL'
    );
  }

  const icms = impostoNode.ele('ICMS');
  return simples ? appendIcmsSimples(icms, item) : appendIcmsNormal(icms, item);
}

/** @param {IcmsTotais[]} lista */
export function somarTotaisIcms(lista) {
  const soma = lista.reduce(
    (acc, t) => ({
      vBC: acc.vBC + t.vBC,
      vICMS: acc.vICMS + t.vICMS,
      vBCST: acc.vBCST + t.vBCST,
      vST: acc.vST + t.vST,
    }),
    { vBC: 0, vICMS: 0, vBCST: 0, vST: 0 }
  );
  return {
    vBC: round2(soma.vBC),
    vICMS: round2(soma.vICMS),
    vBCST: round2(soma.vBCST),
    vST: round2(soma.vST),
  };
}
