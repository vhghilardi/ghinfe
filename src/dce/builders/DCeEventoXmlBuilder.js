import { create } from 'xmlbuilder2';
import { DCE_NAMESPACE, DCE_VERSAO, DCE_EVENTOS } from '../constants/dce.js';
import { parseChaveAcessoDCe } from '../../utils/chave.utils.js';
import { formatSefazDateTime } from '../../utils/date.utils.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');

/**
 * Monta XML de eventos da DC-e (eventoDCe, layout 1.00).
 */
export class DCeEventoXmlBuilder {
  /**
   * Evento 110111 — Cancelamento (prazo: 24h após a autorização).
   * @param {{
   *   chaveAcesso: string,
   *   protocolo: string,
   *   justificativa: string,
   *   emitente: { cnpj?: string, cpf?: string, idOutros?: string },
   *   ambiente?: number,
   *   sequencia?: number,
   *   dataEvento?: Date,
   * }} params emitente: usuário emitente da DC-e (grupo emit)
   * @returns {string}
   */
  buildCancelamento(params) {
    const justificativa = params.justificativa?.trim() ?? '';
    if (justificativa.length < 15 || justificativa.length > 255) {
      throw new GhinfeError('Justificativa deve ter entre 15 e 255 caracteres', 'DCE_JUSTIFICATIVA_INVALIDA');
    }
    if (!/^\d{15,16}$/.test(onlyDigits(params.protocolo))) {
      throw new GhinfeError('Protocolo de autorização inválido', 'DCE_PROTOCOLO_INVALIDO');
    }

    const { codigo, descricao } = DCE_EVENTOS.CANCELAMENTO;
    return this.#build(params, codigo, (det) => {
      const canc = det.ele('evCancDCe');
      canc.ele('descEvento').txt(descricao);
      canc.ele('nProt').txt(onlyDigits(params.protocolo));
      canc.ele('xJust').txt(justificativa);
    });
  }

  /**
   * @param {{ chaveAcesso: string, emitente: { cnpj?: string, cpf?: string, idOutros?: string }, ambiente?: number, sequencia?: number, dataEvento?: Date }} params
   * @param {string} tpEvento
   * @param {(det: import('xmlbuilder2').XMLBuilder) => void} buildDetalhe
   */
  #build(params, tpEvento, buildDetalhe) {
    const chave = parseChaveAcessoDCe(params.chaveAcesso ?? '');
    if (!chave.valida || chave.modelo !== '99') {
      throw new GhinfeError('chaveAcesso de DC-e inválida', 'DCE_CHAVE_INVALIDA');
    }

    const emitente = params.emitente ?? {};
    if (!emitente.cnpj && !emitente.cpf && !emitente.idOutros) {
      throw new GhinfeError(
        'emitente.cnpj, emitente.cpf ou emitente.idOutros (usuário emitente da DC-e) é obrigatório',
        'DCE_EVENTO_EMITENTE_AUSENTE'
      );
    }

    const sequencia = params.sequencia ?? 1;
    const id = `ID${tpEvento}${params.chaveAcesso}${String(sequencia).padStart(3, '0')}`;

    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('eventoDCe', {
      xmlns: DCE_NAMESPACE,
      versao: DCE_VERSAO,
    });
    const inf = root.ele('infEvento', { Id: id });
    inf.ele('cOrgao').txt(chave.cUF);
    inf.ele('tpAmb').txt(String(params.ambiente ?? 2));
    inf.ele('tpEmit').txt(String(chave.tipoEmitente));
    inf.ele('CNPJAutor').txt(chave.cnpj);
    if (emitente.cnpj) inf.ele('CNPJUsEmit').txt(onlyDigits(emitente.cnpj));
    else if (emitente.cpf) inf.ele('CPFUsEmit').txt(onlyDigits(emitente.cpf));
    else inf.ele('IdOutrosUsEmit').txt(emitente.idOutros.trim());
    inf.ele('chDCe').txt(params.chaveAcesso);
    inf.ele('dhEvento').txt(formatSefazDateTime(params.dataEvento ?? new Date()));
    inf.ele('tpEvento').txt(tpEvento);
    inf.ele('nSeqEvento').txt(String(sequencia));
    buildDetalhe(inf.ele('detEvento', { versaoEvento: DCE_VERSAO }));

    return root.end({ prettyPrint: false, headless: false });
  }
}
