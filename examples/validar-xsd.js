import { NFeService } from '../src/index.js';

const service = new NFeService({ validarXsd: true });

const documento = {
  ambiente: 2,
  ide: { uf: 'SP', codigoMunicipio: '3550308', serie: 1, numero: 1 },
  emitente: {
    cnpj: '12345678000199',
    razaoSocial: 'EMPRESA EXEMPLO LTDA',
    ie: '123456789012',
    crt: '3',
    endereco: {
      logradouro: 'Rua Exemplo', numero: '100', bairro: 'Centro',
      codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01001000',
    },
  },
  destinatario: {
    cpf: '12345678909',
    razaoSocial: 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL',
    indIEDest: 9,
    endereco: {
      logradouro: 'Rua Cliente', numero: '200', bairro: 'Jardim',
      codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01020000',
    },
  },
  itens: [{
    codigo: '001',
    descricao: 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL',
    ncm: '84713012', cfop: '5102', unidade: 'UN',
    quantidade: 1, valorUnitario: 100, valorTotal: 100,
    cst: '00', aliquotaIcms: 18, valorIcms: 18,
  }],
  frete: { modalidade: 9 },
  pagamentos: [{ forma: '01', valor: 100 }],
};

console.log('=== GHINFE — Validação XSD NF-e ===\n');

try {
  const xml = service.gerarXml(documento);
  console.log('XML gerado e validado contra XSD oficial (PL_009_V4)');
  console.log('Chave:', service.resolverDocumento(documento).chaveAcesso);
  console.log('Tamanho XML:', xml.length, 'bytes');
} catch (error) {
  console.error('Falha:', error.message);
  if (error.erros) error.erros.forEach((e) => console.error(' -', e));
}
