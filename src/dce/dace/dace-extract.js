import { DOMParser } from '@xmldom/xmldom';
import { GhinfeError } from '../../errors/GhinfeError.js';

/** @param {Element|null|undefined} parent @param {string} nome */
function filho(parent, nome) {
  if (!parent) return null;
  for (let n = parent.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && n.localName === nome) return /** @type {Element} */ (n);
  }
  return null;
}

/** @param {Element|null|undefined} parent @param {string} nome */
function filhos(parent, nome) {
  const lista = [];
  for (let n = parent?.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && n.localName === nome) lista.push(/** @type {Element} */ (n));
  }
  return lista;
}

/** @param {Element|null|undefined} parent @param {string} nome */
function texto(parent, nome) {
  return filho(parent, nome)?.textContent?.trim() ?? '';
}

/** @param {Element|null} el */
function parte(el, tagEndereco) {
  if (!el) return null;
  const end = filho(el, tagEndereco);
  return {
    cnpj: texto(el, 'CNPJ'),
    cpf: texto(el, 'CPF'),
    idOutros: texto(el, 'idOutros'),
    nome: texto(el, 'xNome'),
    endereco: end
      ? {
          logradouro: texto(end, 'xLgr'),
          numero: texto(end, 'nro'),
          complemento: texto(end, 'xCpl'),
          bairro: texto(end, 'xBairro'),
          municipio: texto(end, 'xMun'),
          uf: texto(end, 'UF'),
          cep: texto(end, 'CEP'),
          pais: texto(end, 'xPais'),
        }
      : null,
  };
}

/**
 * Extrai os dados da DC-e (dceProc ou DCe assinada) usados na DACE.
 * @param {string} xml
 */
export function extrairDadosDace(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const dce = doc.getElementsByTagNameNS('*', 'DCe')[0];
  const inf = filho(dce, 'infDCe');
  if (!inf) {
    throw new GhinfeError('XML não contém DCe/infDCe', 'DACE_XML_INVALIDO');
  }

  const ide = filho(inf, 'ide');
  const infProt = doc.getElementsByTagNameNS('*', 'infProt')[0];
  const supl = filho(dce, 'infDCeSupl');
  const infAdic = filho(inf, 'infAdic');
  const infDec = filho(inf, 'infDec');

  const grupoEmissor = ['Fisco', 'Marketplace', 'Transportadora', 'ECT']
    .map((tipo) => ({ tipo, el: filho(inf, tipo) }))
    .find(({ el }) => el);

  return {
    chaveAcesso: (inf.getAttribute('Id') ?? '').replace(/^DCe/, ''),
    numero: texto(ide, 'nDC'),
    serie: texto(ide, 'serie'),
    dhEmi: texto(ide, 'dhEmi'),
    tipoEmissao: texto(ide, 'tpEmis'),
    tipoEmitente: texto(ide, 'tpEmit'),
    ambiente: texto(ide, 'tpAmb'),
    protocolo: texto(infProt, 'nProt'),
    dhRecbto: texto(infProt, 'dhRecbto'),
    emitente: parte(filho(inf, 'emit'), 'enderEmit'),
    destinatario: parte(filho(inf, 'dest'), 'enderDest'),
    empresaEmissora: grupoEmissor
      ? {
          tipo: grupoEmissor.tipo,
          cnpj: texto(grupoEmissor.el, 'CNPJ'),
          nome: texto(grupoEmissor.el, 'xNome') || texto(grupoEmissor.el, 'xOrgao'),
        }
      : null,
    itens: filhos(inf, 'det').map((det) => {
      const prod = filho(det, 'prod');
      return {
        nItem: det.getAttribute('nItem'),
        descricao: texto(prod, 'xProd'),
        ncm: texto(prod, 'NCM'),
        quantidade: texto(prod, 'qCom'),
        valorUnitario: texto(prod, 'vUnCom'),
        valorTotal: texto(prod, 'vProd'),
        informacoesAdicionais: texto(det, 'infAdProd'),
      };
    }),
    valorTotal: texto(filho(inf, 'total'), 'vDC'),
    modalidadeTransporte: texto(filho(inf, 'transp'), 'modTrans'),
    cnpjTransportadora: texto(filho(inf, 'transp'), 'CNPJTransp'),
    informacoesComplementares: texto(infAdic, 'infCpl'),
    informacoesFisco: texto(infAdic, 'infAdFisco'),
    informacoesMarketplace: texto(infAdic, 'infAdMarketplace'),
    informacoesECT: texto(infAdic, 'infAdECT'),
    observacoes: [texto(infDec, 'xObs1'), texto(infDec, 'xObs2')].filter(Boolean),
    qrCode: texto(supl, 'qrCodDCe'),
  };
}
