import {
  gerarChaveAcesso,
  validarChaveAcesso,
  parseChaveAcesso,
  calcularDigitoVerificador,
} from '../src/utils/chave.utils.js';

console.log('=== GHINFE — Chave de Acesso ===\n');

const chave = gerarChaveAcesso({
  uf: 'SP',
  cnpj: '12345678000199',
  modelo: '55',
  serie: 1,
  numero: 42,
  tipoEmissao: 1,
  codigoNumerico: '12345678',
});

console.log('Chave gerada:', chave);
console.log('DV válido:', validarChaveAcesso(chave));
console.log('Parse:', parseChaveAcesso(chave));

const chave43 = chave.substring(0, 43);
console.log('DV calculado:', calcularDigitoVerificador(chave43));
