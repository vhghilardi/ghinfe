import { NFeEventoXmlBuilder } from '../builders/NFeEventoXmlBuilder.js';
import { NFeSignService } from './NFeSignService.js';
import { NFeSoapService } from './NFeSoapService.js';
import { NFE_EVENTOS } from '../types/NFeEvento.js';

/**
 * Serviço de eventos NF-e: cancelamento, carta de correção, etc.
 */
export class NFeEventoService {
  /**
   * @param {ConstructorParameters<typeof NFeSoapService>[0]} [soapOptions]
   */
  constructor(soapOptions = {}) {
    this.builder = new NFeEventoXmlBuilder();
    this.signService = new NFeSignService();
    this.soapService = new NFeSoapService(soapOptions);
  }

  /**
   * @param {import('../types/NFeEvento.js').NFeCancelamento} dados
   */
  gerarXmlCancelamento(dados) {
    return this.builder.buildCancelamento(dados);
  }

  /**
   * @param {import('../types/NFeEvento.js').NFeCartaCorrecao} dados
   */
  gerarXmlCartaCorrecao(dados) {
    return this.builder.buildCartaCorrecao(dados);
  }

  /**
   * Cancela NF-e autorizada (evento 110111).
   * @param {import('../types/NFeEvento.js').NFeCancelamento} dados
   * @param {{ pfx: Buffer|string, senha: string }} certificado
   */
  async cancelar(dados, certificado) {
    const xml = this.gerarXmlCancelamento(dados);
    const xmlAssinado = this.signService.assinarEvento(xml, certificado.pfx, certificado.senha);
    const retorno = await this.soapService.enviarEvento(
      xmlAssinado,
      dados.chaveAcesso,
      NFE_EVENTOS.CANCELAMENTO,
      dados.idLote
    );

    return { tipo: 'cancelamento', xmlGerado: xml, xmlAssinado, retorno };
  }

  /**
   * Registra Carta de Correção Eletrônica (evento 110110).
   * @param {import('../types/NFeEvento.js').NFeCartaCorrecao} dados
   * @param {{ pfx: Buffer|string, senha: string }} certificado
   */
  async cartaCorrecao(dados, certificado) {
    const xml = this.gerarXmlCartaCorrecao(dados);
    const xmlAssinado = this.signService.assinarEvento(xml, certificado.pfx, certificado.senha);
    const retorno = await this.soapService.enviarEvento(
      xmlAssinado,
      dados.chaveAcesso,
      NFE_EVENTOS.CARTA_CORRECAO,
      dados.idLote
    );

    return { tipo: 'carta_correcao', xmlGerado: xml, xmlAssinado, retorno };
  }

  /**
   * Envia evento já assinado (mock ou produção).
   * @param {string} xmlAssinado
   * @param {string} chaveAcesso
   * @param {string} tpEvento
   */
  async enviar(xmlAssinado, chaveAcesso, tpEvento) {
    return this.soapService.enviarEvento(xmlAssinado, chaveAcesso, tpEvento);
  }

  /**
   * Payload para persistência de evento no banco.
   * @param {Awaited<ReturnType<NFeEventoService['cancelar']>>} resultado
   */
  toPersistencePayload(resultado) {
    return {
      chave_acesso: resultado.retorno.chaveAcesso ?? null,
      tipo_evento: resultado.tipo,
      xml_evento: resultado.xmlAssinado,
      xml_retorno: resultado.retorno.xmlRetorno,
      protocolo: resultado.retorno.protocolo,
      status: resultado.retorno.cStat,
      motivo: resultado.retorno.xMotivo,
      registrado_em: new Date(),
    };
  }
}
