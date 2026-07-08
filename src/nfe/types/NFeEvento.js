/** Tipos de evento NF-e conforme tabela SEFAZ. */
export const NFE_EVENTOS = {
  CARTA_CORRECAO: '110110',
  CANCELAMENTO: '110111',
  CIENCIA_OPERACAO: '210210',
  CONFIRMACAO_OPERACAO: '210200',
  DESCONHECIMENTO_OPERACAO: '210220',
  OPERACAO_NAO_REALIZADA: '210240',
};

/** Texto fixo exigido na CC-e. */
export const CCE_COND_USO =
  'A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, ' +
  'de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido ' +
  'na emissao de documento fiscal, desde que o erro nao esteja relacionado com: ' +
  'I - as variaveis que determinam o valor do imposto tais como: base de calculo, ' +
  'aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; ' +
  'II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; ' +
  'III - a data de emissao ou de saida.';

/**
 * @typedef {Object} NFeEventoBase
 * @property {string} chaveAcesso Chave da NF-e (44 dígitos)
 * @property {string} cnpj CNPJ do autor do evento
 * @property {string} uf Sigla UF
 * @property {number} [ambiente] 1=Produção, 2=Homologação
 * @property {number} [sequencia] nSeqEvento (default 1)
 * @property {string} [idLote] ID do lote de eventos
 */

/**
 * @typedef {NFeEventoBase & {
 *   protocolo: string,
 *   justificativa: string,
 * }} NFeCancelamento
 */

/**
 * @typedef {NFeEventoBase & {
 *   correcao: string,
 * }} NFeCartaCorrecao
 */

export {};
