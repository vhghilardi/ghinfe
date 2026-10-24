/**
 * @typedef {Object} DCeEndereco
 * @property {string} logradouro
 * @property {string} numero
 * @property {string} [complemento]
 * @property {string} bairro
 * @property {string} codigoMunicipio IBGE 7 dígitos
 * @property {string} municipio
 * @property {string} uf
 * @property {string} cep
 * @property {string} [codigoPais] Padrão 1058 (Brasil)
 * @property {string} [pais] Padrão "BRASIL"
 * @property {string} [telefone]
 * @property {string} [email] Somente destinatário
 */

/**
 * Usuário emitente (quem remete o bem). Informe apenas um entre cnpj, cpf e idOutros.
 * @typedef {Object} DCeParte
 * @property {string} [cnpj]
 * @property {string} [cpf]
 * @property {string} [idOutros] Estrangeiro, indígena, quilombola etc.
 * @property {string} razaoSocial
 * @property {DCeEndereco} endereco
 */

/**
 * @typedef {Object} DCeFisco
 * @property {string} cnpj
 * @property {string} orgao
 * @property {string} uf
 */

/**
 * @typedef {Object} DCeMarketplace
 * @property {string} cnpj
 * @property {string} razaoSocial
 * @property {string} site
 */

/**
 * Transportadora ou ECT (Correios) emitente da DC-e.
 * @typedef {Object} DCeEmpresaEmissora
 * @property {string} cnpj
 * @property {string} razaoSocial
 */

/**
 * @typedef {Object} DCeItem
 * @property {string} descricao
 * @property {string} ncm Capítulo (2 dígitos) ou NCM completo (8). "00000000" se não classificável
 * @property {number} quantidade
 * @property {number} valorUnitario
 * @property {number} [valorTotal] Calculado (quantidade × valorUnitario) se omitido
 * @property {string} [informacoesAdicionais]
 */

/**
 * @typedef {Object} DCeObservacao
 * @property {string} campo Até 20 caracteres
 * @property {string} texto Até 60 caracteres
 */

/**
 * @typedef {Object} DCeInformacoesAdicionais
 * @property {string} [fisco]
 * @property {string} [complementares]
 * @property {string} [marketplace]
 * @property {string} [ect]
 * @property {DCeObservacao[]} [obsEmitente]
 * @property {DCeObservacao[]} [obsFisco]
 * @property {DCeObservacao[]} [obsMarketplace] Também usado por transportadoras
 * @property {DCeObservacao[]} [obsECT]
 */

/**
 * @typedef {Object} DCeIde
 * @property {string} uf UF do usuário emitente
 * @property {number} [serie] 0 a 999 (padrão 1)
 * @property {number} numero 1 a 999999999
 * @property {number} tipoEmitente 0=Fisco, 1=Marketplace, 2=Emissor próprio, 3=Transportadora, 4=ECT
 * @property {number} [tipoEmissao] 1=Normal, 2=Contingência off-line
 * @property {number} [siteAutorizador] 0 quando o autorizador tem site único
 * @property {string} [codigoNumerico] cDC (6 dígitos) — gerado se omitido
 * @property {Date} [dataEmissao]
 */

/**
 * @typedef {Object} DCeDocumento
 * @property {string} [chaveAcesso] 44 dígitos — gerada automaticamente se omitida
 * @property {number} [ambiente] 1=Produção, 2=Homologação
 * @property {DCeIde} ide
 * @property {DCeParte} emitente
 * @property {DCeFisco} [fisco] Obrigatório se tipoEmitente=0
 * @property {DCeMarketplace} [marketplace] Obrigatório se tipoEmitente=1
 * @property {DCeEmpresaEmissora} [transportadora] Obrigatório se tipoEmitente=3
 * @property {DCeEmpresaEmissora} [ect] Obrigatório se tipoEmitente=4
 * @property {DCeParte} destinatario
 * @property {Array<{ cnpj?: string, cpf?: string }>} [autorizadosXml] Até 10
 * @property {DCeItem[]} itens
 * @property {{ modalidade: number, cnpjTransportadora?: string }} transporte 0=Correios, 1=Próprio, 2=Transportadora
 * @property {DCeInformacoesAdicionais} [informacoesAdicionais]
 * @property {string} [solicitacaoFisco] JSON do pedido no app do Fisco (somente tipoEmitente=0)
 */

export {};
