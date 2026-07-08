/** Layouts NFS-e suportados pela biblioteca. */
export const NFSE_LAYOUTS = {
  ABRASF: 'abrasf',
  GINFES: 'ginfes',
  BETHA: 'betha',
  ISSNET: 'issnet',
};

/** Layout ABRASF 2.04 — padrão mais adotado pelos municípios. */
export const NFSE_LAYOUT = '2.04';
export const NFSE_NAMESPACE = 'http://www.abrasf.org.br/nfse.xsd';
export const GINFES_NAMESPACE = 'http://www.ginfes.com.br/servico_enviar_lote_rps_envio';
export const BETHA_NAMESPACE = 'http://www.betha.com.br/e-nota-contribuinte-ws';
export const ISSNET_NAMESPACE = 'http://www.issnetonline.com.br/webserviceabrasf/vsd/servico_enviar_lote_rps_envio.xsd';

/**
 * Endpoints NFS-e por município (IBGE).
 * layout: abrasf | ginfes | betha | issnet
 * URLs são exemplos — valide com a prefeitura / provedor.
 */
export const NFSE_MUNICIPIOS = {
  '3550308': {
    nome: 'São Paulo/SP',
    layout: NFSE_LAYOUTS.ABRASF,
    homologacao: 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx',
    producao: 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx',
  },
  '3304557': {
    nome: 'Rio de Janeiro/RJ',
    layout: NFSE_LAYOUTS.ABRASF,
    homologacao: 'https://notacarioca.rio.gov.br/WSNacional/nfse.asmx',
    producao: 'https://notacarioca.rio.gov.br/WSNacional/nfse.asmx',
  },
  '3106200': {
    nome: 'Belo Horizonte/MG',
    layout: NFSE_LAYOUTS.ABRASF,
    homologacao: 'https://bhissdigital.pbh.gov.br/bhiss-ws/nfse',
    producao: 'https://bhissdigital.pbh.gov.br/bhiss-ws/nfse',
  },
  '4106902': {
    nome: 'Curitiba/PR',
    layout: NFSE_LAYOUTS.ABRASF,
    homologacao: 'https://isscuritiba.curitiba.pr.gov.br/Iss.NfseWebService/NfseService.svc',
    producao: 'https://isscuritiba.curitiba.pr.gov.br/Iss.NfseWebService/NfseService.svc',
  },
  '4314902': {
    nome: 'Porto Alegre/RS',
    layout: NFSE_LAYOUTS.BETHA,
    homologacao: 'https://e-gov.betha.com.br/e-nota-contribuinte-ws/nfseWS',
    producao: 'https://e-gov.betha.com.br/e-nota-contribuinte-ws/nfseWS',
  },
  '4205407': {
    nome: 'Florianópolis/SC',
    layout: NFSE_LAYOUTS.BETHA,
    homologacao: 'https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/nfseWS',
    producao: 'https://e-gov.betha.com.br/e-nota-contribuinte-ws/nfseWS',
  },
  '2927408': {
    nome: 'Salvador/BA',
    layout: NFSE_LAYOUTS.GINFES,
    homologacao: 'https://homologacao.ginfes.com.br/ServiceGinfesImpl',
    producao: 'https://producao.ginfes.com.br/ServiceGinfesImpl',
  },
  '2611606': {
    nome: 'Recife/PE',
    layout: NFSE_LAYOUTS.ISSNET,
    homologacao: 'https://www.issnetonline.com.br/webserviceabrasf/homologacao/servicos.asmx',
    producao: 'https://www.issnetonline.com.br/webserviceabrasf/producao/servicos.asmx',
  },
  '2304400': {
    nome: 'Fortaleza/CE',
    layout: NFSE_LAYOUTS.ISSNET,
    homologacao: 'https://iss.fortaleza.ce.gov.br/group/guest/nfe',
    producao: 'https://iss.fortaleza.ce.gov.br/group/guest/nfe',
  },
  mock: {
    nome: 'Mock GHINFE',
    layout: NFSE_LAYOUTS.ABRASF,
    homologacao: 'http://localhost/mock/nfse',
    producao: 'http://localhost/mock/nfse',
  },
};
