import { create } from 'xmlbuilder2';
import { UF_IBGE } from '../../constants/sefaz.js';
import { NFE_EVENTOS, CCE_COND_USO } from '../types/NFeEvento.js';
import { formatSefazDateTime } from '../../utils/date.utils.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

const VERSAO_EVENTO = '1.00';

/**
 * Monta XML de eventos NF-e (cancelamento, CC-e, etc.).
 */
export class NFeEventoXmlBuilder {
  /**
   * @param {import('../types/NFeEvento.js').NFeCancelamento} dados
   * @returns {string}
   */
  buildCancelamento(dados) {
    this.#validarBase(dados);
    if (!dados.protocolo) {
      throw new GhinfeError('protocolo é obrigatório para cancelamento', 'CANCEL_PROTOCOLO_REQUIRED');
    }
    if (!dados.justificativa || dados.justificativa.trim().length < 15) {
      throw new GhinfeError(
        'justificativa deve ter no mínimo 15 caracteres',
        'CANCEL_JUSTIFICATIVA_MIN'
      );
    }

    return this.#buildEvento(dados, NFE_EVENTOS.CANCELAMENTO, (det) => {
      det.ele('descEvento').txt('Cancelamento').up();
      det.ele('nProt').txt(dados.protocolo).up();
      det.ele('xJust').txt(dados.justificativa.trim()).up();
    });
  }

  /**
   * @param {import('../types/NFeEvento.js').NFeCartaCorrecao} dados
   * @returns {string}
   */
  buildCartaCorrecao(dados) {
    this.#validarBase(dados);
    if (!dados.correcao || dados.correcao.trim().length < 15) {
      throw new GhinfeError(
        'correcao deve ter no mínimo 15 caracteres',
        'CCE_TEXTO_MIN'
      );
    }
    if (dados.correcao.length > 1000) {
      throw new GhinfeError('correcao não pode exceder 1000 caracteres', 'CCE_TEXTO_MAX');
    }

    return this.#buildEvento(dados, NFE_EVENTOS.CARTA_CORRECAO, (det) => {
      det.ele('descEvento').txt('Carta de Correcao').up();
      det.ele('xCorrecao').txt(dados.correcao.trim()).up();
      det.ele('xCondUso').txt(CCE_COND_USO).up();
    });
  }

  /**
   * @param {import('../types/NFeEvento.js').NFeEventoBase} dados
   * @param {string} tpEvento
   * @param {(det: import('xmlbuilder2').XMLBuilder) => void} buildDetEvento
   */
  #buildEvento(dados, tpEvento, buildDetEvento) {
    const sequencia = dados.sequencia ?? 1;
    const idLote = dados.idLote ?? '1';
    const cOrgao = UF_IBGE[dados.uf.toUpperCase()] ?? '35';
    const dhEvento = formatSefazDateTime();
    const idInfEvento = `ID${tpEvento}${dados.chaveAcesso}${String(sequencia).padStart(2, '0')}`;

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('envEvento', { xmlns: 'http://www.portalfiscal.inf.br/nfe', versao: VERSAO_EVENTO })
      .ele('idLote').txt(idLote).up();

    const evento = root.ele('evento', { versao: VERSAO_EVENTO });
    const infEvento = evento.ele('infEvento', { Id: idInfEvento });

    infEvento
      .ele('cOrgao').txt(cOrgao).up()
      .ele('tpAmb').txt(String(dados.ambiente ?? 2)).up()
      .ele('CNPJ').txt(dados.cnpj.replace(/\D/g, '')).up()
      .ele('chNFe').txt(dados.chaveAcesso).up()
      .ele('dhEvento').txt(dhEvento).up()
      .ele('tpEvento').txt(tpEvento).up()
      .ele('nSeqEvento').txt(String(sequencia)).up()
      .ele('verEvento').txt(VERSAO_EVENTO).up();

    const detEvento = infEvento.ele('detEvento', { versao: VERSAO_EVENTO });
    buildDetEvento(detEvento);
    detEvento.up();
    infEvento.up();
    evento.up();

    return root.end({ prettyPrint: false, headless: false });
  }

  /** @param {import('../types/NFeEvento.js').NFeEventoBase} dados */
  #validarBase(dados) {
    const chave = dados.chaveAcesso?.replace(/\D/g, '');
    if (!chave || chave.length !== 44) {
      throw new GhinfeError('chaveAcesso deve conter 44 dígitos', 'INVALID_CHAVE');
    }
    if (!dados.cnpj) {
      throw new GhinfeError('cnpj do autor do evento é obrigatório', 'INVALID_CNPJ');
    }
    if (!dados.uf) {
      throw new GhinfeError('uf é obrigatória', 'INVALID_UF');
    }
  }
}
