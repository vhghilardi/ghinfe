import { DCeXmlService } from './DCeXmlService.js';
import { DCeSoapService } from './DCeSoapService.js';
import { DCeEventoXmlBuilder } from '../builders/DCeEventoXmlBuilder.js';
import { DaceService } from '../dace/DaceService.js';
import { NFeSignService } from '../../nfe/services/NFeSignService.js';
import { GhinfeError } from '../../errors/GhinfeError.js';
import { gerarChaveAcessoDCe, parseChaveAcessoDCe } from '../../utils/chave.utils.js';
import { assinarChaveQrCodeDCe, gerarUrlQrCodeDCe } from '../utils/qrcode.utils.js';
import { DCE_MODELO, DCE_TIPO_EMITENTE, DCE_TIPO_EMISSAO } from '../constants/dce.js';

/**
 * Orquestrador da DC-e (Declaração de Conteúdo eletrônica, modelo 99).
 */
export class DCeService {
  /**
   * @param {{
   *   certificado?: { pfx: Buffer|string, senha: string },
   *   ambiente?: number,
   *   timeout?: number,
   *   compactar?: boolean,
   *   validarXsd?: boolean,
   *   qrCodeUrl?: string,
   *   urlChave?: string,
   * }} [options]
   *   certificado: obrigatório para comunicação com a SEFAZ (TLS mútuo e assinatura)
   *   compactar: envia a DC-e via dceAutorizacaoZip (GZip + Base64)
   */
  constructor(options = {}) {
    this.options = options;
    this.ambiente = options.ambiente ?? 2;
    this.xmlService = new DCeXmlService({ validarXsd: options.validarXsd });
    this.signService = new NFeSignService();
    this.eventoBuilder = new DCeEventoXmlBuilder();
    this.soapService = options.certificado
      ? new DCeSoapService({ certificado: options.certificado, ambiente: this.ambiente, timeout: options.timeout })
      : null;
  }

  #certificado() {
    if (!this.options.certificado || !this.soapService) {
      throw new GhinfeError(
        'Informe options.certificado no DCeService para comunicar com a SEFAZ',
        'DCE_CERTIFICADO_AUSENTE'
      );
    }
    return this.options.certificado;
  }

  /**
   * CNPJ que compõe a chave: de quem emite/assina a DC-e.
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento
   */
  #cnpjChave(documento) {
    const tpEmit = documento.ide.tipoEmitente;
    const origem = {
      [DCE_TIPO_EMITENTE.FISCO]: ['fisco', documento.fisco],
      [DCE_TIPO_EMITENTE.MARKETPLACE]: ['marketplace', documento.marketplace],
      [DCE_TIPO_EMITENTE.EMISSOR_PROPRIO]: ['emitente', documento.emitente],
      [DCE_TIPO_EMITENTE.TRANSPORTADORA]: ['transportadora', documento.transportadora],
      [DCE_TIPO_EMITENTE.ECT]: ['ect', documento.ect],
    }[tpEmit];

    if (!origem) {
      throw new GhinfeError(`ide.tipoEmitente inválido: ${tpEmit}`, 'DCE_TP_EMIT_INVALIDO');
    }
    const [campo, parte] = origem;
    if (!parte?.cnpj) {
      throw new GhinfeError(`${campo}.cnpj é obrigatório para tipoEmitente=${tpEmit}`, 'DCE_CNPJ_CHAVE_AUSENTE');
    }
    return parte.cnpj;
  }

  /**
   * Gera a chave de acesso (se ausente) e fixa a data de emissão usada no AAMM e no dhEmi.
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento
   */
  resolverDocumento(documento) {
    const ambiente = documento.ambiente ?? this.ambiente;

    if (documento.chaveAcesso) {
      const chave = parseChaveAcessoDCe(documento.chaveAcesso);
      if (!chave.valida) {
        throw new GhinfeError('chaveAcesso com dígito verificador inválido', 'CHAVE_DV_INVALIDO');
      }
      if (chave.modelo !== DCE_MODELO) {
        throw new GhinfeError('chaveAcesso não é de DC-e (modelo 99)', 'DCE_MODELO_INVALIDO');
      }
      return { ...documento, ambiente };
    }

    const dataEmissao = documento.ide.dataEmissao ?? new Date();
    const chaveAcesso = gerarChaveAcessoDCe({
      uf: documento.ide.uf,
      cnpj: this.#cnpjChave(documento),
      serie: documento.ide.serie ?? 1,
      numero: documento.ide.numero,
      tipoEmitente: documento.ide.tipoEmitente,
      tipoEmissao: documento.ide.tipoEmissao,
      siteAutorizador: documento.ide.siteAutorizador,
      codigoNumerico: documento.ide.codigoNumerico,
      dataEmissao,
    });

    return { ...documento, ambiente, ide: { ...documento.ide, dataEmissao }, chaveAcesso };
  }

  /**
   * Monta a URL do QR Code. Em contingência off-line exige o certificado para o parâmetro sign.
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento Já resolvido (com chaveAcesso)
   * @param {{ pfx: Buffer|string, senha: string }} [certificado]
   */
  gerarQrCode(documento, certificado) {
    const { tipoEmissao } = parseChaveAcessoDCe(documento.chaveAcesso);
    const offline = tipoEmissao === DCE_TIPO_EMISSAO.CONTINGENCIA_OFFLINE;

    if (offline && !certificado) {
      throw new GhinfeError(
        'Certificado obrigatório para gerar o QR Code em contingência off-line',
        'DCE_QRCODE_CERTIFICADO_AUSENTE'
      );
    }

    return gerarUrlQrCodeDCe({
      chaveAcesso: documento.chaveAcesso,
      ambiente: documento.ambiente ?? 2,
      tipoEmissao,
      emitente: documento.emitente,
      sign: offline ? assinarChaveQrCodeDCe(documento.chaveAcesso, certificado.pfx, certificado.senha) : undefined,
      baseUrl: this.options.qrCodeUrl,
    });
  }

  /**
   * Gera XML completo (com infDCeSupl) sem assinatura.
   * Em contingência off-line use gerarXmlAssinado — o QR Code depende do certificado.
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento
   * @param {{ validarXsd?: boolean }} [options]
   */
  gerarXml(documento, options = {}) {
    const doc = this.resolverDocumento(documento);
    return this.xmlService.gerarXml(doc, {
      validarXsd: options.validarXsd,
      qrCode: this.gerarQrCode(doc),
      urlChave: this.options.urlChave ?? this.options.qrCodeUrl,
    });
  }

  /**
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento
   * @param {{ pfx: Buffer|string, senha: string }} certificado
   * @param {{ validarXsd?: boolean }} [options]
   */
  gerarXmlAssinado(documento, certificado, options = {}) {
    const doc = this.resolverDocumento(documento);
    const qrCode = this.gerarQrCode(doc, certificado);

    const xml = this.xmlService.gerarXml(doc, {
      validarXsd: false,
      qrCode,
      urlChave: this.options.urlChave ?? this.options.qrCodeUrl,
    });
    const xmlAssinado = this.signService.assinarDCe(xml, certificado.pfx, certificado.senha);

    if (options.validarXsd ?? this.xmlService.validarXsd) {
      this.xmlService.validarXml(xmlAssinado);
    }

    return { chaveAcesso: doc.chaveAcesso, xml: xmlAssinado, qrCode };
  }

  /** @param {string} xml */
  validarXsd(xml) {
    return this.xmlService.validarXml(xml);
  }

  /**
   * Consulta status do web service de autorização (DCeStatusServico).
   * @param {string} [uf]
   */
  async consultarStatus(uf) {
    this.#certificado();
    return this.soapService.consultarStatus(uf);
  }

  /**
   * Gera, assina, valida (XSD) e envia a DC-e para autorização.
   * Lança SefazError em caso de rejeição.
   * @param {import('../types/DCeDocument.js').DCeDocumento} documento
   * @param {{ compactar?: boolean }} [options]
   */
  async emitir(documento, options = {}) {
    const certificado = this.#certificado();
    const doc = this.resolverDocumento(documento);

    if (doc.ambiente !== this.ambiente) {
      throw new GhinfeError(
        `documento.ambiente (${doc.ambiente}) difere do ambiente do serviço (${this.ambiente})`,
        'DCE_AMBIENTE_DIVERGENTE'
      );
    }

    const { xml, qrCode } = this.gerarXmlAssinado(doc, certificado, { validarXsd: true });
    const retorno = await this.soapService.autorizar(xml, {
      compactar: options.compactar ?? this.options.compactar,
    });

    return { chaveAcesso: doc.chaveAcesso, qrCode, xmlAssinado: xml, retorno };
  }

  /**
   * Consulta situação da DC-e na SEFAZ (DCeConsulta).
   * @param {string} chaveAcesso
   */
  async consultar(chaveAcesso) {
    this.#certificado();
    return this.soapService.consultar(chaveAcesso);
  }

  /**
   * Cancela a DC-e (evento 110111). Prazo: até 24h após a autorização.
   * @param {{
   *   chaveAcesso: string,
   *   protocolo: string,
   *   justificativa: string,
   *   emitente: { cnpj?: string, cpf?: string, idOutros?: string },
   *   sequencia?: number,
   *   dataEvento?: Date,
   * }} params emitente: mesmo usuário emitente (grupo emit) da DC-e
   */
  async cancelar(params) {
    const certificado = this.#certificado();
    const xmlEvento = this.eventoBuilder.buildCancelamento({ ...params, ambiente: this.ambiente });
    const xmlAssinado = this.signService.assinarEvento(xmlEvento, certificado.pfx, certificado.senha);
    this.xmlService.validarEvento(xmlAssinado);

    const retorno = await this.soapService.enviarEvento(xmlAssinado);
    return { chaveAcesso: params.chaveAcesso, xmlEvento: xmlAssinado, retorno };
  }

  /**
   * Gera a DACE em HTML a partir do dceProc (ou do resultado de emitir()).
   * @param {string|Awaited<ReturnType<DCeService['emitir']>>} xmlOuResultado
   * @param {Parameters<DaceService['gerar']>[1]} [opcoes]
   */
  async gerarDace(xmlOuResultado, opcoes) {
    const xml = typeof xmlOuResultado === 'string' ? xmlOuResultado : xmlOuResultado.retorno.xmlProc;
    return new DaceService().gerar(xml, opcoes);
  }

  /** @param {Awaited<ReturnType<DCeService['emitir']>>} resultado */
  toPersistencePayload(resultado) {
    return {
      chave_acesso: resultado.chaveAcesso,
      modelo: DCE_MODELO,
      xml_dce: resultado.retorno.xmlProc,
      protocolo: resultado.retorno.protocolo,
      qrcode_url: resultado.qrCode,
      status: resultado.retorno.cStat,
      motivo: resultado.retorno.xMotivo,
      autorizado_em: resultado.retorno.dhRecbto ? new Date(resultado.retorno.dhRecbto) : new Date(),
    };
  }
}
