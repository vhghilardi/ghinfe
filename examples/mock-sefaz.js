import { NFeService } from '../src/index.js';
import { SefazError } from '../src/errors/SefazError.js';

const documentoBase = {
  chaveAcesso: '35260712345678000199550010000000021000000021',
  ambiente: 2,
  ide: { uf: 'SP', codigoMunicipio: '3550308', serie: 1, numero: 2 },
  emitente: {
    cnpj: '12345678000199',
    razaoSocial: 'EMPRESA EXEMPLO LTDA',
    ie: '123456789012',
    crt: '3',
    endereco: {
      logradouro: 'Rua Exemplo', numero: '1', bairro: 'Centro',
      codigoMunicipio: '3550308', municipio: 'São Paulo', uf: 'SP', cep: '01001000',
    },
  },
  destinatario: {
    cpf: '12345678909',
    razaoSocial: 'CONSUMIDOR FINAL',
    indIEDest: 9,
    endereco: {
      logradouro: 'Rua B', numero: '2', bairro: 'Centro',
      codigoMunicipio: '3550308', municipio: 'São Paulo', uf: 'SP', cep: '01001000',
    },
  },
  itens: [{
    codigo: '001', descricao: 'PRODUTO TESTE', ncm: '84713012', cfop: '5102',
    unidade: 'UN', quantidade: 1, valorUnitario: 50, valorTotal: 50,
  }],
};

const cenarios = ['autorizado', 'duplicidade', 'schema', 'certificado', 'paralisado'];

console.log('=== GHINFE — Mock SEFAZ — Cenários de retorno ===\n');

for (const cenario of cenarios) {
  const service = new NFeService({ mock: true, mockScenario: cenario });
  const xml = service.gerarXml(documentoBase);

  try {
    const retorno = await service.enviar(xml, documentoBase.chaveAcesso);
    console.log(`[${cenario}] cStat=${retorno.cStat} — ${retorno.xMotivo}`);
    if (retorno.protocolo) console.log(`  Protocolo: ${retorno.protocolo}`);
  } catch (error) {
    if (error instanceof SefazError) {
      console.log(`[${cenario}] REJEIÇÃO cStat=${error.cStat} — ${error.xMotivo}`);
    } else {
      throw error;
    }
  }
}
