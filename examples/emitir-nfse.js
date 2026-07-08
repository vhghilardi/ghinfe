import { NFSeService } from '../src/index.js';

const documento = {
  numero: 1,
  serie: 'NF',
  ambiente: 2,
  codigoMunicipio: '3550308',
  cnpjPrestador: '12345678000199',
  inscricaoMunicipal: '12345678',
  optanteSimplesNacional: 1,
  servico: {
    itemListaServico: '01.01',
    discriminacao: 'Desenvolvimento de software conforme contrato 001/2026',
    codigoMunicipio: '3550308',
    valorServicos: 1500.0,
    aliquotaIss: 5.0,
    valorIss: 75.0,
    issRetido: 2,
  },
  tomador: {
    cnpj: '98765432000100',
    razaoSocial: 'CLIENTE EXEMPLO LTDA',
    email: 'fiscal@cliente.com.br',
    endereco: {
      logradouro: 'Rua das Acacias',
      numero: '200',
      bairro: 'Centro',
      codigoMunicipio: '3550308',
      uf: 'SP',
      cep: '01005000',
    },
  },
  informacoesComplementares: 'NFS-e gerada pela biblioteca GHINFE',
};

const service = new NFSeService({ mock: true });

console.log('=== GHINFE — NFS-e ABRASF 2.04 ===\n');

const xml = service.gerarXml(documento);
console.log('XML RPS (trecho):', xml.substring(0, 400) + '...\n');

const resultado = await service.emitir(documento);
console.log('Retorno mock:');
console.log('  NFS-e:', resultado.retorno.numeroNfse);
console.log('  Código verificação:', resultado.retorno.codigoVerificacao);
