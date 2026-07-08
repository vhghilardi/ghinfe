import { NFSE_MUNICIPIOS } from './constants/municipios.js';
import { GhinfeError } from '../errors/GhinfeError.js';

/**
 * Resolve endpoint NFS-e por código IBGE do município.
 */
export class NFSeMunicipioResolver {
  /** @type {Record<string, object>} */
  static #custom = {};

  /**
   * Registra endpoint customizado para um município.
   * @param {string} codigoMunicipio IBGE 7 dígitos
   * @param {{ nome?: string, homologacao: string, producao: string, layout?: string }} config
   */
  static registrar(codigoMunicipio, config) {
    this.#custom[codigoMunicipio] = config;
  }

  /**
   * @param {string} codigoMunicipio
   * @param {number} [ambiente] 1=Produção, 2=Homologação
   */
  static resolver(codigoMunicipio, ambiente = 2) {
    const config = this.#custom[codigoMunicipio] ?? NFSE_MUNICIPIOS[codigoMunicipio];

    if (!config) {
      throw new GhinfeError(
        `Endpoint NFS-e não configurado para município ${codigoMunicipio}. Use NFSeMunicipioResolver.registrar()`,
        'NFSE_MUNICIPIO_NOT_FOUND'
      );
    }

    const url = ambiente === 1 ? config.producao : config.homologacao;
    return { url, layout: config.layout ?? 'abrasf', nome: config.nome };
  }

  /** @returns {string[]} */
  static listarMunicipios() {
    return [...new Set([...Object.keys(NFSE_MUNICIPIOS), ...Object.keys(this.#custom)])];
  }
}
