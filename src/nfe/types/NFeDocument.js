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
 * @property {string} crt 1=Simples Nacional, 2=Simples excesso sublimite, 3=Normal, 4=MEI.
 *   CRT 1 e 4 geram ICMS por CSOSN (item.csosn); CRT 2 e 3 por CST (item.cst)
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
 * @property {number|string} [origem] Origem da mercadoria (orig), padrão 0
 * @property {string} [cst] Regime normal (CRT 2/3): 00, 40, 41, 50 ou 60. Padrão 00
 * @property {string} [csosn] Simples/MEI (CRT 1/4): 101, 102, 103, 201, 202, 203, 300, 400, 500 ou 900. Padrão 102
 * @property {number} [aliquotaIcms] pICMS (CST 00 e CSOSN 900)
 * @property {number} [valorIcms] vICMS; calculado (base × alíquota) se omitido
 * @property {number} [baseIcms] vBC; padrão valorTotal
 * @property {number} [modalidadeBcIcms] modBC, padrão 3 (valor da operação)
 * @property {number} [aliquotaCreditoSn] pCredSN (CSOSN 101, 201 e opcional no 900)
 * @property {number} [valorCreditoSn] vCredICMSSN; calculado se omitido
 * @property {NFeIcmsSt} [icmsSt] ICMS-ST (CSOSN 201, 202, 203 e opcional no 900)
 * @property {import('../../reforma/ibscbs.js').TributacaoRTC} [reforma] IBS/CBS (PL_010)
 */

/**
 * @typedef {Object} NFeIcmsSt
 * @property {number} [modalidade] modBCST, padrão 4 (MVA)
 * @property {number} [mva] pMVAST
 * @property {number} [reducaoBase] pRedBCST
 * @property {number} base vBCST
 * @property {number} aliquota pICMSST
 * @property {number} valor vICMSST
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
 * @property {string} forma 01=Dinheiro, 03=Cartão crédito, 99=Outros etc.
 * @property {number} valor
 * @property {string} [descricao] xPag; obrigatório para forma 99 (padrão "Outros")
 */

/**
 * @typedef {Object} NFeIde
 * @property {string} uf Sigla UF (ex: "SP")
 * @property {string} codigoMunicipio IBGE
 * @property {number} [serie]
 * @property {number} numero
 * @property {number} [tipoEmissao] 1=Normal
 * @property {number} [destino] idDest: 1=interna, 2=interestadual, 3=exterior.
 *   Padrão: comparado pelas UFs do emitente e do destinatário (UF "EX" = exterior)
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
