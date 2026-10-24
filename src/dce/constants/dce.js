/** Layout DC-e versão 1.00 (PL_DCe_v1.00a + NT 2024.001). */
export const DCE_VERSAO = '1.00';

/** Modelo da Declaração de Conteúdo eletrônica. */
export const DCE_MODELO = '99';

export const DCE_NAMESPACE = 'http://www.portalfiscal.inf.br/dce';

/** Tipo do emitente da DC-e (tpEmit). */
export const DCE_TIPO_EMITENTE = {
  FISCO: 0,
  MARKETPLACE: 1,
  EMISSOR_PROPRIO: 2,
  TRANSPORTADORA: 3,
  ECT: 4,
};

/** Forma de emissão (tpEmis). */
export const DCE_TIPO_EMISSAO = {
  NORMAL: 1,
  CONTINGENCIA_OFFLINE: 2,
};

/** Modalidade do transporte (modTrans). */
export const DCE_MODALIDADE_TRANSPORTE = {
  CORREIOS: 0,
  PROPRIO: 1,
  TRANSPORTADORA: 2,
};

/** Textos fixos obrigatórios do grupo infDec (Manual DC-e — Anexo I, ZA02/ZA03). */
export const DCE_DECLARACAO = {
  xObs1:
    'É contribuinte de ICMS qualquer pessoa física ou jurídica, que realize, com habitualidade ' +
    'ou em volume que caracterize intuito comercial, operações de circulação de mercadoria ou ' +
    'prestações de serviços de transportes interestadual e intermunicipal e de comunicação, ' +
    'ainda que as operações e prestações de iniciem no exterior (Lei Complementar nº 87/96, Art. 4º)',
  xObs2:
    'Constitui crime contra a ordem tributária suprimir ou reduzir tributo, ou contribuição ' +
    'social e qualquer acessório: quando negar ou deixar de fornecer, quando obrigatório, nota ' +
    'fiscal ou documento equivalente, relativa a venda de mercadoria ou prestação de serviço, ' +
    'efetivamente realizada ou fornece-la em desacordo com a legislação. Sob pena de reclusão ' +
    'de 2 (dois) e 5 (cinco) anos, e multa (Lei 8.137/90, Art 1ª, V)',
};

/** Literal exigido em xNome do destinatário em homologação (rejeição 598). */
export const DCE_NOME_DEST_HOMOLOGACAO = 'DCE EMITIDA EM AMBIENTE DE HOMOLOGACAO';

/**
 * Web services do autorizador da DC-e (SEFA-PR), que atende todas as UFs.
 * SOAP 1.2; namespace do corpo: http://www.portalfiscal.inf.br/dce/wsdl/{servico}.
 */
export const DCE_WEBSERVICES = {
  1: {
    autorizacao: 'https://dce.fazenda.pr.gov.br/dce/DCeAutorizacao',
    consulta: 'https://dce.fazenda.pr.gov.br/dce/DCeConsulta',
    status: 'https://dce.fazenda.pr.gov.br/dce/DCeStatusServico',
    evento: 'https://dce.fazenda.pr.gov.br/dce/DCeRecepcaoEvento',
  },
  2: {
    autorizacao: 'https://homologacao.dce.fazenda.pr.gov.br/dce/DCeAutorizacao',
    consulta: 'https://homologacao.dce.fazenda.pr.gov.br/dce/DCeConsulta',
    status: 'https://homologacao.dce.fazenda.pr.gov.br/dce/DCeStatusServico',
    evento: 'https://homologacao.dce.fazenda.pr.gov.br/dce/DCeRecepcaoEvento',
  },
};

/** Tipos de evento da DC-e. */
export const DCE_EVENTOS = {
  CANCELAMENTO: { codigo: '110111', descricao: 'Cancelamento' },
};

/** cStat de sucesso da DC-e. */
export const DCE_STATUS = {
  AUTORIZADO: '100',
  CANCELADO: '101',
  SERVICO_EM_OPERACAO: '107',
  EVENTO_REGISTRADO: '135',
  EVENTO_REGISTRADO_SEM_VINCULO: '136',
  CANCELAMENTO_FORA_PRAZO: '155',
};

/**
 * URL de consulta via QR Code. O autorizador da DC-e (SEFA-PR) usa o mesmo
 * endereço para produção e homologação — o ambiente vai no parâmetro tpAmb.
 */
export const DCE_QRCODE_URL = 'https://www.fazenda.pr.gov.br/dce/qrcode';
