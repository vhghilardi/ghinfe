/**
 * Extrai campos úteis de XML NF-e/NFC-e para montagem do DANFE/DANFCE.
 * @param {string} xml
 */
export function extrairDadosDanfe(xml) {
  const get = (tag) => xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))?.[1]?.trim() ?? '';
  const getAll = (tag) => [...xml.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'g'))].map((m) => m[1]);

  const chave = get('chNFe') || (xml.match(/Id="NFe(\d{44})"/)?.[1] ?? '');
  const protocolo = get('nProt');
  const qrCode = xml.match(/<!\[CDATA\[(https?:\/\/[^\]]+)\]\]>/)?.[1]
    || xml.match(/<qrCode[^>]*>([^<]+)<\/qrCode>/)?.[1]
    || '';

  const itens = [];
  const detBlocks = xml.match(/<det[\s\S]*?<\/det>/g) ?? [];
  for (const block of detBlocks) {
    const g = (t) => block.match(new RegExp(`<${t}[^>]*>([^<]*)</${t}>`))?.[1] ?? '';
    itens.push({
      codigo: g('cProd'),
      descricao: g('xProd'),
      ncm: g('NCM'),
      cfop: g('CFOP'),
      unidade: g('uCom'),
      quantidade: g('qCom'),
      valorUnitario: g('vUnCom'),
      valorTotal: g('vProd'),
    });
  }

  return {
    chaveAcesso: chave,
    protocolo,
    modelo: get('mod') || (chave.substring(20, 22) || '55'),
    serie: get('serie'),
    numero: get('nNF'),
    dhEmi: get('dhEmi'),
    naturezaOperacao: get('natOp'),
    ambiente: get('tpAmb'),
    emitente: {
      cnpj: get('CNPJ'),
      razaoSocial: get('xNome'),
      ie: get('IE'),
      municipio: (xml.match(/<enderEmit>[\s\S]*?<xMun>([^<]+)/)?.[1]) ?? '',
      uf: (xml.match(/<enderEmit>[\s\S]*?<UF>([^<]+)/)?.[1]) ?? '',
    },
    destinatario: {
      doc: xml.match(/<dest>[\s\S]*?<(?:CNPJ|CPF)>([^<]+)/)?.[1] ?? '',
      razaoSocial: xml.match(/<dest>[\s\S]*?<xNome>([^<]+)/)?.[1] ?? '',
    },
    totais: {
      vProd: get('vProd'),
      vNF: get('vNF'),
      vICMS: get('vICMS'),
      vFrete: get('vFrete'),
    },
    itens,
    qrCode,
    informacoesComplementares: get('infCpl'),
  };
}

/**
 * Formata chave de acesso com espaços a cada 4 dígitos.
 * @param {string} chave
 */
export function formatarChaveAcesso(chave) {
  return (chave || '').replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
}
