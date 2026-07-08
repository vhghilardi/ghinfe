import { NFSeService, NFSE_LAYOUTS, NFSeMunicipioResolver } from '../src/index.js';

const documento = {
  numero: 10,
  serie: 'NF',
  ambiente: 2,
  codigoMunicipio: '3550308',
  cnpjPrestador: '12345678000199',
  inscricaoMunicipal: '12345678',
  optanteSimplesNacional: 1,
  servico: {
    itemListaServico: '01.01',
    discriminacao: 'Consultoria em software',
    codigoMunicipio: '3550308',
    valorServicos: 500,
    aliquotaIss: 5,
    valorIss: 25,
  },
  tomador: {
    cnpj: '98765432000100',
    razaoSocial: 'CLIENTE EXEMPLO LTDA',
    endereco: {
      logradouro: 'Rua A',
      numero: '10',
      bairro: 'Centro',
      codigoMunicipio: '3550308',
      uf: 'SP',
      cep: '01001000',
    },
  },
};

console.log('=== GHINFE — Layouts NFS-e municipais ===\n');

for (const layout of Object.values(NFSE_LAYOUTS)) {
  const service = new NFSeService({ mock: true, layout });
  const xml = service.gerarXml(documento, layout);
  const root = xml.match(/<([A-Za-z]+)[\s>]/)?.[1];
  console.log(`${layout.padEnd(8)} → raiz <${root}> (${xml.length} bytes)`);
}

console.log('\nMunicípios pré-cadastrados:');
for (const ibge of NFSeMunicipioResolver.listarMunicipios()) {
  if (ibge === 'mock') continue;
  const info = NFSeMunicipioResolver.resolver(ibge, 2);
  console.log(`  ${ibge} ${info.nome} [${info.layout}]`);
}

console.log('\nEmissão mock (ABRASF):');
const resultado = await new NFSeService({ mock: true }).emitir(documento);
console.log(`  NFS-e ${resultado.retorno.numeroNfse} — verificação ${resultado.retorno.codigoVerificacao}`);
