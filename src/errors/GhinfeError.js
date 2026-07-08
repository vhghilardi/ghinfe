export class GhinfeError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {unknown} [details]
   */
  constructor(message, code = 'GHINFE_ERROR', details = null) {
    super(message);
    this.name = 'GhinfeError';
    this.code = code;
    this.details = details;
  }
}
