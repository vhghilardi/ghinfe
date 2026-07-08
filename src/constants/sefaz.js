/** Códigos de UF conforme tabela IBGE (últimos 2 dígitos da chave NF-e). */
export const UF_IBGE = {
  AC: '12',
  AL: '27',
  AM: '13',
  AP: '16',
  BA: '29',
  CE: '23',
  DF: '53',
  ES: '32',
  GO: '52',
  MA: '21',
  MG: '31',
  MS: '50',
  MT: '51',
  PA: '15',
  PB: '25',
  PE: '26',
  PI: '22',
  PR: '41',
  RJ: '33',
  RN: '24',
  RO: '11',
  RR: '14',
  RS: '43',
  SC: '42',
  SE: '28',
  SP: '35',
  TO: '17',
};

/** 1 = Produção, 2 = Homologação. */
export const AMBIENTE = {
  PRODUCAO: 1,
  HOMOLOGACAO: 2,
};

/** Layout NF-e versão 4.00. */
export const NFE_VERSAO = '4.00';

/** Endpoints SEFAZ (homologação) — variam por UF; use como referência. */
export const SEFAZ_URLS = {
  SP: {
    autorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
    retAutorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
    consulta: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
    evento: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
  },
};

/** cStat mais comuns retornados pela SEFAZ. */
export const SEFAZ_STATUS = {
  AUTORIZADO: '100',
  CANCELADO: '101',
  LOTE_RECEBIDO: '103',
  LOTE_PROCESSADO: '104',
  LOTE_EM_PROCESSAMENTO: '105',
  SERVICO_EM_OPERACAO: '107',
  SERVICO_PARALISADO: '108',
  SERVICO_PARALISADO_SEM_PREVISAO: '109',
  USO_DENEGADO: '110',
  REJEICAO_DUPLICIDADE: '204',
  REJEICAO_CHAVE_INVALIDA: '236',
  REJEICAO_CERTIFICADO: '280',
  REJEICAO_SCHEMA: '225',
  EVENTO_REGISTRADO: '135',
  EVENTO_LOTE_PROCESSADO: '128',
  EVENTO_REJEICAO: '491',
};
