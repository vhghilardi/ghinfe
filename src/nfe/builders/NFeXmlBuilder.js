import { create } from 'xmlbuilder2';
import { NFE_VERSAO } from '../../constants/sefaz.js';
import { formatSefazDateTime } from '../../utils/date.utils.js';
import { GhinfeError } from '../../errors/GhinfeError.js';
import {
  reformaHabilitada,
  normalizarItensReforma,
  somarTotaisReforma,
  appendTotaisIBSCBS,
  appendIBSCBS,
} from '../../reforma/ibscbs.js';

/**
 * Monta o XML da NF-e (layout 4.00).
 * Com item.reforma ou reformaTributaria, injeta grupos IBS/CBS (PL_010 experimental).
 * Atenção: validar XSD PL_009 com reforma ativa pode falhar — use validarXsd só sem reforma,
 * ou aguarde schemas PL_010.
 */
export class NFeXmlBuilder {
  /**
   * @param {import('../types/NFeDocument.js').NFeDocument} documento
   * @returns {string}
   */
  build(documento) {
    this.#validar(documento);

    const comReforma = reformaHabilitada(documento);
    const itens = comReforma ? normalizarItensReforma(documento.itens, true) : documento.itens;

    const dhEmi = formatSefazDateTime();
    const dhSaiEnt = formatSefazDateTime();
    const idInfNFe = `NFe${documento.chaveAcesso}`;

    const totalProdutos = itens.reduce((s, i) => s + i.valorTotal, 0);
    const valorFrete = documento.frete?.valor ?? 0;
    const valorIcms = itens.reduce((s, i) => s + (i.valorIcms ?? 0), 0);
    const valorNf = totalProdutos + valorFrete;
    const totaisReforma = comReforma ? somarTotaisReforma(itens) : null;

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('NFe', { xmlns: 'http://www.portalfiscal.inf.br/nfe' })
      .ele('infNFe', { versao: NFE_VERSAO, Id: idInfNFe });

    const inf = root;

    inf
      .ele('ide')
      .ele('cUF').txt(this.#codigoUf(documento.ide.uf)).up()
      .ele('cNF').txt(documento.chaveAcesso.substring(35, 43)).up()
      .ele('natOp').txt(documento.ide.naturezaOperacao ?? 'VENDA').up()
      .ele('mod').txt('55').up()
      .ele('serie').txt(String(documento.ide.serie ?? 1)).up()
      .ele('nNF').txt(String(documento.ide.numero)).up()
      .ele('dhEmi').txt(dhEmi).up()
      .ele('dhSaiEnt').txt(dhSaiEnt).up()
      .ele('tpNF').txt('1').up()
      .ele('idDest').txt('1').up()
      .ele('cMunFG').txt(documento.ide.codigoMunicipio).up()
      .ele('tpImp').txt('1').up()
      .ele('tpEmis').txt(String(documento.ide.tipoEmissao ?? 1)).up()
      .ele('cDV').txt(documento.chaveAcesso.slice(-1)).up()
      .ele('tpAmb').txt(String(documento.ambiente ?? 2)).up()
      .ele('finNFe').txt(String(documento.ide.finalidade ?? 1)).up()
      .ele('indFinal').txt(String(documento.ide.consumidorFinal ?? 1)).up()
      .ele('indPres').txt(String(documento.ide.presenca ?? 1)).up()
      .ele('procEmi').txt('0').up()
      .ele('verProc').txt('ghinfe-0.6.0').up()
      .up();

    const emit = inf.ele('emit');
    emit.ele('CNPJ').txt(documento.emitente.cnpj.replace(/\D/g, '')).up();
    emit.ele('xNome').txt(documento.emitente.razaoSocial).up();
    if (documento.emitente.nomeFantasia) emit.ele('xFant').txt(documento.emitente.nomeFantasia).up();
    this.#appendEndereco(emit, 'enderEmit', documento.emitente.endereco);
    emit.ele('IE').txt(documento.emitente.ie).up();
    emit.ele('CRT').txt(documento.emitente.crt).up();
    emit.up();

    const dest = inf.ele('dest');
    const docDest = (documento.destinatario.cnpj ?? documento.destinatario.cpf ?? '').replace(/\D/g, '');
    if (docDest.length === 14) dest.ele('CNPJ').txt(docDest).up();
    else if (docDest.length === 11) dest.ele('CPF').txt(docDest).up();
    dest.ele('xNome').txt(documento.destinatario.razaoSocial).up();
    this.#appendEndereco(dest, 'enderDest', documento.destinatario.endereco);
    if (documento.destinatario.indIEDest !== undefined) {
      dest.ele('indIEDest').txt(String(documento.destinatario.indIEDest)).up();
    }
    if (documento.destinatario.ie) dest.ele('IE').txt(documento.destinatario.ie).up();
    dest.up();

    itens.forEach((item, index) => {
      const det = inf.ele('det', { nItem: String(index + 1) });
      const prod = det.ele('prod');
      prod.ele('cProd').txt(item.codigo).up();
      prod.ele('cEAN').txt(item.ean ?? 'SEM GTIN').up();
      prod.ele('xProd').txt(item.descricao).up();
      prod.ele('NCM').txt(item.ncm).up();
      prod.ele('CFOP').txt(item.cfop).up();
      prod.ele('uCom').txt(item.unidade).up();
      prod.ele('qCom').txt(this.#decimal(item.quantidade, 4)).up();
      prod.ele('vUnCom').txt(this.#decimal(item.valorUnitario, 10)).up();
      prod.ele('vProd').txt(this.#decimal(item.valorTotal, 2)).up();
      prod.ele('cEANTrib').txt(item.ean ?? 'SEM GTIN').up();
      prod.ele('uTrib').txt(item.unidade).up();
      prod.ele('qTrib').txt(this.#decimal(item.quantidade, 4)).up();
      prod.ele('vUnTrib').txt(this.#decimal(item.valorUnitario, 10)).up();
      prod.ele('indTot').txt('1').up();
      prod.up();

      const imposto = det.ele('imposto');
      const icms = imposto.ele('ICMS').ele('ICMS00');
      icms.ele('orig').txt('0').up();
      icms.ele('CST').txt(item.cst ?? '00').up();
      icms.ele('modBC').txt('0').up();
      icms.ele('vBC').txt(this.#decimal(item.valorTotal, 2)).up();
      icms.ele('pICMS').txt(this.#decimal(item.aliquotaIcms ?? 0, 4)).up();
      icms.ele('vICMS').txt(this.#decimal(item.valorIcms ?? 0, 2)).up();
      icms.up().up();
      imposto.ele('PIS').ele('PISNT').ele('CST').txt('07').up().up().up();
      imposto.ele('COFINS').ele('COFINSNT').ele('CST').txt('07').up().up().up();
      if (item.reforma) appendIBSCBS(imposto, item.reforma);
      imposto.up();
      det.up();
    });

    const totalParent = inf.ele('total');
    const total = totalParent.ele('ICMSTot');
    total
      .ele('vBC').txt(this.#decimal(totalProdutos, 2)).up()
      .ele('vICMS').txt(this.#decimal(valorIcms, 2)).up()
      .ele('vICMSDeson').txt('0.00').up()
      .ele('vFCP').txt('0.00').up()
      .ele('vBCST').txt('0.00').up()
      .ele('vST').txt('0.00').up()
      .ele('vFCPST').txt('0.00').up()
      .ele('vFCPSTRet').txt('0.00').up()
      .ele('vProd').txt(this.#decimal(totalProdutos, 2)).up()
      .ele('vFrete').txt(this.#decimal(valorFrete, 2)).up()
      .ele('vSeg').txt('0.00').up()
      .ele('vDesc').txt('0.00').up()
      .ele('vII').txt('0.00').up()
      .ele('vIPI').txt('0.00').up()
      .ele('vIPIDevol').txt('0.00').up()
      .ele('vPIS').txt('0.00').up()
      .ele('vCOFINS').txt('0.00').up()
      .ele('vOutro').txt('0.00').up()
      .ele('vNF').txt(this.#decimal(valorNf, 2)).up();
    total.up();
    if (totaisReforma) appendTotaisIBSCBS(totalParent, totaisReforma);
    totalParent.up();

    const transp = inf.ele('transp');
    transp.ele('modFrete').txt(String(documento.frete?.modalidade ?? 9)).up();
    if (documento.frete?.transportadora) {
      const transporta = transp.ele('transporta');
      if (documento.frete.cnpjTransportadora) {
        transporta.ele('CNPJ').txt(documento.frete.cnpjTransportadora.replace(/\D/g, '')).up();
      }
      transporta.ele('xNome').txt(documento.frete.transportadora).up();
      transporta.up();
    }
    transp.up();

    const pag = inf.ele('pag');
    (documento.pagamentos ?? [{ forma: '01', valor: valorNf }]).forEach((p) => {
      const detPag = pag.ele('detPag');
      detPag.ele('tPag').txt(p.forma).up();
      detPag.ele('vPag').txt(this.#decimal(p.valor, 2)).up();
      detPag.up();
    });
    pag.up();

    if (documento.informacoesComplementares) {
      inf.ele('infAdic').ele('infCpl').txt(documento.informacoesComplementares).up().up();
    }

    return root.end({ prettyPrint: false, headless: false });
  }

  #validar(documento) {
    if (!documento.chaveAcesso || documento.chaveAcesso.length !== 44) {
      throw new GhinfeError('chaveAcesso deve conter 44 dígitos', 'INVALID_CHAVE');
    }
    if (!documento.emitente?.cnpj) throw new GhinfeError('emitente.cnpj é obrigatório', 'INVALID_EMITENTE');
    if (!documento.itens?.length) throw new GhinfeError('A NF-e deve conter ao menos um item', 'INVALID_ITENS');
  }

  #appendEndereco(parent, tag, endereco) {
    const node = parent.ele(tag);
    node.ele('xLgr').txt(endereco.logradouro).up();
    node.ele('nro').txt(endereco.numero).up();
    if (endereco.complemento) node.ele('xCpl').txt(endereco.complemento).up();
    node.ele('xBairro').txt(endereco.bairro).up();
    node.ele('cMun').txt(endereco.codigoMunicipio).up();
    node.ele('xMun').txt(endereco.municipio).up();
    node.ele('UF').txt(endereco.uf).up();
    node.ele('CEP').txt(endereco.cep.replace(/\D/g, '')).up();
    if (endereco.telefone) node.ele('fone').txt(endereco.telefone.replace(/\D/g, '')).up();
    node.up();
  }

  #codigoUf(uf) {
    const map = {
      AC: '12', AL: '27', AM: '13', AP: '16', BA: '29', CE: '23', DF: '53',
      ES: '32', GO: '52', MA: '21', MG: '31', MS: '50', MT: '51', PA: '15',
      PB: '25', PE: '26', PI: '22', PR: '41', RJ: '33', RN: '24', RO: '11',
      RR: '14', RS: '43', SC: '42', SE: '28', SP: '35', TO: '17',
    };
    return map[uf.toUpperCase()] ?? '35';
  }

  #decimal(value, decimals) {
    return Number(value).toFixed(decimals);
  }
}
