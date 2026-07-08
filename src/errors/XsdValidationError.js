import { GhinfeError } from './GhinfeError.js';

export class XsdValidationError extends GhinfeError {
  /**
   * @param {string[]} erros
   * @param {string} [schema]
   */
  constructor(erros, schema = 'unknown') {
    const resumo = erros[0] ?? 'XML não conforme ao schema XSD';
    super(`Validação XSD falhou: ${resumo}`, 'XSD_VALIDATION_FAILED', { erros, schema });
    this.name = 'XsdValidationError';
    this.erros = erros;
    this.schema = schema;
  }
}
