/**
 * Mapeamento UF → autorizador SEFAZ (NF-e/NFC-e).
 * Fonte: Manual de Orientação do Contribuinte / tabela de autorizadores.
 */
export const UF_AUTORIZADOR = {
  AC: 'SVRS', AL: 'SVRS', AM: 'AM', AP: 'SVRS', BA: 'BA',
  CE: 'SVRS', DF: 'SVRS', ES: 'SVRS', GO: 'GO', MA: 'SVAN',
  MG: 'MG', MS: 'MS', MT: 'MT', PA: 'SVAN', PB: 'SVRS',
  PE: 'PE', PI: 'SVRS', PR: 'PR', RJ: 'SVRS', RN: 'SVRS',
  RO: 'SVRS', RR: 'SVRS', RS: 'RS', SC: 'SVRS', SE: 'SVRS',
  SP: 'SP', TO: 'SVRS',
};

/** Tipos de webservice SEFAZ. */
export const SEFAZ_SERVICO = {
  AUTORIZACAO: 'autorizacao',
  RET_AUTORIZACAO: 'retAutorizacao',
  CONSULTA: 'consulta',
  EVENTO: 'evento',
  INUTILIZACAO: 'inutilizacao',
  STATUS: 'status',
};

/**
 * Endpoints por autorizador e ambiente.
 * ambiente: 1=Produção, 2=Homologação
 */
export const AUTORIZADOR_ENDPOINTS = {
  SVRS: {
    1: {
      autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      consulta: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      evento: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/ReceptionEvent4.asmx',
      inutilizacao: 'https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
      status: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    },
    2: {
      autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      consulta: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      evento: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/ReceptionEvent4.asmx',
      inutilizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
      status: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    },
  },
  SVAN: {
    1: {
      autorizacao: 'https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://www.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
      consulta: 'https://www.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
      evento: 'https://www.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
      inutilizacao: 'https://www.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx',
      status: 'https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    },
    2: {
      autorizacao: 'https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://hom.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
      consulta: 'https://hom.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
      evento: 'https://hom.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
      inutilizacao: 'https://hom.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx',
      status: 'https://hom.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    },
  },
  SP: {
    1: {
      autorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      retAutorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
      consulta: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
      evento: 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
      inutilizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
      status: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
    },
    2: {
      autorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      retAutorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
      consulta: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
      evento: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
      inutilizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
      status: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
    },
  },
  MG: {
    1: {
      autorizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
      retAutorizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
      consulta: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
      evento: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4',
      inutilizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4',
      status: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    },
    2: {
      autorizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
      retAutorizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
      consulta: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
      evento: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4',
      inutilizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4',
      status: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    },
  },
  PR: {
    1: {
      autorizacao: 'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
      retAutorizacao: 'https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4',
      consulta: 'https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
      evento: 'https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4',
      inutilizacao: 'https://nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4',
      status: 'https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    },
    2: {
      autorizacao: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
      retAutorizacao: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4',
      consulta: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
      evento: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4',
      inutilizacao: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4',
      status: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    },
  },
  RS: {
    1: {
      autorizacao: 'https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      consulta: 'https://nfe.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      evento: 'https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/ReceptionEvent4.asmx',
      inutilizacao: 'https://nfe.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
      status: 'https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    },
    2: {
      autorizacao: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      consulta: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      evento: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/ReceptionEvent4.asmx',
      inutilizacao: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
      status: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    },
  },
  MS: {
    1: {
      autorizacao: 'https://nfe.sefaz.ms.gov.br/ws/NfeAutorizacao4',
      evento: 'https://nfe.sefaz.ms.gov.br/ws/NfeRecepcaoEvento4',
      consulta: 'https://nfe.sefaz.ms.gov.br/ws/NfeConsulta4',
      status: 'https://nfe.sefaz.ms.gov.br/ws/NfeStatusServico4',
    },
    2: {
      autorizacao: 'https://homologacao.nfe.ms.gov.br/ws/NfeAutorizacao4',
      evento: 'https://homologacao.nfe.ms.gov.br/ws/NfeRecepcaoEvento4',
      consulta: 'https://homologacao.nfe.ms.gov.br/ws/NfeConsulta4',
      status: 'https://homologacao.nfe.ms.gov.br/ws/NfeStatusServico4',
    },
  },
  MT: {
    1: {
      autorizacao: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4',
      evento: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4',
      consulta: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4',
    },
    2: {
      autorizacao: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4',
      evento: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4',
      consulta: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4',
    },
  },
  GO: {
    1: {
      autorizacao: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4',
      evento: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4',
      consulta: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4',
    },
    2: {
      autorizacao: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4',
      evento: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4',
      consulta: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4',
    },
  },
  AM: {
    1: {
      autorizacao: 'https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4',
      evento: 'https://nfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4',
    },
    2: {
      autorizacao: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4',
      evento: 'https://homnfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4',
    },
  },
  BA: {
    1: {
      autorizacao: 'https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx',
      evento: 'https://nfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    },
    2: {
      autorizacao: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx',
      evento: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    },
  },
  PE: {
    1: {
      autorizacao: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4',
      evento: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4',
    },
    2: {
      autorizacao: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4',
      evento: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4',
    },
  },
};
