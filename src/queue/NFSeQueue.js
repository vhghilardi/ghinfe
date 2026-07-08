import Bull from 'bull';
import { NFSeService } from '../nfse/services/NFSeService.js';

/**
 * Fila Bull/Redis para processamento assíncrono de NFS-e.
 */
export class NFSeQueue {
  /**
   * @param {{
   *   redis?: { host?: string, port?: number, password?: string },
   *   queueName?: string,
   *   nfseOptions?: ConstructorParameters<typeof NFSeService>[0],
   * }} [options]
   */
  constructor(options = {}) {
    const redis = options.redis ?? { host: '127.0.0.1', port: 6379 };
    const queueName = options.queueName ?? 'ghinfe:nfse:emissao';

    this.queue = new Bull(queueName, { redis });
    this.nfseService = new NFSeService(options.nfseOptions ?? { mock: true });
    this.#registerProcessor();
  }

  #registerProcessor() {
    this.queue.process(async (job) => {
      const { documento } = job.data;
      return this.nfseService.emitir(documento);
    });
  }

  /**
   * @param {{ documento: import('../nfse/types/NFSeDocument.js').NFSeDocumento }} payload
   */
  async adicionarEmissao(payload) {
    return this.queue.add(payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  /** @param {(resultado: Awaited<ReturnType<NFSeService['emitir']>>, job: Bull.Job) => Promise<void>} handler */
  onCompleted(handler) {
    this.queue.on('completed', async (job, resultado) => {
      await handler(resultado, job);
    });
  }

  onFailed(handler) {
    this.queue.on('failed', async (job, error) => {
      await handler(error, job);
    });
  }

  async close() {
    await this.queue.close();
  }
}
