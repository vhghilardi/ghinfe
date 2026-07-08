/**
 * @typedef {import('../../nfe/types/NFeDocument.js').NFeEndereco} NFCeEndereco
 * @typedef {import('../../nfe/types/NFeDocument.js').NFeEmitente} NFCeEmitente
 * @typedef {import('../../nfe/types/NFeDocument.js').NFeItem} NFCeItem
 * @typedef {import('../../nfe/types/NFeDocument.js').NFePagamento} NFCePagamento
 */

/**
 * @typedef {Object} NFCeDestinatario
 * @property {string} [cpf]
 * @property {string} [cnpj]
 * @property {string} [razaoSocial]
 * @property {NFCeEndereco} [endereco]
 */

/**
 * @typedef {Object} NFCeCsc
 * @property {string} idCSC Identificador do CSC (ex "000001")
 * @property {string} codigo Código CSC fornecido pela SEFAZ
 */

/**
 * @typedef {Object} NFCeDocumento
 * @property {string} [chaveAcesso]
 * @property {number} [ambiente] 1=Produção, 2=Homologação
 * @property {Object} ide
 * @property {string} ide.uf
 * @property {string} ide.codigoMunicipio
 * @property {number} [ide.serie]
 * @property {number} ide.numero
 * @property {string} [ide.naturezaOperacao]
 * @property {number} [ide.presenca] 1=Presencial, 4=Entrega domicílio
 * @property {NFCeEmitente} emitente
 * @property {NFCeDestinatario} [destinatario]
 * @property {NFCeItem[]} itens
 * @property {NFCePagamento[]} [pagamentos]
 * @property {NFCeCsc} csc Dados do CSC para QR Code
 * @property {string} [informacoesComplementares]
 * @property {string} [informacoesFisco]
 */

export {};
