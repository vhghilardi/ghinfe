/**
 * Gera a DACE (completa e resumida) em HTML.
 *
 *   node examples/gerar-dace.js                      # DC-e de demonstração (protocolo fictício)
 *   node examples/gerar-dace.js caminho/dceProc.xml  # DC-e autorizada
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DCeService, DaceService, DCE_TIPO_EMITENTE, DCE_MODALIDADE_TRANSPORTE } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../tmp');
fs.mkdirSync(outDir, { recursive: true });

const arquivo = process.argv[2];
let xml;
let opcoes = {};

if (arquivo) {
  xml = fs.readFileSync(arquivo, 'utf8');
} else {
  const endereco = {
    logradouro: 'Rua das Flores', numero: '100', complemento: 'Casa 2', bairro: 'Centro',
    codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01001000',
  };
  xml = new DCeService().gerarXml({
    ambiente: 2,
    ide: { uf: 'SP', serie: 1, numero: 123456, tipoEmitente: DCE_TIPO_EMITENTE.MARKETPLACE },
    emitente: { cpf: '12345678909', razaoSocial: 'JOAO DA SILVA', endereco },
    marketplace: { cnpj: '12345678000199', razaoSocial: 'MARKETPLACE EXEMPLO LTDA', site: 'www.exemplo.com.br' },
    destinatario: {
      cnpj: '98765432000198',
      razaoSocial: 'LOJA DESTINO LTDA',
      endereco: { ...endereco, logradouro: 'Av Brasil', numero: '2000', complemento: undefined, codigoMunicipio: '4106902', municipio: 'Curitiba', uf: 'PR', cep: '80000000' },
    },
    itens: Array.from({ length: 18 }, (_, i) => ({
      descricao: `ITEM DE DEMONSTRACAO ${i + 1}`,
      ncm: '63022100',
      quantidade: i + 1,
      valorUnitario: 12.5,
      informacoesAdicionais: i === 0 ? 'Devolucao - pedido 4521' : undefined,
    })),
    transporte: { modalidade: DCE_MODALIDADE_TRANSPORTE.CORREIOS },
    informacoesAdicionais: { complementares: 'Devolucao de mercadoria adquirida via marketplace' },
  });
  opcoes = { protocolo: '1352600000000001' };
}

const dace = new DaceService();
const completa = await dace.gerar(xml, opcoes);
const resumida = await dace.gerar(xml, { ...opcoes, modelo: 'resumida' });

fs.writeFileSync(path.join(outDir, 'dace-completa.html'), completa.html);
fs.writeFileSync(path.join(outDir, 'dace-resumida.html'), resumida.html);

console.log(`DACE completa (${completa.folhas} folha(s)): tmp/dace-completa.html`);
console.log('DACE resumida: tmp/dace-resumida.html');
console.log('Abra no navegador e imprima / "Salvar como PDF".');
