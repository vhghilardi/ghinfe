import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS_ROOT = path.resolve(__dirname, '../../schemas');

/** Caminhos dos schemas XSD oficiais (PL_009_V4 — NF-e/NFC-e 4.00). */
export const XSD_SCHEMAS = {
  NFE: path.join(SCHEMAS_ROOT, 'nfe/PL_009_V4/nfe_v4.00.xsd'),
  ENVI_NFE: path.join(SCHEMAS_ROOT, 'nfe/PL_009_V4/enviNFe_v4.00.xsd'),
  EVENTO: path.join(SCHEMAS_ROOT, 'nfe/PL_009_V4/leiauteNFe_v4.00.xsd'),
};

export const SCHEMAS_ROOT_PATH = SCHEMAS_ROOT;
