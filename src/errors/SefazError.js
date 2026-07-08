import { GhinfeError } from './GhinfeError.js';

export class SefazError extends GhinfeError {
  /**
   * @param {string} cStat
   * @param {string} xMotivo
   * @param {Record<string, unknown>} [raw]
   */
  constructor(cStat, xMotivo, raw = {}) {
    super(`SEFAZ [${cStat}]: ${xMotivo}`, `SEFAZ_${cStat}`, { cStat, xMotivo, ...raw });
    this.name = 'SefazError';
    this.cStat = cStat;
    this.xMotivo = xMotivo;
  }

  /** @returns {boolean} */
  isAutorizado() {
    return this.cStat === '100';
  }

  /** @returns {boolean} */
  isRejeicao() {
    return this.cStat.length === 3 && this.cStat.startsWith('2');
  }
}
