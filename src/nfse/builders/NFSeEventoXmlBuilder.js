import { create } from 'xmlbuilder2';
import { NFSE_NAMESPACE } from '../constants/municipios.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

/**
 * XML de cancelamento e substituição de NFS-e (padrão ABRASF 2.04).
 */
export class NFSeEventoXmlBuilder {
  /**
   * @param {{
   *   numeroNfse: string,
   *   cnpjPrestador: string,
   *   inscricaoMunicipal: string,
   *   codigoMunicipio: string,
   *   codigoCancelamento?: string,
   * }} dados
   */
  buildCancelamento(dados) {
    if (!dados.numeroNfse) throw new GhinfeError('numeroNfse é obrigatório', 'NFSE_CANCEL_NUMERO');
    if (!dados.cnpjPrestador) throw new GhinfeError('cnpjPrestador é obrigatório', 'NFSE_CANCEL_CNPJ');

    const id = `Cancelamento_${dados.numeroNfse}`;
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CancelarNfseEnvio', { xmlns: NFSE_NAMESPACE })
      .ele('Pedido')
      .ele('InfPedidoCancelamento', { Id: id });

    const inf = doc;
    const ident = inf.ele('IdentificacaoNfse');
    ident.ele('Numero').txt(String(dados.numeroNfse)).up();
    ident.ele('Cnpj').txt(dados.cnpjPrestador.replace(/\D/g, '')).up();
    ident.ele('InscricaoMunicipal').txt(dados.inscricaoMunicipal).up();
    ident.ele('CodigoMunicipio').txt(dados.codigoMunicipio).up();
    ident.up();
    inf.ele('CodigoCancelamento').txt(dados.codigoCancelamento ?? '2').up();

    return doc.end({ prettyPrint: false, headless: false });
  }

  /**
   * Substituição = pedido de cancelamento da NFS-e substituída + novo RPS.
   * O XML do novo RPS deve ser passado já montado (GerarNfseEnvio / lote).
   *
   * @param {{
   *   numeroNfseSubstituida: string,
   *   cnpjPrestador: string,
   *   inscricaoMunicipal: string,
   *   codigoMunicipio: string,
   *   codigoCancelamento?: string,
   *   xmlRpsSubstituto: string,
   * }} dados
   */
  buildSubstituicao(dados) {
    if (!dados.numeroNfseSubstituida) {
      throw new GhinfeError('numeroNfseSubstituida é obrigatório', 'NFSE_SUBST_NUMERO');
    }
    if (!dados.xmlRpsSubstituto) {
      throw new GhinfeError('xmlRpsSubstituto é obrigatório', 'NFSE_SUBST_RPS');
    }

    const cancelamento = this.buildCancelamento({
      numeroNfse: dados.numeroNfseSubstituida,
      cnpjPrestador: dados.cnpjPrestador,
      inscricaoMunicipal: dados.inscricaoMunicipal,
      codigoMunicipio: dados.codigoMunicipio,
      codigoCancelamento: dados.codigoCancelamento ?? '1',
    });

    // Extrai InfPedidoCancelamento e Rps interno do RPS substituto
    const pedidoMatch = cancelamento.match(/<Pedido>[\s\S]*?<\/Pedido>/);
    const rpsInner = this.#extrairRps(dados.xmlRpsSubstituto);

    return `<?xml version="1.0" encoding="UTF-8"?>
<SubstituirNfseEnvio xmlns="${NFSE_NAMESPACE}">
  <SubstituicaoNfse Id="Substituicao_${dados.numeroNfseSubstituida}">
    ${pedidoMatch?.[0] ?? ''}
    <Rps>${rpsInner}</Rps>
  </SubstituicaoNfse>
</SubstituirNfseEnvio>`;
  }

  /** @param {string} xmlRps */
  #extrairRps(xmlRps) {
    const inf = xmlRps.match(/<(InfRps|InfDeclaracaoPrestacaoServico)[\s\S]*?<\/\1>/);
    if (inf) return inf[0];
    const rps = xmlRps.match(/<Rps[\s\S]*?<\/Rps>/);
    if (rps) {
      return rps[0].replace(/^<Rps[^>]*>/, '').replace(/<\/Rps>$/, '');
    }
    return xmlRps.replace(/^<\?xml[^?]*\?>/, '').trim();
  }
}
