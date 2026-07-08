import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NFeService, NFCeService, DanfeService } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../tmp');
fs.mkdirSync(outDir, { recursive: true });

const danfe = new DanfeService();

const nfeDoc = {
  ambiente: 2,
  ide: { uf: 'SP', codigoMunicipio: '3550308', serie: 1, numero: 50 },
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
    razaoSocial: 'CONSUMIDOR FINAL',
    indIEDest: 9,
    endereco: {
      logradouro: 'Rua B', numero: '2', bairro: 'Centro',
      codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01001000',
    },
  },
  itens: [{
    codigo: '001', descricao: 'PRODUTO DANFE', ncm: '84713012', cfop: '5102',
    unidade: 'UN', quantidade: 2, valorUnitario: 50, valorTotal: 100,
  }],
  frete: { modalidade: 9 },
  pagamentos: [{ forma: '01', valor: 100 }],
};

const nfeService = new NFeService({ mock: true });
const nfeResolved = nfeService.resolverDocumento(nfeDoc);
const xmlNfe = nfeService.gerarXml(nfeResolved);
const { html: htmlDanfe } = await danfe.gerarDanfe(xmlNfe, { protocolo: '135260000000001' });
const danfePath = path.join(outDir, 'danfe.html');
fs.writeFileSync(danfePath, htmlDanfe);

const nfceDoc = {
  ambiente: 2,
  ide: { uf: 'SP', codigoMunicipio: '3550308', serie: 1, numero: 7 },
  emitente: nfeDoc.emitente,
  destinatario: { cpf: '12345678909', razaoSocial: 'CONSUMIDOR' },
  itens: [{
    codigo: '001', descricao: 'PRODUTO NFC-E', ncm: '22021000', cfop: '5102',
    unidade: 'UN', quantidade: 1, valorUnitario: 15, valorTotal: 15,
  }],
  pagamentos: [{ forma: '01', valor: 15 }],
  csc: { idCSC: '000001', codigo: 'CSC-EXEMPLO' },
};

const nfceService = new NFCeService({ mock: true });
const nfceResolved = nfceService.resolverDocumento(nfceDoc);
const xmlNfce = nfceService.gerarXml(nfceResolved);
const { html: htmlDanfce } = await danfe.gerarDanfce(xmlNfce, {
  protocolo: '135260000000099',
  qrCodeUrl: 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta?p=EXEMPLO',
});
const danfcePath = path.join(outDir, 'danfce.html');
fs.writeFileSync(danfcePath, htmlDanfce);

console.log('=== GHINFE — DANFE / DANFCE ===\n');
console.log('DANFE  →', danfePath);
console.log('DANFCE →', danfcePath);
console.log('\nAbra os HTML no navegador e use Imprimir / Salvar PDF.');
