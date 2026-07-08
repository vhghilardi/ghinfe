import { create } from 'xmlbuilder2';
import { NFE_VERSAO } from '../../constants/sefaz.js';
import { formatSefazDateTime } from '../../utils/date.utils.js';
import { GhinfeError } from '../../errors/GhinfeError.js';
import { codigoUf, formatDecimal, appendEndereco, appendImpostosItem } from '../../shared/fiscal.helpers.js';

/**
 * Monta XML da NFC-e (modelo 65, layout 4.00).
 */
export class NFCeXmlBuilder {
  /**
   * @param {import('../types/NFCeDocument.js').NFCeDocumento} documento
   * @returns {string}
   */
  build(documento) {
    this.#validar(documento);

    const dhEmi = formatSefazDateTime();
    const idInfNFe = `NFe${documento.chaveAcesso}`;
    const ambiente = documento.ambiente ?? 2;

    const totalProdutos = documento.itens.reduce((s, i) => s + i.valorTotal, 0);
    const valorIcms = documento.itens.reduce((s, i) => s + (i.valorIcms ?? 0), 0);
    const valorDesc = documento.itens.reduce((s, i) => s + (i.valorDesconto ?? 0), 0);
    const valorNf = totalProdutos - valorDesc;

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('NFe', { xmlns: 'http://www.portalfiscal.inf.br/nfe' })
      .ele('infNFe', { versao: NFE_VERSAO, Id: idInfNFe });

    const inf = root;

    // ide — NFC-e modelo 65
    inf
      .ele('ide')
      .ele('cUF').txt(codigoUf(documento.ide.uf)).up()
      .ele('cNF').txt(documento.chaveAcesso.substring(35, 43)).up()
      .ele('natOp').txt(documento.ide.naturezaOperacao ?? 'VENDA').up()
      .ele('mod').txt('65').up()
      .ele('serie').txt(String(documento.ide.serie ?? 1)).up()
      .ele('nNF').txt(String(documento.ide.numero)).up()
      .ele('dhEmi').txt(dhEmi).up()
      .ele('tpNF').txt('1').up()
      .ele('idDest').txt('1').up()
      .ele('cMunFG').txt(documento.ide.codigoMunicipio).up()
      .ele('tpImp').txt('4').up()
      .ele('tpEmis').txt('1').up()
      .ele('cDV').txt(documento.chaveAcesso.slice(-1)).up()
      .ele('tpAmb').txt(String(ambiente)).up()
      .ele('finNFe').txt('1').up()
      .ele('indFinal').txt('1').up()
      .ele('indPres').txt(String(documento.ide.presenca ?? 1)).up()
      .ele('procEmi').txt('0').up()
      .ele('verProc').txt('ghinfe-0.3.0').up()
      .up();

    // emit
    const emit = inf.ele('emit');
    emit.ele('CNPJ').txt(documento.emitente.cnpj.replace(/\D/g, '')).up();
    emit.ele('xNome').txt(documento.emitente.razaoSocial).up();
    if (documento.emitente.nomeFantasia) {
      emit.ele('xFant').txt(documento.emitente.nomeFantasia).up();
    }
    appendEndereco(emit, 'enderEmit', documento.emitente.endereco);
    emit.ele('IE').txt(documento.emitente.ie).up();
    emit.ele('CRT').txt(documento.emitente.crt).up();
    emit.up();

    // dest — opcional na NFC-e (se informado CPF/CNPJ, exige indIEDest ou enderDest)
    if (documento.destinatario?.cpf || documento.destinatario?.cnpj) {
      const dest = inf.ele('dest');
      const docDest = (documento.destinatario.cnpj ?? documento.destinatario.cpf ?? '').replace(/\D/g, '');
      if (docDest.length === 14) dest.ele('CNPJ').txt(docDest).up();
      else if (docDest.length === 11) dest.ele('CPF').txt(docDest).up();
      if (documento.destinatario.razaoSocial) {
        dest.ele('xNome').txt(documento.destinatario.razaoSocial).up();
      }
      if (documento.destinatario.endereco) {
        appendEndereco(dest, 'enderDest', documento.destinatario.endereco);
      } else {
        dest.ele('indIEDest').txt('9').up();
      }
      dest.up();
    }

    // det — itens
    documento.itens.forEach((item, index) => {
      const det = inf.ele('det', { nItem: String(index + 1) });
      const prod = det.ele('prod');
      prod.ele('cProd').txt(item.codigo).up();
      prod.ele('cEAN').txt(item.ean ?? 'SEM GTIN').up();
      prod.ele('xProd').txt(item.descricao).up();
      prod.ele('NCM').txt(item.ncm).up();
      prod.ele('CFOP').txt(item.cfop).up();
      prod.ele('uCom').txt(item.unidade).up();
      prod.ele('qCom').txt(formatDecimal(item.quantidade, 4)).up();
      prod.ele('vUnCom').txt(formatDecimal(item.valorUnitario, 10)).up();
      prod.ele('vProd').txt(formatDecimal(item.valorTotal, 2)).up();
      prod.ele('cEANTrib').txt(item.ean ?? 'SEM GTIN').up();
      prod.ele('uTrib').txt(item.unidade).up();
      prod.ele('qTrib').txt(formatDecimal(item.quantidade, 4)).up();
      prod.ele('vUnTrib').txt(formatDecimal(item.valorUnitario, 10)).up();
      prod.ele('indTot').txt('1').up();
      prod.up();

      appendImpostosItem(det.ele('imposto'), item);
      det.up();
    });

    // total
    const total = inf.ele('total').ele('ICMSTot');
    total
      .ele('vBC').txt(formatDecimal(totalProdutos, 2)).up()
      .ele('vICMS').txt(formatDecimal(valorIcms, 2)).up()
      .ele('vICMSDeson').txt('0.00').up()
      .ele('vFCP').txt('0.00').up()
      .ele('vBCST').txt('0.00').up()
      .ele('vST').txt('0.00').up()
      .ele('vFCPST').txt('0.00').up()
      .ele('vFCPSTRet').txt('0.00').up()
      .ele('vProd').txt(formatDecimal(totalProdutos, 2)).up()
      .ele('vFrete').txt('0.00').up()
      .ele('vSeg').txt('0.00').up()
      .ele('vDesc').txt(formatDecimal(valorDesc, 2)).up()
      .ele('vII').txt('0.00').up()
      .ele('vIPI').txt('0.00').up()
      .ele('vIPIDevol').txt('0.00').up()
      .ele('vPIS').txt('0.00').up()
      .ele('vCOFINS').txt('0.00').up()
      .ele('vOutro').txt('0.00').up()
      .ele('vNF').txt(formatDecimal(valorNf, 2)).up();
    total.up().up();

    // transp — NFC-e sem frete
    inf.ele('transp').ele('modFrete').txt('9').up().up();

    // pag
    const pag = inf.ele('pag');
    const pagamentos = documento.pagamentos ?? [{ forma: '01', valor: valorNf }];
    pagamentos.forEach((p) => {
      const detPag = pag.ele('detPag');
      detPag.ele('tPag').txt(p.forma).up();
      detPag.ele('vPag').txt(formatDecimal(p.valor, 2)).up();
      detPag.up();
    });
    pag.up();

    // infAdic
    if (documento.informacoesComplementares || documento.informacoesFisco) {
      const infAdic = inf.ele('infAdic');
      if (documento.informacoesFisco) {
        infAdic.ele('infAdFisco').txt(documento.informacoesFisco).up();
      }
      if (documento.informacoesComplementares) {
        infAdic.ele('infCpl').txt(documento.informacoesComplementares).up();
      }
      infAdic.up();
    }

    return root.end({ prettyPrint: false, headless: false });
  }

  /** @param {import('../types/NFCeDocument.js').NFCeDocumento} documento */
  #validar(documento) {
    if (!documento.chaveAcesso || documento.chaveAcesso.length !== 44) {
      throw new GhinfeError('chaveAcesso deve conter 44 dígitos', 'INVALID_CHAVE');
    }
    if (!documento.emitente?.cnpj) {
      throw new GhinfeError('emitente.cnpj é obrigatório', 'INVALID_EMITENTE');
    }
    if (!documento.itens?.length) {
      throw new GhinfeError('A NFC-e deve conter ao menos um item', 'INVALID_ITENS');
    }
    if (!documento.csc?.idCSC || !documento.csc?.codigo) {
      throw new GhinfeError('csc.idCSC e csc.codigo são obrigatórios para QR Code', 'INVALID_CSC');
    }
  }
}
