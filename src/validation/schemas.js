import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS_ROOT = path.resolve(__dirname, '../../schemas');

/** Caminhos dos schemas XSD oficiais (NF-e/NFC-e PL_009_V4 e DC-e PL_DCe_v1.00a + NT 2024.001). */
export const XSD_SCHEMAS = {
  NFE: path.join(SCHEMAS_ROOT, 'nfe/PL_009_V4/nfe_v4.00.xsd'),
  ENVI_NFE: path.join(SCHEMAS_ROOT, 'nfe/PL_009_V4/enviNFe_v4.00.xsd'),
  EVENTO: path.join(SCHEMAS_ROOT, 'nfe/PL_009_V4/leiauteNFe_v4.00.xsd'),
  DCE: path.join(SCHEMAS_ROOT, 'dce/PL_DCe_100a_NT2024.001/dce_v1.00.xsd'),
  DCE_PROC: path.join(SCHEMAS_ROOT, 'dce/PL_DCe_100a_NT2024.001/procDCe_v1.00.xsd'),
  DCE_EVENTO: path.join(SCHEMAS_ROOT, 'dce/PL_DCe_100a_NT2024.001/evento/eventoDCe_v1.00.xsd'),
  DCE_EVENTO_CANCELAMENTO: path.join(SCHEMAS_ROOT, 'dce/PL_DCe_100a_NT2024.001/evento/evCancDCe_v1.00.xsd'),
};

export const SCHEMAS_ROOT_PATH = SCHEMAS_ROOT;
