import { NFeService } from '../src/index.js';

console.log('=== GHINFE — Status SEFAZ (mock) ===\n');

const service = new NFeService({ mock: true });

for (const cenario of ['ok', 'paralisado']) {
  service.soapService.setMockStatusScenario(cenario);
  const status = await service.consultarStatus('SP', 2);
  console.log(`[${cenario}] cStat=${status.cStat} — ${status.xMotivo}`);
  console.log(`  emOperacao=${status.emOperacao} tMed=${status.tMed}\n`);
}
