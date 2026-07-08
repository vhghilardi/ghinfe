import { SEFAZ_STATUS } from '../../constants/sefaz.js';

/**
 * Respostas simuladas da SEFAZ para desenvolvimento e testes.
 * Baseadas nos cStat reais do Manual de Orientação do Contribuinte.
 */
export const SEFAZ_MOCK_RESPONSES = {
  autorizado: {
    cStat: SEFAZ_STATUS.AUTORIZADO,
    xMotivo: 'Autorizado o uso da NF-e',
    nProt: '135260000000001',
    dhRecbto: new Date().toISOString(),
  },
  loteRecebido: {
    cStat: SEFAZ_STATUS.LOTE_RECEBIDO,
    xMotivo: 'Lote recebido com sucesso',
    nRec: '135260000000001',
    tMed: '1',
  },
  rejeicaoDuplicidade: {
    cStat: SEFAZ_STATUS.REJEICAO_DUPLICIDADE,
    xMotivo: 'Rejeição: Duplicidade de NF-e',
  },
  rejeicaoSchema: {
    cStat: SEFAZ_STATUS.REJEICAO_SCHEMA,
    xMotivo: 'Rejeição: Falha no Schema XML da NFe',
  },
  rejeicaoCertificado: {
    cStat: SEFAZ_STATUS.REJEICAO_CERTIFICADO,
    xMotivo: 'Rejeição: Certificado Transmissor inválido',
  },
  servicoParalisado: {
    cStat: SEFAZ_STATUS.SERVICO_PARALISADO,
    xMotivo: 'Serviço Paralisado momentaneamente (curto prazo)',
  },
  eventoRegistrado: {
    cStat: SEFAZ_STATUS.EVENTO_REGISTRADO,
    xMotivo: 'Evento registrado e vinculado a NF-e',
    nProt: '135260000000002',
  },
  eventoRejeitado: {
    cStat: SEFAZ_STATUS.EVENTO_REJEICAO,
    xMotivo: 'Rejeição: Chave de Acesso inexistente',
  },
  statusOk: {
    cStat: '107',
    xMotivo: 'Serviço em Operação',
    tMed: '1',
  },
  statusParalisado: {
    cStat: SEFAZ_STATUS.SERVICO_PARALISADO,
    xMotivo: 'Serviço Paralisado momentaneamente (curto prazo)',
    tMed: '5',
  },
};

/**
 * Gera XML de retorno de autorização simulado (protNFe).
 * @param {string} chaveAcesso
 * @param {{ cStat: string, xMotivo: string, nProt?: string }} resultado
 * @returns {string}
 */
export function buildMockProtNFeXml(chaveAcesso, resultado) {
  const nProt = resultado.nProt ?? '';
  const dhRecbto = new Date().toISOString().replace('Z', '-03:00');

  return `<?xml version="1.0" encoding="UTF-8"?>
<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>2</tpAmb>
  <verAplic>MOCK_GHINFE_1.0</verAplic>
  <cStat>${resultado.cStat}</cStat>
  <xMotivo>${resultado.xMotivo}</xMotivo>
  <cUF>35</cUF>
  <dhRecbto>${dhRecbto}</dhRecbto>
  ${
    resultado.cStat === SEFAZ_STATUS.AUTORIZADO
      ? `<protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>MOCK_GHINFE_1.0</verAplic>
      <chNFe>${chaveAcesso}</chNFe>
      <dhRecbto>${dhRecbto}</dhRecbto>
      <nProt>${nProt}</nProt>
      <digVal>mock-digest-value</digVal>
      <cStat>${resultado.cStat}</cStat>
      <xMotivo>${resultado.xMotivo}</xMotivo>
    </infProt>
  </protNFe>`
      : ''
  }
</retEnviNFe>`;
}

/**
 * Gera envelope SOAP de retorno simulado.
 * @param {string} innerXml
 * @returns {string}
 */
export function wrapSoapResponse(innerXml) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      ${innerXml}
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Gera XML de retorno de evento simulado (retEnvEvento).
 * @param {string} chaveAcesso
 * @param {string} tpEvento
 * @param {{ cStat: string, xMotivo: string, nProt?: string }} resultado
 * @returns {string}
 */
export function buildMockRetEnvEventoXml(chaveAcesso, tpEvento, resultado) {
  const dhReg = new Date().toISOString().replace('Z', '-03:00');
  const loteOk = resultado.cStat === SEFAZ_STATUS.EVENTO_REGISTRADO;

  return `<?xml version="1.0" encoding="UTF-8"?>
<retEnvEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <idLote>1</idLote>
  <tpAmb>2</tpAmb>
  <verAplic>MOCK_GHINFE_1.0</verAplic>
  <cStat>${loteOk ? SEFAZ_STATUS.EVENTO_LOTE_PROCESSADO : '104'}</cStat>
  <xMotivo>${loteOk ? 'Lote de evento processado' : resultado.xMotivo}</xMotivo>
  ${
    loteOk
      ? `<retEvento versao="1.00">
    <infEvento>
      <tpAmb>2</tpAmb>
      <verAplic>MOCK_GHINFE_1.0</verAplic>
      <cOrgao>35</cOrgao>
      <cStat>${resultado.cStat}</cStat>
      <xMotivo>${resultado.xMotivo}</xMotivo>
      <chNFe>${chaveAcesso}</chNFe>
      <tpEvento>${tpEvento}</tpEvento>
      <nSeqEvento>1</nSeqEvento>
      <dhRegEvento>${dhReg}</dhRegEvento>
      <nProt>${resultado.nProt ?? '135260000000002'}</nProt>
    </infEvento>
  </retEvento>`
      : ''
  }
</retEnvEvento>`;
}

/**
 * @param {string} innerXml
 * @returns {string}
 */
export function wrapSoapEventoResponse(innerXml) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      ${innerXml}
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * XML de retorno de status do serviço (retConsStatServ).
 * @param {{ cStat: string, xMotivo: string, tMed?: string }} resultado
 * @param {string} [cUF]
 */
export function buildMockRetConsStatServXml(resultado, cUF = '35') {
  const dh = new Date().toISOString().replace('Z', '-03:00');
  return `<?xml version="1.0" encoding="UTF-8"?>
<retConsStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>2</tpAmb>
  <verAplic>MOCK_GHINFE_1.0</verAplic>
  <cStat>${resultado.cStat}</cStat>
  <xMotivo>${resultado.xMotivo}</xMotivo>
  <cUF>${cUF}</cUF>
  <dhRecbto>${dh}</dhRecbto>
  <tMed>${resultado.tMed ?? '1'}</tMed>
</retConsStatServ>`;
}

/**
 * @param {string} innerXml
 */
export function wrapSoapStatusResponse(innerXml) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      ${innerXml}
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;
}
