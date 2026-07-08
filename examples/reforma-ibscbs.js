import { calcularIBSCBS, buildFragmentoIBSCBS, somarTotaisReforma, REFORMA_LAYOUT } from '../src/index.js';

console.log(`=== GHINFE — Reforma Tributária (${REFORMA_LAYOUT}) ===\n`);

const itens = [
  { descricao: 'Produto A', valorTotal: 100 },
  { descricao: 'Produto B', valorTotal: 250 },
].map((item) => ({
  ...item,
  reforma: calcularIBSCBS(item.valorTotal, {
    pIBSUF: 0.1,
    pIBSMun: 0.05,
    pCBS: 0.9,
    cClassTrib: '000001',
  }),
}));

for (const item of itens) {
  console.log(`${item.descricao}: BC=${item.reforma.vBC}`);
  console.log(`  IBS-UF=${item.reforma.vIBSUF} IBS-Mun=${item.reforma.vIBSMun} CBS=${item.reforma.vCBS}`);
}

const totais = somarTotaisReforma(itens);
console.log('\nTotais:', totais);
console.log('\nFragmento XML experimental (item 1):\n');
console.log(buildFragmentoIBSCBS(itens[0].reforma));
console.log('\nNota: fragmento não é injetado no XML NF-e até schemas PL_010 estáveis.');
