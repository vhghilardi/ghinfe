import Bull from 'bull';
import { NFeService } from '../nfe/services/NFeService.js';

/**
 * Fila Bull/Redis para processamento assíncrono de NF-e.
 * Integra com Sequelize no worker: persista o retorno após autorização.
 *
 * @example
 * const queue = new NFeQueue({ redis: { host: '127.0.0.1', port: 6379 } });
 * await queue.adicionarEmissao({ documento, certificado });
 * queue.processar(async (resultado) => { await NotaFiscal.create(...); });
 */
export class NFeQueue {
  /**
   * @param {{
   *   redis?: { host?: string, port?: number, password?: string },
   *   queueName?: string,
   *   nfeOptions?: ConstructorParameters<typeof NFeService>[0],
   * }} [options]
   */
  constructor(options = {}) {
    const redis = options.redis ?? { host: '127.0.0.1', port: 6379 };
    const queueName = options.queueName ?? 'ghinfe:nfe:emissao';

    this.queue = new Bull(queueName, { redis });
    this.nfeService = new NFeService(options.nfeOptions ?? { mock: true });
    this.#registerProcessor();
  }

  #registerProcessor() {
    this.queue.process(async (job) => {
      const { documento, certificado, idLote } = job.data;
      const resultado = await this.nfeService.emitir(documento, certificado, idLote);
      return resultado;
    });
  }

  /**
   * @param {{
   *   documento: import('../nfe/types/NFeDocument.js').NFeDocument,
   *   certificado: { pfx: Buffer|string, senha: string },
   *   idLote?: string,
   * }} payload
   */
  async adicionarEmissao(payload) {
    return this.queue.add(payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  /**
   * Callback executado após emissão bem-sucedida (ex: salvar no Sequelize).
   * @param {(resultado: Awaited<ReturnType<NFeService['emitir']>>, job: Bull.Job) => Promise<void>} handler
   */
  onCompleted(handler) {
    this.queue.on('completed', async (job, resultado) => {
      await handler(resultado, job);
    });
  }

  /**
   * @param {(error: Error, job: Bull.Job) => Promise<void>} handler
   */
  onFailed(handler) {
    this.queue.on('failed', async (job, error) => {
      await handler(error, job);
    });
  }

  async close() {
    await this.queue.close();
  }
}
