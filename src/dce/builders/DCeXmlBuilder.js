import { create } from 'xmlbuilder2';
import {
  DCE_VERSAO,
  DCE_MODELO,
  DCE_NAMESPACE,
  DCE_TIPO_EMITENTE,
  DCE_MODALIDADE_TRANSPORTE,
  DCE_DECLARACAO,
  DCE_NOME_DEST_HOMOLOGACAO,
  DCE_QRCODE_URL,
} from '../constants/dce.js';
import { gerarUrlQrCodeDCe } from '../utils/qrcode.utils.js';
import { parseChaveAcessoDCe } from '../../utils/chave.utils.js';
import { formatSefazDateTime } from '../../utils/date.utils.js';
import { formatDecimal } from '../../shared/fiscal.helpers.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');

/** Formata vUnCom (TDec_1302_1308): mínimo 2 e máximo 8 casas decimais. */
function formatValorUnitario(value) {
  return Number(value).toFixed(8).replace(/(\.\d{2}\d*?)0+$/, '$1');
}

/** @param {import('../types/DCeDocument.js').DCeItem} item */
function valorTotalItem(item) {
  return item.valorTotal ?? Math.round(item.quantidade * item.valorUnitario * 100) / 100;
}

/**
 * Monta XML da DC-e (modelo 99, layout 1.00 — PL_DCe_v1.00a + NT 2024.001).
 */
export class DCeXmlBuilder {
  /**
   * Gera o XML completo, incluindo infDCeSupl (QR Code), pronto para assinatura.
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento
   * @param {{ qrCode?: string, urlChave?: string, sign?: string, qrCodeBaseUrl?: string }} [options]
   *   sign: assinatura da chave para QR Code em contingência off-line
   * @returns {string}
   */
  build(documento, options = {}) {
    const chave = parseChaveAcessoDCe(documento.chaveAcesso ?? '');
    this.#validar(documento, chave);

    const ambiente = documento.ambiente ?? 2;
    const homologacao = ambiente === 2;

    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('DCe', { xmlns: DCE_NAMESPACE });
    const inf = root.ele('infDCe', { versao: DCE_VERSAO, Id: `DCe${documento.chaveAcesso}` });

    // ide — campos da chave vêm dela para garantir a concatenação (rejeição 502)
    const ide = inf.ele('ide');
    ide.ele('cUF').txt(chave.cUF);
    ide.ele('cDC').txt(chave.codigoNumerico);
    ide.ele('mod').txt(DCE_MODELO);
    ide.ele('serie').txt(String(chave.serie));
    ide.ele('nDC').txt(String(chave.numero));
    ide.ele('dhEmi').txt(formatSefazDateTime(documento.ide.dataEmissao ?? new Date()));
    ide.ele('tpEmis').txt(String(chave.tipoEmissao));
    ide.ele('tpEmit').txt(String(chave.tipoEmitente));
    ide.ele('nSiteAutoriz').txt(String(chave.siteAutorizador));
    ide.ele('cDV').txt(chave.digitoVerificador);
    ide.ele('tpAmb').txt(String(ambiente));
    ide.ele('verProc').txt('ghinfe-0.6.0');

    // emit
    const emit = inf.ele('emit');
    this.#appendIdentificacao(emit, documento.emitente);
    emit.ele('xNome').txt(documento.emitente.razaoSocial.trim());
    this.#appendEndereco(emit, 'enderEmit', documento.emitente.endereco, { emitente: true });

    // Fisco / Marketplace / Transportadora / ECT
    this.#appendEmpresaEmissora(inf, chave.tipoEmitente, documento);

    // dest
    const dest = inf.ele('dest');
    this.#appendIdentificacao(dest, documento.destinatario);
    dest.ele('xNome').txt(homologacao ? DCE_NOME_DEST_HOMOLOGACAO : documento.destinatario.razaoSocial.trim());
    this.#appendEndereco(dest, 'enderDest', documento.destinatario.endereco, { emitente: false });

    // autXML
    for (const aut of documento.autorizadosXml ?? []) {
      const node = inf.ele('autXML');
      if (aut.cnpj) node.ele('CNPJ').txt(onlyDigits(aut.cnpj));
      else node.ele('CPF').txt(onlyDigits(aut.cpf));
    }

    // det
    let valorTotal = 0;
    documento.itens.forEach((item, index) => {
      const vProd = valorTotalItem(item);
      valorTotal += vProd;

      const det = inf.ele('det', { nItem: String(index + 1) });
      const prod = det.ele('prod');
      prod.ele('xProd').txt(item.descricao.trim());
      prod.ele('NCM').txt(onlyDigits(item.ncm));
      prod.ele('qCom').txt(formatDecimal(item.quantidade, 4));
      prod.ele('vUnCom').txt(formatValorUnitario(item.valorUnitario));
      prod.ele('vProd').txt(formatDecimal(vProd, 2));
      if (item.informacoesAdicionais) {
        det.ele('infAdProd').txt(item.informacoesAdicionais.trim());
      }
    });

    // total
    inf.ele('total').ele('vDC').txt(formatDecimal(valorTotal, 2));

    // transp — CNPJTransp é obrigatório no XSD, mas aceita vazio
    const transp = inf.ele('transp');
    transp.ele('modTrans').txt(String(documento.transporte.modalidade));
    transp.ele('CNPJTransp').txt(onlyDigits(documento.transporte.cnpjTransportadora));

    this.#appendInfAdic(inf, documento.informacoesAdicionais);

    const infDec = inf.ele('infDec');
    infDec.ele('xObs1').txt(DCE_DECLARACAO.xObs1);
    infDec.ele('xObs2').txt(DCE_DECLARACAO.xObs2);

    if (documento.solicitacaoFisco) {
      root.ele('infSolicDCe').ele('xSolic').txt(documento.solicitacaoFisco);
    }

    const qrCode =
      options.qrCode ??
      gerarUrlQrCodeDCe({
        chaveAcesso: documento.chaveAcesso,
        ambiente,
        tipoEmissao: chave.tipoEmissao,
        emitente: documento.emitente,
        sign: options.sign,
        baseUrl: options.qrCodeBaseUrl,
      });

    const supl = root.ele('infDCeSupl');
    supl.ele('qrCodDCe').dat(qrCode);
    supl.ele('urlChave').txt(options.urlChave ?? options.qrCodeBaseUrl ?? DCE_QRCODE_URL);

    return root.end({ prettyPrint: false, headless: false });
  }

  /**
   * @param {import('xmlbuilder2').XMLBuilder} parent
   * @param {{ cnpj?: string, cpf?: string, idOutros?: string }} parte
   */
  #appendIdentificacao(parent, parte) {
    if (parte.cnpj) parent.ele('CNPJ').txt(onlyDigits(parte.cnpj));
    else if (parte.cpf) parent.ele('CPF').txt(onlyDigits(parte.cpf));
    else parent.ele('idOutros').txt(parte.idOutros.trim());
  }

  /**
   * TEndeEmi aceita somente Brasil; TEndeDest permite país estrangeiro.
   * @param {import('xmlbuilder2').XMLBuilder} parent
   * @param {string} tag
   * @param {import('../types/DCeDocument.js').DCeEndereco} endereco
   * @param {{ emitente: boolean }} opts
   */
  #appendEndereco(parent, tag, endereco, { emitente }) {
    const node = parent.ele(tag);
    node.ele('xLgr').txt(endereco.logradouro.trim());
    node.ele('nro').txt(String(endereco.numero).trim());
    if (endereco.complemento) node.ele('xCpl').txt(endereco.complemento.trim());
    node.ele('xBairro').txt(endereco.bairro.trim());
    node.ele('cMun').txt(onlyDigits(endereco.codigoMunicipio));
    node.ele('xMun').txt(endereco.municipio.trim());
    node.ele('UF').txt(endereco.uf.toUpperCase());
    node.ele('CEP').txt(onlyDigits(endereco.cep).padStart(8, '0'));
    node.ele('cPais').txt(emitente ? '1058' : onlyDigits(endereco.codigoPais ?? '1058'));
    node.ele('xPais').txt(emitente ? 'BRASIL' : (endereco.pais ?? 'BRASIL').trim());
    if (endereco.telefone) node.ele('fone').txt(onlyDigits(endereco.telefone));
    if (!emitente && endereco.email) node.ele('email').txt(endereco.email.trim());
  }

  /**
   * @param {import('xmlbuilder2').XMLBuilder} inf
   * @param {number} tipoEmitente
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento
   */
  #appendEmpresaEmissora(inf, tipoEmitente, documento) {
    switch (tipoEmitente) {
      case DCE_TIPO_EMITENTE.FISCO: {
        const node = inf.ele('Fisco');
        node.ele('CNPJ').txt(onlyDigits(documento.fisco.cnpj));
        node.ele('xOrgao').txt(documento.fisco.orgao.trim());
        node.ele('UF').txt(documento.fisco.uf.toUpperCase());
        break;
      }
      case DCE_TIPO_EMITENTE.MARKETPLACE: {
        const node = inf.ele('Marketplace');
        node.ele('CNPJ').txt(onlyDigits(documento.marketplace.cnpj));
        node.ele('xNome').txt(documento.marketplace.razaoSocial.trim());
        node.ele('Site').txt(documento.marketplace.site.trim());
        break;
      }
      case DCE_TIPO_EMITENTE.TRANSPORTADORA: {
        const node = inf.ele('Transportadora');
        node.ele('CNPJ').txt(onlyDigits(documento.transportadora.cnpj));
        node.ele('xNome').txt(documento.transportadora.razaoSocial.trim());
        break;
      }
      case DCE_TIPO_EMITENTE.ECT: {
        const node = inf.ele('ECT');
        node.ele('CNPJ').txt(onlyDigits(documento.ect.cnpj));
        node.ele('xNome').txt(documento.ect.razaoSocial.trim());
        break;
      }
      default:
        break;
    }
  }

  /**
   * @param {import('xmlbuilder2').XMLBuilder} inf
   * @param {import('../types/DCeDocument.js').DCeInformacoesAdicionais} [info]
   */
  #appendInfAdic(inf, info) {
    if (!info) return;

    const textos = [
      ['infAdFisco', info.fisco],
      ['infCpl', info.complementares],
      ['infAdMarketplace', info.marketplace],
      ['infAdECT', info.ect],
    ].filter(([, valor]) => valor);

    const observacoes = [
      ['obsEmit', info.obsEmitente],
      ['obsFisco', info.obsFisco],
      ['obsMarketplace', info.obsMarketplace],
      ['obsECT', info.obsECT],
    ].filter(([, lista]) => lista?.length);

    if (!textos.length && !observacoes.length) return;

    const infAdic = inf.ele('infAdic');
    for (const [tag, valor] of textos) {
      infAdic.ele(tag).txt(valor.trim());
    }
    for (const [tag, lista] of observacoes) {
      for (const obs of lista) {
        infAdic.ele(tag, { xCampo: obs.campo.trim() }).ele('xTexto').txt(obs.texto.trim());
      }
    }
  }

  /**
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento
   * @param {ReturnType<typeof parseChaveAcessoDCe>} chave
   */
  #validar(documento, chave) {
    if (!chave.valida) {
      throw new GhinfeError('chaveAcesso com dígito verificador inválido', 'CHAVE_DV_INVALIDO');
    }
    if (chave.modelo !== DCE_MODELO) {
      throw new GhinfeError(`Modelo da chave deve ser 99 (recebido ${chave.modelo})`, 'DCE_MODELO_INVALIDO');
    }

    const tpEmit = chave.tipoEmitente;
    if (!Object.values(DCE_TIPO_EMITENTE).includes(tpEmit)) {
      throw new GhinfeError(`tpEmit inválido: ${tpEmit}`, 'DCE_TP_EMIT_INVALIDO');
    }

    const grupoObrigatorio = {
      [DCE_TIPO_EMITENTE.FISCO]: ['fisco', 'Fisco'],
      [DCE_TIPO_EMITENTE.MARKETPLACE]: ['marketplace', 'Marketplace'],
      [DCE_TIPO_EMITENTE.TRANSPORTADORA]: ['transportadora', 'Transportadora'],
      [DCE_TIPO_EMITENTE.ECT]: ['ect', 'ECT'],
    }[tpEmit];

    if (grupoObrigatorio && !documento[grupoObrigatorio[0]]?.cnpj) {
      throw new GhinfeError(
        `${grupoObrigatorio[0]}.cnpj é obrigatório para tpEmit=${tpEmit} (grupo ${grupoObrigatorio[1]})`,
        'DCE_EMPRESA_EMISSORA_AUSENTE'
      );
    }

    const emitente = documento.emitente;
    if (!emitente?.cnpj && !emitente?.cpf && !emitente?.idOutros) {
      throw new GhinfeError('emitente.cnpj, emitente.cpf ou emitente.idOutros é obrigatório', 'INVALID_EMITENTE');
    }
    if (tpEmit === DCE_TIPO_EMITENTE.EMISSOR_PROPRIO && !emitente.cnpj) {
      throw new GhinfeError(
        'Emissão própria (tpEmit=2) exige emitente com CNPJ; pessoa física emite via Fisco, Marketplace, Transportadora ou ECT',
        'DCE_EMISSAO_PROPRIA_SEM_CNPJ'
      );
    }
    if (!emitente.razaoSocial || !emitente.endereco) {
      throw new GhinfeError('emitente.razaoSocial e emitente.endereco são obrigatórios', 'INVALID_EMITENTE');
    }

    const dest = documento.destinatario;
    if (!dest?.cnpj && !dest?.cpf && !dest?.idOutros) {
      throw new GhinfeError(
        'destinatario.cnpj, destinatario.cpf ou destinatario.idOutros é obrigatório',
        'INVALID_DESTINATARIO'
      );
    }
    if (!dest.razaoSocial || !dest.endereco) {
      throw new GhinfeError('destinatario.razaoSocial e destinatario.endereco são obrigatórios', 'INVALID_DESTINATARIO');
    }

    if ((documento.autorizadosXml?.length ?? 0) > 10) {
      throw new GhinfeError('Máximo de 10 autorizados (autXML)', 'DCE_AUTXML_EXCEDIDO');
    }

    if (!documento.itens?.length || documento.itens.length > 999) {
      throw new GhinfeError('A DC-e deve conter de 1 a 999 itens', 'INVALID_ITENS');
    }
    documento.itens.forEach((item, index) => {
      const nItem = index + 1;
      if (!item.descricao) {
        throw new GhinfeError(`Item ${nItem}: descricao é obrigatória`, 'INVALID_ITENS');
      }
      if (!/^(\d{2}|\d{8})$/.test(onlyDigits(item.ncm))) {
        throw new GhinfeError(`Item ${nItem}: NCM deve ter 2 ou 8 dígitos`, 'DCE_NCM_INVALIDO');
      }
      if (!(item.quantidade > 0)) {
        throw new GhinfeError(`Item ${nItem}: quantidade deve ser maior que zero`, 'INVALID_ITENS');
      }
      const calculado = Math.round(item.quantidade * item.valorUnitario * 100) / 100;
      if (item.valorTotal !== undefined && Math.abs(item.valorTotal - calculado) > 0.01) {
        throw new GhinfeError(
          `Item ${nItem}: valorTotal (${item.valorTotal}) difere de quantidade × valorUnitario (${calculado})`,
          'DCE_VPROD_DIVERGENTE'
        );
      }
    });

    const modalidade = documento.transporte?.modalidade;
    if (!Object.values(DCE_MODALIDADE_TRANSPORTE).includes(modalidade)) {
      throw new GhinfeError('transporte.modalidade deve ser 0, 1 ou 2', 'DCE_MOD_TRANS_INVALIDO');
    }
    if (modalidade === DCE_MODALIDADE_TRANSPORTE.TRANSPORTADORA && !documento.transporte.cnpjTransportadora) {
      throw new GhinfeError(
        'transporte.cnpjTransportadora é obrigatório quando modalidade=2',
        'DCE_CNPJ_TRANSP_AUSENTE'
      );
    }

    if (documento.solicitacaoFisco && tpEmit !== DCE_TIPO_EMITENTE.FISCO) {
      throw new GhinfeError('solicitacaoFisco só pode ser informada com tpEmit=0 (Fisco)', 'DCE_SOLIC_INDEVIDA');
    }
  }
}
