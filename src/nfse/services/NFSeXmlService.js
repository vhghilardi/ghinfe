import { NFSeXmlBuilder } from '../builders/NFSeXmlBuilder.js';

export class NFSeXmlService {
  constructor() {
    this.builder = new NFSeXmlBuilder();
  }

  /** @param {import('../types/NFSeDocument.js').NFSeDocumento} documento @param {string} [layout] */
  gerarXml(documento, layout) {
    return this.builder.buildGerarNfse(documento, layout);
  }
}
