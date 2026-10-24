import { DCeService, DCE_TIPO_EMITENTE, DCE_MODALIDADE_TRANSPORTE, parseChaveAcessoDCe } from '../src/index.js';

const documento = {
  ambiente: 2,
  ide: {
    uf: 'SP',
    serie: 1,
    numero: 42,
    tipoEmitente: DCE_TIPO_EMITENTE.MARKETPLACE,
  },
  emitente: {
    cpf: '12345678909',
    razaoSocial: 'JOAO DA SILVA',
    endereco: {
      logradouro: 'Rua das Flores', numero: '100', bairro: 'Centro',
      codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01001000',
      telefone: '11999998888',
    },
  },
  marketplace: {
    cnpj: '12345678000199',
    razaoSocial: 'MARKETPLACE EXEMPLO LTDA',
    site: 'www.marketplace-exemplo.com.br',
  },
  destinatario: {
    cpf: '98765432100',
    razaoSocial: 'MARIA SOUZA',
    endereco: {
      logradouro: 'Av Brasil', numero: '2000', complemento: 'Apto 12', bairro: 'Jardim America',
      codigoMunicipio: '4106902', municipio: 'Curitiba', uf: 'PR', cep: '80000000',
      email: 'maria@example.com',
    },
  },
  itens: [
    { descricao: 'LIVRO USADO', ncm: '49019900', quantidade: 2, valorUnitario: 35.5 },
    { descricao: 'CAMISETA', ncm: '61', quantidade: 1, valorUnitario: 49.9, informacoesAdicionais: 'Tamanho M' },
  ],
  transporte: { modalidade: DCE_MODALIDADE_TRANSPORTE.CORREIOS },
  informacoesAdicionais: {
    complementares: 'Venda entre pessoas fisicas via marketplace',
    obsMarketplace: [{ campo: 'Pedido', texto: 'MP-2026-000042' }],
  },
};

const service = new DCeService();

console.log('=== GHINFE — DC-e Modelo 99 ===\n');

const doc = service.resolverDocumento(documento);
console.log('Chave:', doc.chaveAcesso);
console.log('Campos da chave:', parseChaveAcessoDCe(doc.chaveAcesso), '\n');

const xml = service.gerarXml(doc, { validarXsd: true });
console.log('XSD: válido (dce_v1.00.xsd, assinatura validada com stub)');
console.log('QR Code:', service.gerarQrCode(doc), '\n');
console.log(xml.substring(0, 600) + '...\n');

console.log('Para assinar: service.gerarXmlAssinado(documento, { pfx, senha })');
