import { create } from 'xmlbuilder2';
import {
  NFSE_NAMESPACE,
  GINFES_NAMESPACE,
  BETHA_NAMESPACE,
  ISSNET_NAMESPACE,
  NFSE_LAYOUTS,
} from '../constants/municipios.js';
import { formatSefazDateTime } from '../../utils/date.utils.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

/**
 * Monta o bloco InfRps / InfDeclaracaoPrestacaoServico comum aos layouts.
 * @param {import('xmlbuilder2').XMLBuilder} parent
 * @param {import('../types/NFSeDocument.js').NFSeDocumento} documento
 * @param {string} idAttr
 */
function appendInfRps(parent, documento, idAttr = 'InfRps') {
  const dataEmissao = formatSefazDateTime();
  const idRps = `RPS${documento.numero}`;
  const valorServicos = documento.servico.valorServicos;
  const valorIss = documento.servico.valorIss ?? 0;
  const baseCalculo = valorServicos - (documento.servico.valorDeducoes ?? 0);
  const valorLiquido =
    valorServicos -
    (documento.servico.descontoIncondicionado ?? 0) -
    (documento.servico.descontoCondicionado ?? 0);

  const inf = parent.ele(idAttr, { Id: idRps });

  const idRpsNode = inf.ele('IdentificacaoRps');
  idRpsNode.ele('Numero').txt(String(documento.numero)).up();
  idRpsNode.ele('Serie').txt(documento.serie ?? 'NF').up();
  idRpsNode.ele('Tipo').txt(String(documento.tipo ?? 1)).up();
  idRpsNode.up();

  inf
    .ele('DataEmissao').txt(dataEmissao).up()
    .ele('NaturezaOperacao').txt(String(documento.naturezaOperacao ?? 1)).up()
    .ele('OptanteSimplesNacional').txt(String(documento.optanteSimplesNacional ?? 1)).up()
    .ele('IncentivadorCultural').txt(String(documento.incentivadorCultural ?? 2)).up()
    .ele('Status').txt('1').up();

  const servico = inf.ele('Servico');
  const valores = servico.ele('Valores');
  valores
    .ele('ValorServicos').txt(dec(valorServicos)).up()
    .ele('ValorDeducoes').txt(dec(documento.servico.valorDeducoes ?? 0)).up()
    .ele('ValorPis').txt(dec(documento.servico.valorPis ?? 0)).up()
    .ele('ValorCofins').txt(dec(documento.servico.valorCofins ?? 0)).up()
    .ele('ValorInss').txt(dec(documento.servico.valorInss ?? 0)).up()
    .ele('ValorIr').txt(dec(documento.servico.valorIr ?? 0)).up()
    .ele('ValorCsll').txt(dec(documento.servico.valorCsll ?? 0)).up()
    .ele('IssRetido').txt(String(documento.servico.issRetido ?? 2)).up()
    .ele('ValorIss').txt(dec(valorIss)).up()
    .ele('BaseCalculo').txt(dec(baseCalculo)).up()
    .ele('Aliquota').txt(dec(documento.servico.aliquotaIss ?? 0, 4)).up()
    .ele('ValorLiquidoNfse').txt(dec(valorLiquido)).up()
    .ele('DescontoIncondicionado').txt(dec(documento.servico.descontoIncondicionado ?? 0)).up()
    .ele('DescontoCondicionado').txt(dec(documento.servico.descontoCondicionado ?? 0)).up();
  valores.up();

  servico
    .ele('ItemListaServico').txt(documento.servico.itemListaServico).up()
    .ele('Discriminacao').txt(documento.servico.discriminacao).up()
    .ele('CodigoMunicipio').txt(documento.servico.codigoMunicipio).up();
  servico.up();

  const prestador = inf.ele('Prestador');
  prestador
    .ele('Cnpj').txt(documento.cnpjPrestador.replace(/\D/g, '')).up()
    .ele('InscricaoMunicipal').txt(documento.inscricaoMunicipal).up();
  prestador.up();

  const tomador = inf.ele('Tomador');
  const identTomador = tomador.ele('IdentificacaoTomador').ele('CpfCnpj');
  const docTomador = (documento.tomador.cnpj ?? documento.tomador.cpf ?? '').replace(/\D/g, '');
  if (docTomador.length === 14) identTomador.ele('Cnpj').txt(docTomador).up();
  else if (docTomador.length === 11) identTomador.ele('Cpf').txt(docTomador).up();
  identTomador.up().up();
  tomador.ele('RazaoSocial').txt(documento.tomador.razaoSocial).up();

  if (documento.tomador.endereco) {
    const end = tomador.ele('Endereco');
    const e = documento.tomador.endereco;
    end.ele('Endereco').txt(e.logradouro).up();
    end.ele('Numero').txt(e.numero).up();
    if (e.complemento) end.ele('Complemento').txt(e.complemento).up();
    end.ele('Bairro').txt(e.bairro).up();
    end.ele('CodigoMunicipio').txt(e.codigoMunicipio).up();
    end.ele('Uf').txt(e.uf).up();
    end.ele('Cep').txt(e.cep.replace(/\D/g, '')).up();
    end.up();
  }

  if (documento.tomador.email) {
    tomador.ele('Contato').ele('Email').txt(documento.tomador.email).up().up();
  }
  tomador.up();

  if (documento.informacoesComplementares) {
    inf.ele('Observacao').txt(documento.informacoesComplementares).up();
  }

  return inf;
}

/** @param {number} v @param {number} [d] */
function dec(v, d = 2) {
  return Number(v).toFixed(d);
}

/**
 * @param {import('../types/NFSeDocument.js').NFSeDocumento} documento
 */
function validarDocumento(documento) {
  if (!documento.numero) throw new GhinfeError('numero do RPS é obrigatório', 'NFSE_NUMERO_REQUIRED');
  if (!documento.cnpjPrestador) throw new GhinfeError('cnpjPrestador é obrigatório', 'NFSE_CNPJ_REQUIRED');
  if (!documento.inscricaoMunicipal) throw new GhinfeError('inscricaoMunicipal é obrigatória', 'NFSE_IM_REQUIRED');
  if (!documento.servico) throw new GhinfeError('servico é obrigatório', 'NFSE_SERVICO_REQUIRED');
  if (!documento.tomador) throw new GhinfeError('tomador é obrigatório', 'NFSE_TOMADOR_REQUIRED');
}

/**
 * Adapters de layout municipal.
 * Mantêm o mesmo objeto de domínio e trocam o wrapper/namespace XML.
 */
export const NFSeLayoutAdapters = {
  [NFSE_LAYOUTS.ABRASF]: {
    nome: 'ABRASF 2.04',
    build(documento) {
      validarDocumento(documento);
      const doc = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('GerarNfseEnvio', { xmlns: NFSE_NAMESPACE });
      const rps = doc.ele('Rps');
      appendInfRps(rps, documento, 'InfRps');
      return doc.end({ prettyPrint: false, headless: false });
    },
  },

  [NFSE_LAYOUTS.GINFES]: {
    nome: 'GINFES',
    build(documento) {
      validarDocumento(documento);
      const doc = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('EnviarLoteRpsEnvio', { xmlns: GINFES_NAMESPACE });
      const lote = doc.ele('LoteRps', { Id: `Lote${documento.numero}`, versao: '3.00' });
      lote.ele('NumeroLote').txt(String(documento.numero)).up();
      lote.ele('Cnpj').txt(documento.cnpjPrestador.replace(/\D/g, '')).up();
      lote.ele('InscricaoMunicipal').txt(documento.inscricaoMunicipal).up();
      lote.ele('QuantidadeRps').txt('1').up();
      const lista = lote.ele('ListaRps').ele('Rps');
      appendInfRps(lista, documento, 'InfRps');
      return doc.end({ prettyPrint: false, headless: false });
    },
  },

  [NFSE_LAYOUTS.BETHA]: {
    nome: 'Betha',
    build(documento) {
      validarDocumento(documento);
      const doc = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('GerarNfseEnvio', { xmlns: BETHA_NAMESPACE });
      const rps = doc.ele('Rps');
      appendInfRps(rps, documento, 'InfDeclaracaoPrestacaoServico');
      return doc.end({ prettyPrint: false, headless: false });
    },
  },

  [NFSE_LAYOUTS.ISSNET]: {
    nome: 'ISSNet',
    build(documento) {
      validarDocumento(documento);
      const doc = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('EnviarLoteRpsEnvio', { xmlns: ISSNET_NAMESPACE });
      const lote = doc.ele('LoteRps', { Id: `Lote${documento.numero}`, versao: '2.04' });
      lote.ele('NumeroLote').txt(String(documento.numero)).up();
      lote.ele('CpfCnpj').ele('Cnpj').txt(documento.cnpjPrestador.replace(/\D/g, '')).up().up();
      lote.ele('InscricaoMunicipal').txt(documento.inscricaoMunicipal).up();
      lote.ele('QuantidadeRps').txt('1').up();
      const lista = lote.ele('ListaRps').ele('Rps');
      appendInfRps(lista, documento, 'InfDeclaracaoPrestacaoServico');
      return doc.end({ prettyPrint: false, headless: false });
    },
  },
};

/**
 * @param {string} layout
 * @returns {typeof NFSeLayoutAdapters[string]}
 */
export function obterAdapter(layout) {
  const key = (layout ?? NFSE_LAYOUTS.ABRASF).toLowerCase();
  const adapter = NFSeLayoutAdapters[key];
  if (!adapter) {
    throw new GhinfeError(
      `Layout NFS-e não suportado: ${layout}. Use: ${Object.keys(NFSE_LAYOUTS).join(', ')}`,
      'NFSE_LAYOUT_UNSUPPORTED'
    );
  }
  return adapter;
}
