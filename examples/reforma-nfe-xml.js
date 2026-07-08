import { NFeService, calcularIBSCBS } from '../src/index.js';

const documento = {
  ambiente: 2,
  reformaTributaria: true,
  ide: { uf: 'SP', codigoMunicipio: '3550308', serie: 1, numero: 99 },
  emitente: {
    cnpj: '12345678000199',
    razaoSocial: 'EMPRESA EXEMPLO LTDA',
    ie: '123456789012',
    crt: '3',
    endereco: {
      logradouro: 'Rua A', numero: '1', bairro: 'Centro',
      codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01001000',
    },
  },
  destinatario: {
    cpf: '12345678909',
    razaoSocial: 'CONSUMIDOR',
    indIEDest: 9,
    endereco: {
      logradouro: 'Rua B', numero: '2', bairro: 'Centro',
      codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01001000',
    },
  },
  itens: [{
    codigo: '001',
    descricao: 'PRODUTO COM IBS/CBS',
    ncm: '84713012',
    cfop: '5102',
    unidade: 'UN',
    quantidade: 1,
    valorUnitario: 100,
    valorTotal: 100,
    cst: '00',
    aliquotaIcms: 18,
    valorIcms: 18,
    reforma: calcularIBSCBS(100, { pIBSUF: 0.1, pIBSMun: 0.05, pCBS: 0.9, cClassTrib: '000001' }),
  }],
  frete: { modalidade: 9 },
  pagamentos: [{ forma: '01', valor: 100 }],
};

const service = new NFeService();
const doc = service.resolverDocumento(documento);
const xml = service.gerarXml(doc);

console.log('=== GHINFE — NF-e com IBS/CBS injetado ===\n');
console.log('Chave:', doc.chaveAcesso);
console.log('Contém IBSCBS:', xml.includes('<IBSCBS>'));
console.log('Contém IBSCBSTot:', xml.includes('<IBSCBSTot>'));
console.log('\nTrecho imposto:\n', xml.match(/<IBSCBS>[\s\S]*?<\/IBSCBS>/)?.[0]?.substring(0, 400));
