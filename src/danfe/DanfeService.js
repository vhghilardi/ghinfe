import QRCode from 'qrcode';
import { extrairDadosDanfe, formatarChaveAcesso } from './xml-extract.js';
import { GhinfeError } from '../errors/GhinfeError.js';

/**
 * Gera DANFE (NF-e) e DANFCE (NFC-e) em HTML imprimível.
 * PDF: imprima o HTML ou use um conversor no sistema consumidor (puppeteer, etc.).
 */
export class DanfeService {
  /**
   * @param {string} xmlNFe XML autorizado (nfeProc) ou NFe assinada
   * @param {{ protocolo?: string, titulo?: string }} [opcoes]
   * @returns {Promise<{ html: string, dados: object, tipo: 'DANFE' }>}
   */
  async gerarDanfe(xmlNFe, opcoes = {}) {
    const dados = extrairDadosDanfe(xmlNFe);
    if (!dados.chaveAcesso) {
      throw new GhinfeError('Chave de acesso não encontrada no XML', 'DANFE_CHAVE_MISSING');
    }
    if (opcoes.protocolo) dados.protocolo = opcoes.protocolo;

    const html = this.#renderDanfe(dados, opcoes.titulo ?? 'DANFE — Documento Auxiliar da NF-e');
    return { html, dados, tipo: 'DANFE' };
  }

  /**
   * @param {string} xmlNFCe
   * @param {{ protocolo?: string, qrCodeUrl?: string, titulo?: string }} [opcoes]
   * @returns {Promise<{ html: string, dados: object, tipo: 'DANFCE', qrCodeDataUrl?: string }>}
   */
  async gerarDanfce(xmlNFCe, opcoes = {}) {
    const dados = extrairDadosDanfe(xmlNFCe);
    if (!dados.chaveAcesso) {
      throw new GhinfeError('Chave de acesso não encontrada no XML', 'DANFCE_CHAVE_MISSING');
    }
    if (opcoes.protocolo) dados.protocolo = opcoes.protocolo;
    if (opcoes.qrCodeUrl) dados.qrCode = opcoes.qrCodeUrl;

    let qrCodeDataUrl = '';
    if (dados.qrCode) {
      qrCodeDataUrl = await QRCode.toDataURL(dados.qrCode, { width: 180, margin: 1 });
    }

    const html = this.#renderDanfce(dados, qrCodeDataUrl, opcoes.titulo ?? 'NFC-e — Cupom Fiscal Eletrônico');
    return { html, dados, tipo: 'DANFCE', qrCodeDataUrl };
  }

  /**
   * Detecta modelo e gera o documento adequado.
   * @param {string} xml
   * @param {object} [opcoes]
   */
  async gerar(xml, opcoes = {}) {
    const dados = extrairDadosDanfe(xml);
    if (dados.modelo === '65') return this.gerarDanfce(xml, opcoes);
    return this.gerarDanfe(xml, opcoes);
  }

  #esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  #renderDanfe(d, titulo) {
    const chaveFmt = formatarChaveAcesso(d.chaveAcesso);
    const linhas = d.itens.map((i, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${this.#esc(i.codigo)}</td>
        <td>${this.#esc(i.descricao)}</td>
        <td>${this.#esc(i.ncm)}</td>
        <td>${this.#esc(i.cfop)}</td>
        <td>${this.#esc(i.unidade)}</td>
        <td class="r">${this.#esc(i.quantidade)}</td>
        <td class="r">${this.#esc(i.valorUnitario)}</td>
        <td class="r">${this.#esc(i.valorTotal)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${this.#esc(titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 16px; }
  h1 { font-size: 14px; margin: 0 0 8px; text-align: center; }
  .box { border: 1px solid #333; padding: 8px; margin-bottom: 8px; }
  .row { display: flex; gap: 8px; }
  .col { flex: 1; }
  .label { color: #555; font-size: 9px; text-transform: uppercase; }
  .val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #999; padding: 4px; }
  th { background: #eee; font-size: 9px; }
  .r { text-align: right; }
  .chave { letter-spacing: 1px; font-size: 12px; font-weight: bold; word-break: break-all; }
  .homolog { color: #b00; font-weight: bold; text-align: center; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>${this.#esc(titulo)}</h1>
  ${d.ambiente === '2' ? '<p class="homolog">NF-e EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL</p>' : ''}
  <div class="box row">
    <div class="col">
      <div class="label">Emitente</div>
      <div class="val">${this.#esc(d.emitente.razaoSocial)}</div>
      <div>CNPJ ${this.#esc(d.emitente.cnpj)} — IE ${this.#esc(d.emitente.ie)}</div>
      <div>${this.#esc(d.emitente.municipio)} / ${this.#esc(d.emitente.uf)}</div>
    </div>
    <div class="col">
      <div class="label">Documento</div>
      <div>NF-e nº <strong>${this.#esc(d.numero)}</strong> — Série ${this.#esc(d.serie)}</div>
      <div>Emissão: ${this.#esc(d.dhEmi)}</div>
      <div>Nat. Op.: ${this.#esc(d.naturezaOperacao)}</div>
      <div>Protocolo: ${this.#esc(d.protocolo || '—')}</div>
    </div>
  </div>
  <div class="box">
    <div class="label">Destinatário</div>
    <div class="val">${this.#esc(d.destinatario.razaoSocial)}</div>
    <div>CPF/CNPJ ${this.#esc(d.destinatario.doc)}</div>
  </div>
  <div class="box">
    <div class="label">Chave de acesso</div>
    <div class="chave">${this.#esc(chaveFmt)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Cód.</th><th>Descrição</th><th>NCM</th><th>CFOP</th>
        <th>Un</th><th>Qtd</th><th>V. Unit</th><th>V. Total</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="box row" style="margin-top:8px">
    <div class="col"><div class="label">Produtos</div><div class="val">R$ ${this.#esc(d.totais.vProd)}</div></div>
    <div class="col"><div class="label">ICMS</div><div class="val">R$ ${this.#esc(d.totais.vICMS)}</div></div>
    <div class="col"><div class="label">Frete</div><div class="val">R$ ${this.#esc(d.totais.vFrete)}</div></div>
    <div class="col"><div class="label">Total NF</div><div class="val">R$ ${this.#esc(d.totais.vNF)}</div></div>
  </div>
  ${d.informacoesComplementares ? `<div class="box"><div class="label">Informações complementares</div>${this.#esc(d.informacoesComplementares)}</div>` : ''}
  <p style="text-align:center;color:#666;margin-top:12px">Documento gerado por GHINFE — representação auxiliar</p>
</body>
</html>`;
  }

  #renderDanfce(d, qrDataUrl, titulo) {
    const chaveFmt = formatarChaveAcesso(d.chaveAcesso);
    const linhas = d.itens.map((i) => `
      <tr>
        <td>${this.#esc(i.descricao)}</td>
        <td class="r">${this.#esc(i.quantidade)}</td>
        <td class="r">${this.#esc(i.valorUnitario)}</td>
        <td class="r">${this.#esc(i.valorTotal)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${this.#esc(titulo)}</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 302px; margin: 8px auto; color: #000; }
  h1 { font-size: 13px; text-align: center; margin: 0 0 6px; }
  .c { text-align: center; }
  .r { text-align: right; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  img.qr { display: block; margin: 8px auto; }
  .homolog { color: #b00; font-weight: bold; text-align: center; font-size: 11px; }
  @media print { body { margin: 0; width: 80mm; } }
</style>
</head>
<body>
  <h1>${this.#esc(d.emitente.razaoSocial)}</h1>
  <div class="c">CNPJ ${this.#esc(d.emitente.cnpj)} IE ${this.#esc(d.emitente.ie)}</div>
  <div class="c">${this.#esc(d.emitente.municipio)}/${this.#esc(d.emitente.uf)}</div>
  <hr/>
  <div class="c"><strong>${this.#esc(titulo)}</strong></div>
  ${d.ambiente === '2' ? '<p class="homolog">EMITIDA EM HOMOLOGAÇÃO — SEM VALOR FISCAL</p>' : ''}
  <div class="c">NFC-e nº ${this.#esc(d.numero)} Série ${this.#esc(d.serie)}</div>
  <div class="c">${this.#esc(d.dhEmi)}</div>
  <hr/>
  <table>
    <thead><tr><td>Item</td><td class="r">Qtd</td><td class="r">Vl Un</td><td class="r">Total</td></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <hr/>
  <div class="c"><strong>TOTAL R$ ${this.#esc(d.totais.vNF)}</strong></div>
  <div class="c">Protocolo: ${this.#esc(d.protocolo || '—')}</div>
  <hr/>
  <div class="c" style="font-size:10px;word-break:break-all">${this.#esc(chaveFmt)}</div>
  ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="QR Code NFC-e" width="160" height="160"/>` : '<p class="c">(QR Code indisponível — assine e adicione infNFeSupl)</p>'}
  <p class="c" style="font-size:10px">Consulte pela chave de acesso no portal da SEFAZ</p>
</body>
</html>`;
  }
}
