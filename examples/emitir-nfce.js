import { NFCeService } from '../src/index.js';

const documento = {
  ambiente: 2,
  ide: { uf: 'SP', codigoMunicipio: '3550308', serie: 1, numero: 1, presenca: 1 },
  emitente: {
    cnpj: '12345678000199',
    razaoSocial: 'LOJA EXEMPLO LTDA',
    nomeFantasia: 'LOJA EXEMPLO',
    ie: '123456789012',
    crt: '1',
    endereco: {
      logradouro: 'Av Paulista', numero: '1000', bairro: 'Bela Vista',
      codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01310100',
    },
  },
  destinatario: {
    cpf: '12345678909',
    razaoSocial: 'CONSUMIDOR FINAL',
  },
  itens: [{
    codigo: '001',
    descricao: 'PRODUTO TESTE NFC-E',
    ncm: '22021000',
    cfop: '5102',
    unidade: 'UN',
    quantidade: 2,
    valorUnitario: 5.5,
    valorTotal: 11.0,
    cst: '00',
    aliquotaIcms: 18,
    valorIcms: 1.98,
  }],
  pagamentos: [{ forma: '17', valor: 11.0 }],
  csc: { idCSC: '000001', codigo: 'CODIGO-CSC-EXEMPLO-SEFAZ' },
  informacoesComplementares: 'NFC-e emitida pela biblioteca GHINFE',
};

const service = new NFCeService({ mock: true });

console.log('=== GHINFE — NFC-e Modelo 65 ===\n');

const doc = service.resolverDocumento(documento);
const xml = service.gerarXml(doc);

console.log('Chave:', doc.chaveAcesso);
console.log('XML base (sem QR Code):', xml.substring(0, 350) + '...\n');
console.log('Nota: QR Code v3 é adicionado após assinatura via adicionarQrCode() ou gerarXmlAssinado()\n');

const retorno = await service.enviar(xml, doc.chaveAcesso);
console.log('Retorno mock SEFAZ (XML sem assinatura — apenas demo):', retorno.cStat, '—', retorno.xMotivo);
