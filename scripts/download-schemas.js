/**
 * Baixa schemas XSD oficiais NF-e/NFC-e (PL_009_V4) do repositório nfephp-org/sped-nfe.
 * Execute: node scripts/download-schemas.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../schemas/nfe/PL_009_V4');
const BASE = 'https://raw.githubusercontent.com/nfephp-org/sped-nfe/master/schemes/PL_009_V4';

const FILES = [
  'nfe_v4.00.xsd',
  'leiauteNFe_v4.00.xsd',
  'tiposBasico_v4.00.xsd',
  'xmldsig-core-schema_v1.01.xsd',
  'enviNFe_v4.00.xsd',
  'inutNFe_v4.00.xsd',
  'consReciNFe_v4.00.xsd',
  'consSitNFe_v4.00.xsd',
  'consStatServ_v4.00.xsd',
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const file of FILES) {
  const url = `${BASE}/${file}`;
  const dest = path.join(OUT_DIR, file);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`⚠ Não foi possível baixar: ${file}`);
    continue;
  }
  fs.writeFileSync(dest, await res.text());
  console.log(`✓ ${file}`);
}

console.log(`\nSchemas salvos em: ${OUT_DIR}`);
