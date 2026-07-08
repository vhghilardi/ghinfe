import { NFSeService } from '../src/index.js';

const basePrestador = {
  cnpjPrestador: '12345678000199',
  inscricaoMunicipal: '12345678',
  codigoMunicipio: '3550308',
};

const documento = {
  numero: 20,
  serie: 'NF',
  ambiente: 2,
  ...basePrestador,
  optanteSimplesNacional: 1,
  servico: {
    itemListaServico: '01.01',
    discriminacao: 'Servico de consultoria',
    codigoMunicipio: '3550308',
    valorServicos: 800,
    aliquotaIss: 5,
    valorIss: 40,
  },
  tomador: {
    cnpj: '98765432000100',
    razaoSocial: 'CLIENTE LTDA',
    endereco: {
      logradouro: 'Rua X', numero: '1', bairro: 'Centro',
      codigoMunicipio: '3550308', uf: 'SP', cep: '01001000',
    },
  },
};

const service = new NFSeService({ mock: true });

console.log('=== GHINFE — Cancelamento e Substituição NFS-e ===\n');

const emitido = await service.emitir(documento);
console.log('Emitida:', emitido.retorno.numeroNfse, emitido.retorno.codigoVerificacao);

const cancelado = await service.cancelar({
  ...basePrestador,
  numeroNfse: emitido.retorno.numeroNfse,
});
console.log('Cancelamento:', cancelado.retorno.cancelado, '— NFS-e', cancelado.retorno.numeroNfse);

const substituto = { ...documento, numero: 21, servico: { ...documento.servico, valorServicos: 900, valorIss: 45 } };
const subst = await service.substituir({
  ...basePrestador,
  numeroNfseSubstituida: emitido.retorno.numeroNfse,
  documentoSubstituto: substituto,
});
console.log(
  'Substituição: nova',
  subst.retorno.numeroNfse,
  'substituiu',
  subst.retorno.numeroNfseSubstituida
);
