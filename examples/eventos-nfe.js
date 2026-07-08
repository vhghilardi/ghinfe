import { NFeService } from '../src/index.js';
import { NFE_EVENTOS } from '../src/index.js';

const chaveAcesso = '35260712345678000199550010000000011000000011';

const service = new NFeService({ mock: true, mockEventoScenario: 'registrado' });

console.log('=== GHINFE — Cancelamento e CC-e (mock) ===\n');

// --- Cancelamento ---
const dadosCancelamento = {
  chaveAcesso,
  cnpj: '12345678000199',
  uf: 'SP',
  ambiente: 2,
  protocolo: '135260000000001',
  justificativa: 'Cancelamento por erro de digitacao no pedido do cliente',
};

const xmlCancelamento = service.gerarXmlCancelamento(dadosCancelamento);
console.log('XML Cancelamento (trecho):', xmlCancelamento.substring(0, 300) + '...\n');

const retornoCancelamento = await service.enviarEventoMock(
  xmlCancelamento,
  chaveAcesso,
  NFE_EVENTOS.CANCELAMENTO
);
console.log('Retorno cancelamento:', retornoCancelamento.cStat, '—', retornoCancelamento.xMotivo);
console.log('Protocolo evento:', retornoCancelamento.protocolo, '\n');

// --- Carta de Correção ---
const dadosCce = {
  chaveAcesso,
  cnpj: '12345678000199',
  uf: 'SP',
  ambiente: 2,
  sequencia: 1,
  correcao: 'Correcao do endereco de entrega: Rua Nova, 500, Bairro Centro',
};

const xmlCce = service.gerarXmlCartaCorrecao(dadosCce);
console.log('XML CC-e (trecho):', xmlCce.substring(0, 300) + '...\n');

const retornoCce = await service.enviarEventoMock(
  xmlCce,
  chaveAcesso,
  NFE_EVENTOS.CARTA_CORRECAO
);
console.log('Retorno CC-e:', retornoCce.cStat, '—', retornoCce.xMotivo);
