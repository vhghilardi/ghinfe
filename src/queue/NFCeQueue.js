import Bull from 'bull';
import { NFCeService } from '../nfce/services/NFCeService.js';

/**
 * Fila Bull/Redis para processamento assíncrono de NFC-e.
 */
export class NFCeQueue {
  /**
   * @param {{
   *   redis?: { host?: string, port?: number, password?: string },
   *   queueName?: string,
   *   nfceOptions?: ConstructorParameters<typeof NFCeService>[0],
   * }} [options]
   */
  constructor(options = {}) {
    const redis = options.redis ?? { host: '127.0.0.1', port: 6379 };
    const queueName = options.queueName ?? 'ghinfe:nfce:emissao';

    this.queue = new Bull(queueName, { redis });
    this.nfceService = new NFCeService(options.nfceOptions ?? { mock: true });
    this.#registerProcessor();
  }

  #registerProcessor() {
    this.queue.process(async (job) => {
      const { documento, certificado } = job.data;
      return this.nfceService.emitir(documento, certificado);
    });
  }

  /**
   * @param {{
   *   documento: import('../nfce/types/NFCeDocument.js').NFCeDocumento,
   *   certificado: { pfx: Buffer|string, senha: string },
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

  /** @param {(resultado: Awaited<ReturnType<NFCeService['emitir']>>, job: Bull.Job) => Promise<void>} handler */
  onCompleted(handler) {
    this.queue.on('completed', async (job, resultado) => {
      await handler(resultado, job);
    });
  }

  /** @param {(error: Error, job: Bull.Job) => Promise<void>} handler */
  onFailed(handler) {
    this.queue.on('failed', async (job, error) => {
      await handler(error, job);
    });
  }

  async close() {
    await this.queue.close();
  }
}
