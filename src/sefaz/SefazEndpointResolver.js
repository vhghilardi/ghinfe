import { UF_AUTORIZADOR, AUTORIZADOR_ENDPOINTS, SEFAZ_SERVICO } from './endpoints.registry.js';
import { GhinfeError } from '../errors/GhinfeError.js';

/**
 * Resolve endpoints SEFAZ por UF, ambiente e tipo de serviço.
 * Elimina necessidade de configurar URLs manualmente em produção.
 */
export class SefazEndpointResolver {
  /**
   * @param {string} uf Sigla da UF (ex: "SP")
   * @returns {string} Código do autorizador (ex: "SVRS", "SP")
   */
  static obterAutorizador(uf) {
    const autorizador = UF_AUTORIZADOR[uf?.toUpperCase()];
    if (!autorizador) {
      throw new GhinfeError(`UF não mapeada para autorizador SEFAZ: ${uf}`, 'UF_AUTORIZADOR_NOT_FOUND');
    }
    return autorizador;
  }

  /**
   * @param {string} uf
   * @param {number} [ambiente] 1=Produção, 2=Homologação
   * @returns {Record<string, string>}
   */
  static obterEndpoints(uf, ambiente = 2) {
    const autorizador = this.obterAutorizador(uf);
    const endpoints = AUTORIZADOR_ENDPOINTS[autorizador]?.[ambiente];

    if (!endpoints) {
      throw new GhinfeError(
        `Endpoints não configurados para autorizador ${autorizador} ambiente ${ambiente}`,
        'SEFAZ_ENDPOINTS_NOT_FOUND'
      );
    }

    return { autorizador, ambiente, endpoints };
  }

  /**
   * @param {{
   *   uf: string,
   *   ambiente?: number,
   *   servico?: string,
   *   modelo?: '55'|'65',
   * }} params
   * @returns {string}
   */
  static resolver(params) {
    const { endpoints } = this.obterEndpoints(params.uf, params.ambiente ?? 2);
    const servico = params.servico ?? SEFAZ_SERVICO.AUTORIZACAO;
    const url = endpoints[servico];

    if (!url) {
      throw new GhinfeError(
        `Serviço "${servico}" não disponível para UF ${params.uf} (autorizador ${this.obterAutorizador(params.uf)})`,
        'SEFAZ_SERVICO_NOT_FOUND',
        { servico, uf: params.uf, modelo: params.modelo }
      );
    }

    return url;
  }

  /**
   * Configuração pronta para NFeSoapService.
   * @param {string} uf
   * @param {number} [ambiente]
   */
  static paraNFe(uf, ambiente = 2) {
    return {
      endpoint: this.resolver({ uf, ambiente, servico: SEFAZ_SERVICO.AUTORIZACAO, modelo: '55' }),
      eventoEndpoint: this.resolver({ uf, ambiente, servico: SEFAZ_SERVICO.EVENTO, modelo: '55' }),
    };
  }

  /**
   * NFC-e usa os mesmos webservices de autorização na maioria dos estados.
   * @param {string} uf
   * @param {number} [ambiente]
   */
  static paraNFCe(uf, ambiente = 2) {
    return {
      endpoint: this.resolver({ uf, ambiente, servico: SEFAZ_SERVICO.AUTORIZACAO, modelo: '65' }),
      eventoEndpoint: this.resolver({ uf, ambiente, servico: SEFAZ_SERVICO.EVENTO, modelo: '65' }),
    };
  }

  /** @returns {string[]} */
  static listarUFs() {
    return Object.keys(UF_AUTORIZADOR);
  }
}

export { SEFAZ_SERVICO };
