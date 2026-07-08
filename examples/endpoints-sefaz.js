import { SefazEndpointResolver } from '../src/index.js';

console.log('=== GHINFE — Endpoints SEFAZ Multi-UF ===\n');

const ufs = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'BA', 'GO'];

for (const uf of ufs) {
  const { autorizador, endpoints } = SefazEndpointResolver.obterEndpoints(uf, 2);
  console.log(`${uf} → ${autorizador}`);
  console.log(`  Autorização: ${endpoints.autorizacao?.substring(0, 70)}...`);
  console.log(`  Evento:      ${endpoints.evento?.substring(0, 70)}...\n`);
}

console.log('Total UFs suportadas:', SefazEndpointResolver.listarUFs().length);
