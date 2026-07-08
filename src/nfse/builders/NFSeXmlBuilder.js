import { obterAdapter } from '../layouts/adapters.js';
import { NFSE_LAYOUTS } from '../constants/municipios.js';

/**
 * Gera XML RPS conforme layout municipal (ABRASF, GINFES, Betha, ISSNet).
 */
export class NFSeXmlBuilder {
  /**
   * @param {import('../types/NFSeDocument.js').NFSeDocumento} documento
   * @param {string} [layout] abrasf | ginfes | betha | issnet
   * @returns {string}
   */
  buildGerarNfse(documento, layout = NFSE_LAYOUTS.ABRASF) {
    return obterAdapter(layout).build(documento);
  }
}
