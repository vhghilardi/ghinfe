import { NFeService } from '../src/index.js';

/** Documento de exemplo — homologação SEFAZ. */
const documento = {
  chaveAcesso: '35260712345678000199550010000000011000000011',
  ambiente: 2,
  ide: {
    uf: 'SP',
    codigoMunicipio: '3550308',
    serie: 1,
    numero: 1,
    naturezaOperacao: 'VENDA',
    consumidorFinal: 1,
    presenca: 1,
  },
  emitente: {
    cnpj: '12345678000199',
    razaoSocial: 'EMPRESA EXEMPLO LTDA',
    nomeFantasia: 'EXEMPLO',
    ie: '123456789012',
    crt: '3',
    endereco: {
      logradouro: 'Rua Exemplo',
      numero: '100',
      bairro: 'Centro',
      codigoMunicipio: '3550308',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01001000',
    },
  },
  destinatario: {
    cpf: '12345678909',
    razaoSocial: 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL',
    indIEDest: 9,
    endereco: {
      logradouro: 'Rua Cliente',
      numero: '200',
      bairro: 'Jardim',
      codigoMunicipio: '3550308',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01020000',
    },
  },
  itens: [
    {
      codigo: '001',
      descricao: 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL',
      ncm: '84713012',
      cfop: '5102',
      unidade: 'UN',
      quantidade: 1,
      valorUnitario: 100.0,
      valorTotal: 100.0,
      cst: '00',
      aliquotaIcms: 18,
      valorIcms: 18,
    },
  ],
  frete: { modalidade: 9 },
  pagamentos: [{ forma: '01', valor: 100.0 }],
  informacoesComplementares: 'Documento gerado pela biblioteca GHINFE',
};

const service = new NFeService({ mock: true });

console.log('=== GHINFE — Geração de XML NF-e ===\n');

const xml = service.gerarXml(documento);
console.log('XML gerado (primeiros 500 chars):\n');
console.log(xml.substring(0, 500) + '...\n');

console.log('Para assinar com certificado A1:');
console.log('  const xmlAssinado = service.gerarXmlAssinado(documento, { pfx: buffer, senha: "..." });\n');

console.log('Para emitir completo (mock SEFAZ):');
console.log('  const resultado = await service.emitir(documento, { pfx, senha });\n');

// Emissão mock sem certificado (apenas envio do XML não assinado para demo)
const retorno = await service.enviar(xml, documento.chaveAcesso);
console.log('Retorno mock SEFAZ:');
console.log(JSON.stringify(retorno, null, 2));
