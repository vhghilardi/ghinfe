/**
 * Respostas mock NFS-e para desenvolvimento.
 */
export const NFSE_MOCK_RESPONSES = {
  autorizada: {
    sucesso: true,
    codigo: 'E000',
    mensagem: 'NFS-e autorizada com sucesso',
    numeroNfse: '2026000001',
    codigoVerificacao: 'ABC1-DEF2',
  },
  rejeicao: {
    sucesso: false,
    codigo: 'E001',
    mensagem: 'Rejeição: RPS já convertido em NFS-e',
  },
  cancelada: {
    sucesso: true,
    codigo: 'E000',
    mensagem: 'NFS-e cancelada com sucesso',
    numeroNfse: '2026000001',
  },
  substituida: {
    sucesso: true,
    codigo: 'E000',
    mensagem: 'NFS-e substituída com sucesso',
    numeroNfse: '2026000002',
    codigoVerificacao: 'XYZ9-SUB1',
    numeroNfseSubstituida: '2026000001',
  },
};

/**
 * @param {string} numeroRps
 * @param {{ codigo: string, mensagem: string, numeroNfse?: string, codigoVerificacao?: string }} resultado
 */
export function buildMockGerarNfseResponse(numeroRps, resultado) {
  const dh = new Date().toISOString();

  if (resultado.codigo === 'E000') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<GerarNfseResposta xmlns="http://www.abrasf.org.br/nfse.xsd">
  <ListaNfse>
    <CompNfse>
      <Nfse versao="2.04">
        <InfNfse Id="NFS${resultado.numeroNfse}">
          <Numero>${resultado.numeroNfse}</Numero>
          <CodigoVerificacao>${resultado.codigoVerificacao}</CodigoVerificacao>
          <DataEmissao>${dh}</DataEmissao>
          <IdentificacaoRps>
            <Numero>${numeroRps}</Numero>
            <Serie>NF</Serie>
            <Tipo>1</Tipo>
          </IdentificacaoRps>
        </InfNfse>
      </Nfse>
    </CompNfse>
  </ListaNfse>
</GerarNfseResposta>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<GerarNfseResposta xmlns="http://www.abrasf.org.br/nfse.xsd">
  <ListaMensagemRetorno>
    <MensagemRetorno>
      <Codigo>${resultado.codigo}</Codigo>
      <Mensagem>${resultado.mensagem}</Mensagem>
    </MensagemRetorno>
  </ListaMensagemRetorno>
</GerarNfseResposta>`;
}

/**
 * @param {string} numeroNfse
 * @param {{ codigo: string, mensagem: string }} resultado
 */
export function buildMockCancelarNfseResponse(numeroNfse, resultado) {
  const dh = new Date().toISOString();
  if (resultado.codigo === 'E000') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<CancelarNfseResposta xmlns="http://www.abrasf.org.br/nfse.xsd">
  <RetCancelamento>
    <NfseCancelamento>
      <Confirmacao>
        <Pedido>
          <InfPedidoCancelamento>
            <IdentificacaoNfse>
              <Numero>${numeroNfse}</Numero>
            </IdentificacaoNfse>
          </InfPedidoCancelamento>
        </Pedido>
        <DataHora>${dh}</DataHora>
      </Confirmacao>
    </NfseCancelamento>
  </RetCancelamento>
</CancelarNfseResposta>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<CancelarNfseResposta xmlns="http://www.abrasf.org.br/nfse.xsd">
  <ListaMensagemRetorno>
    <MensagemRetorno>
      <Codigo>${resultado.codigo}</Codigo>
      <Mensagem>${resultado.mensagem}</Mensagem>
    </MensagemRetorno>
  </ListaMensagemRetorno>
</CancelarNfseResposta>`;
}

/**
 * @param {{ codigo: string, mensagem: string, numeroNfse?: string, codigoVerificacao?: string, numeroNfseSubstituida?: string }} resultado
 */
export function buildMockSubstituirNfseResponse(resultado) {
  const dh = new Date().toISOString();
  if (resultado.codigo === 'E000') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<SubstituirNfseResposta xmlns="http://www.abrasf.org.br/nfse.xsd">
  <RetSubstituicao>
    <NfseSubstituida>
      <InfNfse>
        <Numero>${resultado.numeroNfseSubstituida ?? '2026000001'}</Numero>
      </InfNfse>
    </NfseSubstituida>
    <NfseSubstituidora>
      <InfNfse Id="NFS${resultado.numeroNfse}">
        <Numero>${resultado.numeroNfse}</Numero>
        <CodigoVerificacao>${resultado.codigoVerificacao}</CodigoVerificacao>
        <DataEmissao>${dh}</DataEmissao>
      </InfNfse>
    </NfseSubstituidora>
  </RetSubstituicao>
</SubstituirNfseResposta>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<SubstituirNfseResposta xmlns="http://www.abrasf.org.br/nfse.xsd">
  <ListaMensagemRetorno>
    <MensagemRetorno>
      <Codigo>${resultado.codigo}</Codigo>
      <Mensagem>${resultado.mensagem}</Mensagem>
    </MensagemRetorno>
  </ListaMensagemRetorno>
</SubstituirNfseResposta>`;
}
