/**
 * Constantes e helpers — Reforma Tributária (NT 2025.002 / PL_010).
 * IBS + CBS. Injeção no builder NF-e/NFC-e quando item.reforma ou reformaTributaria.
 */

export const REFORMA_LAYOUT = 'PL_010';

export const CST_IBSCBS = {
  TRIBUTACAO_INTEGRAL: '000',
  ISENCAO: '100',
  DIFERIMENTO: '200',
  REDUCAO_BASE: '300',
  SUSPENSAO: '400',
};

/**
 * @typedef {Object} TributacaoRTC
 * @property {string} [cst]
 * @property {string} [cClassTrib]
 * @property {number} [vBC]
 * @property {number} [pIBSUF]
 * @property {number} [pIBSMun]
 * @property {number} [pCBS]
 * @property {number} [vIBSUF]
 * @property {number} [vIBSMun]
 * @property {number} [vCBS]
 */

/**
 * @param {number} baseCalculo
 * @param {Omit<TributacaoRTC, 'vIBSUF'|'vIBSMun'|'vCBS'|'vBC'>} [aliquotas]
 * @returns {TributacaoRTC & { vBC: number }}
 */
export function calcularIBSCBS(baseCalculo, aliquotas = {}) {
  const pIBSUF = aliquotas.pIBSUF ?? 0;
  const pIBSMun = aliquotas.pIBSMun ?? 0;
  const pCBS = aliquotas.pCBS ?? 0;
  const base = Number(baseCalculo) || 0;

  return {
    cst: aliquotas.cst ?? CST_IBSCBS.TRIBUTACAO_INTEGRAL,
    cClassTrib: aliquotas.cClassTrib,
    vBC: base,
    pIBSUF,
    pIBSMun,
    pCBS,
    vIBSUF: Number(((base * pIBSUF) / 100).toFixed(2)),
    vIBSMun: Number(((base * pIBSMun) / 100).toFixed(2)),
    vCBS: Number(((base * pCBS) / 100).toFixed(2)),
  };
}

/**
 * @param {TributacaoRTC} trib
 * @returns {string}
 */
export function buildFragmentoIBSCBS(trib) {
  const dec = (v, d = 2) => Number(v ?? 0).toFixed(d);
  return `<IBSCBS>
  <CST>${trib.cst ?? CST_IBSCBS.TRIBUTACAO_INTEGRAL}</CST>
  ${trib.cClassTrib ? `<cClassTrib>${trib.cClassTrib}</cClassTrib>` : ''}
  <gIBSCBS>
    <vBC>${dec(trib.vBC ?? 0)}</vBC>
    <gIBSUF>
      <pIBSUF>${dec(trib.pIBSUF, 4)}</pIBSUF>
      <vIBSUF>${dec(trib.vIBSUF)}</vIBSUF>
    </gIBSUF>
    <gIBSMun>
      <pIBSMun>${dec(trib.pIBSMun, 4)}</pIBSMun>
      <vIBSMun>${dec(trib.vIBSMun)}</vIBSMun>
    </gIBSMun>
    <gCBS>
      <pCBS>${dec(trib.pCBS, 4)}</pCBS>
      <vCBS>${dec(trib.vCBS)}</vCBS>
    </gCBS>
  </gIBSCBS>
</IBSCBS>`;
}

/**
 * Anexa grupo IBSCBS ao nó imposto (xmlbuilder2).
 * @param {import('xmlbuilder2').XMLBuilder} impostoNode
 * @param {TributacaoRTC} trib
 */
export function appendIBSCBS(impostoNode, trib) {
  if (!trib) return;
  const dec = (v, d = 2) => Number(v ?? 0).toFixed(d);
  const ibs = impostoNode.ele('IBSCBS');
  ibs.ele('CST').txt(trib.cst ?? CST_IBSCBS.TRIBUTACAO_INTEGRAL).up();
  if (trib.cClassTrib) ibs.ele('cClassTrib').txt(trib.cClassTrib).up();

  const g = ibs.ele('gIBSCBS');
  g.ele('vBC').txt(dec(trib.vBC ?? 0)).up();

  const gUf = g.ele('gIBSUF');
  gUf.ele('pIBSUF').txt(dec(trib.pIBSUF, 4)).up();
  gUf.ele('vIBSUF').txt(dec(trib.vIBSUF)).up();
  gUf.up();

  const gMun = g.ele('gIBSMun');
  gMun.ele('pIBSMun').txt(dec(trib.pIBSMun, 4)).up();
  gMun.ele('vIBSMun').txt(dec(trib.vIBSMun)).up();
  gMun.up();

  const gCbs = g.ele('gCBS');
  gCbs.ele('pCBS').txt(dec(trib.pCBS, 4)).up();
  gCbs.ele('vCBS').txt(dec(trib.vCBS)).up();
  gCbs.up();

  g.up();
  ibs.up();
}

/**
 * Anexa totais IBS/CBS em &lt;total&gt; (irmão de ICMSTot).
 * @param {import('xmlbuilder2').XMLBuilder} totalParent
 * @param {{ vIBSUF: number, vIBSMun: number, vCBS: number }} totais
 */
export function appendTotaisIBSCBS(totalParent, totais) {
  if (!totais) return;
  const dec = (v) => Number(v ?? 0).toFixed(2);
  const node = totalParent.ele('IBSCBSTot');
  node.ele('vIBS').txt(dec((totais.vIBSUF ?? 0) + (totais.vIBSMun ?? 0))).up();
  node.ele('vIBSUF').txt(dec(totais.vIBSUF)).up();
  node.ele('vIBSMun').txt(dec(totais.vIBSMun)).up();
  node.ele('vCBS').txt(dec(totais.vCBS)).up();
  node.up();
}

/**
 * @param {Array<{ reforma?: TributacaoRTC, valorTotal?: number }>} itens
 * @param {boolean} [autoCalcular]
 */
export function normalizarItensReforma(itens = [], autoCalcular = false) {
  return itens.map((item) => {
    if (item.reforma) {
      if (item.reforma.vIBSUF == null && autoCalcular !== false) {
        return {
          ...item,
          reforma: calcularIBSCBS(item.reforma.vBC ?? item.valorTotal ?? 0, item.reforma),
        };
      }
      return item;
    }
    return item;
  });
}

/**
 * @param {Array<{ reforma?: TributacaoRTC }>} itens
 */
export function somarTotaisReforma(itens = []) {
  return itens.reduce(
    (acc, item) => {
      const r = item.reforma;
      if (!r) return acc;
      acc.vIBSUF += r.vIBSUF ?? 0;
      acc.vIBSMun += r.vIBSMun ?? 0;
      acc.vCBS += r.vCBS ?? 0;
      return acc;
    },
    { vIBSUF: 0, vIBSMun: 0, vCBS: 0 }
  );
}

/**
 * @param {{ reformaTributaria?: boolean, itens?: Array<{ reforma?: unknown }> }} documentoOuOptions
 */
export function reformaHabilitada(documentoOuOptions = {}) {
  if (documentoOuOptions.reformaTributaria) return true;
  if (Array.isArray(documentoOuOptions.itens)) {
    return documentoOuOptions.itens.some((i) => i.reforma);
  }
  return false;
}
