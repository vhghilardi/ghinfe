/**
 * @typedef {Object} NFeEndereco
 * @property {string} logradouro
 * @property {string} numero
 * @property {string} [complemento]
 * @property {string} bairro
 * @property {string} codigoMunicipio IBGE 7 dígitos
 * @property {string} municipio
 * @property {string} uf
 * @property {string} cep
 * @property {string} [telefone]
 */

/**
 * @typedef {Object} NFeEmitente
 * @property {string} cnpj
 * @property {string} razaoSocial
 * @property {string} [nomeFantasia]
 * @property {string} ie
 * @property {string} crt 1=Simples, 2=Simples excesso, 3=Normal
 * @property {NFeEndereco} endereco
 */

/**
 * @typedef {Object} NFeDestinatario
 * @property {string} [cnpj]
 * @property {string} [cpf]
 * @property {string} razaoSocial
 * @property {string} [ie]
 * @property {number} [indIEDest] 1=Contribuinte, 2=Isento, 9=Não contribuinte
 * @property {NFeEndereco} endereco
 */

/**
 * @typedef {Object} NFeItem
 * @property {string} codigo
 * @property {string} descricao
 * @property {string} ncm
 * @property {string} cfop
 * @property {string} unidade
 * @property {number} quantidade
 * @property {number} valorUnitario
 * @property {number} valorTotal
 * @property {string} [ean]
 * @property {string} [cst] CST ICMS (ex: "00")
 * @property {number} [aliquotaIcms]
 * @property {number} [valorIcms]
 * @property {import('../../reforma/ibscbs.js').TributacaoRTC} [reforma] IBS/CBS (PL_010)
 */

/**
 * @typedef {Object} NFeFrete
 * @property {number} modalidade 0=Emitente, 1=Destinatário, 9=Sem frete
 * @property {number} [valor]
 * @property {string} [transportadora]
 * @property {string} [cnpjTransportadora]
 */

/**
 * @typedef {Object} NFePagamento
 * @property {string} forma 01=Dinheiro, 03=Cartão crédito, etc.
 * @property {number} valor
 */

/**
 * @typedef {Object} NFeIde
 * @property {string} uf Sigla UF (ex: "SP")
 * @property {string} codigoMunicipio IBGE
 * @property {number} [serie]
 * @property {number} numero
 * @property {number} [tipoEmissao] 1=Normal
 * @property {number} [finalidade] 1=Normal
 * @property {number} [consumidorFinal] 0=Não, 1=Sim
 * @property {number} [presenca] 1=Presencial
 * @property {number} [naturezaOperacao]
 */

/**
 * @typedef {Object} NFeDocumento
 * @property {string} [chaveAcesso] 44 dígitos — gerada automaticamente se omitida
 * @property {number} [ambiente] 1=Produção, 2=Homologação
 * @property {boolean} [reformaTributaria] força totais IBS/CBS mesmo sem item.reforma
 * @property {NFeIde} ide
 * @property {NFeEmitente} emitente
 * @property {NFeDestinatario} destinatario
 * @property {NFeItem[]} itens
 * @property {NFeFrete} [frete]
 * @property {NFePagamento[]} [pagamentos]
 * @property {string} [informacoesComplementares]
 */

export {};
