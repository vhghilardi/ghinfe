/**
 * @typedef {Object} NFSeTomador
 * @property {string} [cnpj]
 * @property {string} [cpf]
 * @property {string} razaoSocial
 * @property {string} [email]
 * @property {string} [telefone]
 * @property {Object} [endereco]
 * @property {string} endereco.logradouro
 * @property {string} endereco.numero
 * @property {string} [endereco.complemento]
 * @property {string} endereco.bairro
 * @property {string} endereco.codigoMunicipio IBGE
 * @property {string} endereco.uf
 * @property {string} endereco.cep
 */

/**
 * @typedef {Object} NFSeServico
 * @property {string} itemListaServico LC 116 (ex: "01.01")
 * @property {string} discriminacao
 * @property {string} codigoMunicipio IBGE prestação
 * @property {number} valorServicos
 * @property {number} [valorDeducoes]
 * @property {number} [valorPis]
 * @property {number} [valorCofins]
 * @property {number} [valorInss]
 * @property {number} [valorIr]
 * @property {number} [valorCsll]
 * @property {number} [aliquotaIss]
 * @property {number} [valorIss]
 * @property {number} [descontoIncondicionado]
 * @property {number} [descontoCondicionado]
 * @property {number} [issRetido] 1=Sim, 2=Não
 */

/**
 * @typedef {Object} NFSeDocumento
 * @property {number} numero RPS
 * @property {string} [serie]
 * @property {number} [tipo] 1=RPS
 * @property {number} [ambiente] 1=Produção, 2=Homologação
 * @property {string} codigoMunicipio IBGE do prestador
 * @property {string} cnpjPrestador
 * @property {string} inscricaoMunicipal
 * @property {number} [naturezaOperacao] 1=Tributação no município
 * @property {number} [optanteSimplesNacional] 1=Sim, 2=Não
 * @property {number} [incentivadorCultural] 1=Sim, 2=Não
 * @property {NFSeServico} servico
 * @property {NFSeTomador} tomador
 * @property {string} [informacoesComplementares]
 */

export {};
