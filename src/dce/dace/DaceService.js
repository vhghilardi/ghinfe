import QRCode from 'qrcode';
import { extrairDadosDace } from './dace-extract.js';
import { gerarSvgCode128C } from '../../utils/code128.utils.js';
import { formatarChaveAcesso } from '../../danfe/xml-extract.js';
import { GhinfeError } from '../../errors/GhinfeError.js';

const MODALIDADE = { 0: 'CORREIOS', 1: 'PRÓPRIA', 2: 'TRANSPORTADORA' };
const EMISSOR = { Fisco: 'FISCO', Marketplace: 'MARKETPLACE', Transportadora: 'TRANSPORTADORA', ECT: 'CORREIOS (ECT)' };

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const milhar = (n) => String(n ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function moeda(valor) {
  const [inteiro, centavos] = Number(valor || 0).toFixed(2).split('.');
  return `R$ ${milhar(inteiro)},${centavos}`;
}

function quantidade(valor) {
  const [inteiro, decimais] = String(Number(valor || 0)).split('.');
  return decimais ? `${milhar(inteiro)},${decimais}` : milhar(inteiro);
}

/** "2026-10-24T15:31:12-03:00" → "24-10-2026 15:31:12" (horário local do emitente) */
function dataHora(dh) {
  const m = String(dh ?? '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : String(dh ?? '');
}

/** @param {{ cnpj?: string, cpf?: string, idOutros?: string }} parte */
function documento(parte, mascararCpf) {
  if (!parte) return '';
  if (parte.cnpj) return parte.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (parte.cpf) {
    return mascararCpf
      ? parte.cpf.replace(/^(\d{3})\d{6}(\d{2})$/, '$1.***.***-$2')
      : parte.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return parte.idOutros ?? '';
}

function cidadeUf(endereco) {
  return endereco ? `${endereco.municipio}-${endereco.uf}` : '';
}

function enderecoCompleto(e) {
  if (!e) return '';
  const cep = e.cep ? `CEP ${e.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : '';
  return [
    [e.logradouro, e.numero].filter(Boolean).join(', ') + (e.complemento ? ` - ${e.complemento}` : ''),
    e.bairro,
    cidadeUf(e),
    cep,
  ]
    .filter(Boolean)
    .join(' - ');
}

/**
 * Gera a DACE (Declaração Auxiliar de Conteúdo eletrônica) em HTML imprimível,
 * conforme Manual DC-e — Anexo II (modelos completo e resumido).
 * PDF: imprima o HTML ou converta no sistema consumidor (puppeteer etc.).
 */
export class DaceService {
  /**
   * @param {string} xml dceProc (recomendado) ou DCe assinada
   * @param {{
   *   modelo?: 'completa'|'resumida',
   *   protocolo?: string,
   *   mascararCpf?: boolean,
   *   itensPrimeiraFolha?: number,
   *   itensDemaisFolhas?: number,
   * }} [opcoes]
   *   mascararCpf: padrão true (NNN.***.***-NN, recomendação LGPD da NT 2024.001)
   * @returns {Promise<{ html: string, dados: ReturnType<typeof extrairDadosDace>, tipo: 'DACE'|'DACE_RESUMIDA', folhas: number }>}
   */
  async gerar(xml, opcoes = {}) {
    const dados = extrairDadosDace(xml);
    if (opcoes.protocolo) dados.protocolo = opcoes.protocolo;

    if (!dados.chaveAcesso) {
      throw new GhinfeError('Chave de acesso não encontrada no XML', 'DACE_CHAVE_MISSING');
    }
    if (dados.tipoEmissao !== '2' && !dados.protocolo) {
      throw new GhinfeError(
        'DC-e sem protocolo de autorização. Use o dceProc retornado na autorização ou informe opcoes.protocolo',
        'DACE_SEM_PROTOCOLO'
      );
    }
    if (!dados.qrCode) {
      throw new GhinfeError('XML sem infDCeSupl/qrCodDCe', 'DACE_QRCODE_MISSING');
    }

    const ctx = {
      dados,
      mascararCpf: opcoes.mascararCpf ?? true,
      barras: gerarSvgCode128C(dados.chaveAcesso),
      qrSvg: await QRCode.toString(dados.qrCode, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }),
      homologacao: dados.ambiente === '2',
      contingencia: dados.tipoEmissao === '2',
    };

    if (opcoes.modelo === 'resumida') {
      return { html: this.#renderResumida(ctx), dados, tipo: 'DACE_RESUMIDA', folhas: 1 };
    }

    const primeira = opcoes.itensPrimeiraFolha ?? 12;
    const demais = opcoes.itensDemaisFolhas ?? 34;
    const paginas = [dados.itens.slice(0, primeira)];
    for (let i = primeira; i < dados.itens.length; i += demais) {
      paginas.push(dados.itens.slice(i, i + demais));
    }

    return { html: this.#renderCompleta(ctx, paginas), dados, tipo: 'DACE', folhas: paginas.length };
  }

  #protocolo(ctx) {
    const { dados, contingencia } = ctx;
    if (contingencia) {
      return `<span class="destaque">EMITIDA EM CONTINGÊNCIA</span>${dados.protocolo ? ` ${esc(dados.protocolo)}` : ''}`;
    }
    const recebimento = dados.dhRecbto ? ` ${esc(dataHora(dados.dhRecbto))}` : '';
    return `${esc(dados.protocolo)}${recebimento}`;
  }

  #campo(rotulo, valor, classe = '') {
    return `<div class="campo ${classe}"><div class="rot">${esc(rotulo)}</div><div class="val">${valor}</div></div>`;
  }

  #cabecalho(ctx, folha, totalFolhas) {
    const { dados } = ctx;
    return `
    <div class="quadro cab">
      <div class="titulo">
        <div class="dace">DACE</div>
        <div class="sub">DECLARAÇÃO AUXILIAR DE CONTEÚDO ELETRÔNICA</div>
        <div class="num">Nº ${esc(milhar(dados.numero))} &nbsp; SÉRIE ${esc(dados.serie)}</div>
        <div class="nfolha">FOLHA ${String(folha).padStart(2, '0')}/${String(totalFolhas).padStart(2, '0')}</div>
      </div>
      <div class="ident">
        <div class="barras">${ctx.barras}</div>
        ${this.#campo('CHAVE DE ACESSO', `<span class="chave">${esc(formatarChaveAcesso(dados.chaveAcesso))}</span>`)}
        <div class="linha">
          ${this.#campo('DATA DE EMISSÃO', esc(dataHora(dados.dhEmi)))}
          ${this.#campo('MODALIDADE DO TRANSPORTE', `${esc(dados.modalidadeTransporte)}-${esc(MODALIDADE[dados.modalidadeTransporte] ?? '')}`)}
        </div>
        ${this.#campo('PROTOCOLO DE AUTORIZAÇÃO', this.#protocolo(ctx))}
      </div>
    </div>`;
  }

  #quadroParte(titulo, rotulo, parte, ctx) {
    return `
    <div class="secao">${esc(titulo)}</div>
    <div class="quadro grade">
      ${this.#campo(`CNPJ/CPF ${rotulo}`, esc(documento(parte, ctx.mascararCpf)))}
      ${this.#campo(`NOME ${rotulo}`, esc(parte?.nome))}
      ${this.#campo(`CIDADE-UF ${rotulo}`, esc(cidadeUf(parte?.endereco)))}
      ${this.#campo(`ENDEREÇO ${rotulo}`, esc(enderecoCompleto(parte?.endereco)))}
    </div>`;
  }

  #tabelaItens(itens, ctx, comTotal) {
    const linhas = itens
      .map(
        (i) => `<tr>
          <td class="c">${esc(i.nItem)}</td>
          <td>${esc(i.descricao)}${i.informacoesAdicionais ? `<div class="adic">${esc(i.informacoesAdicionais)}</div>` : ''}</td>
          <td class="r">${esc(quantidade(i.quantidade))}</td>
          <td class="r">${esc(moeda(i.valorTotal))}</td>
        </tr>`
      )
      .join('');

    return `
    <div class="secao">IDENTIFICAÇÃO DOS BENS OU MERCADORIAS</div>
    <table>
      <thead><tr><th class="c">ITEM</th><th>DESCRIÇÃO</th><th class="r">QUANTIDADE</th><th class="r">VALOR</th></tr></thead>
      <tbody>${linhas}</tbody>
      ${comTotal ? `<tfoot><tr><td colspan="3" class="r"><b>VALOR TOTAL</b></td><td class="r"><b>${esc(moeda(ctx.dados.valorTotal))}</b></td></tr></tfoot>` : ''}
    </table>`;
  }

  #dadosAdicionais(ctx) {
    const { dados, homologacao } = ctx;
    const complementares = [
      homologacao ? '<span class="destaque">EMITIDA EM HOMOLOGAÇÃO — SEM VALOR FISCAL</span>' : '',
      esc(dados.informacoesComplementares),
      esc(dados.informacoesMarketplace),
      esc(dados.informacoesECT),
    ]
      .filter(Boolean)
      .join('<br/>');

    return `
    <div class="secao">DADOS ADICIONAIS</div>
    <div class="quadro linha">
      ${this.#campo('INFORMAÇÕES COMPLEMENTARES', complementares || '&nbsp;', 'meio')}
      ${this.#campo('INFORMAÇÕES ADICIONAIS DO FISCO', esc(dados.informacoesFisco) || '&nbsp;', 'meio')}
    </div>
    <div class="quadro rodape">
      <div class="qr">${ctx.qrSvg}</div>
      <div class="obs">
        <div class="rot">OBSERVAÇÕES</div>
        ${dados.observacoes.map((o) => `<p>${esc(o)}</p>`).join('')}
      </div>
    </div>`;
  }

  #estilos(extra = '') {
    return `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; }
  .rot { font-size: 6.5pt; color: #333; text-transform: uppercase; }
  .val { font-size: 8.5pt; font-weight: bold; word-break: break-word; }
  .destaque { color: #b00000; font-weight: bold; }
  .chave { letter-spacing: .5px; font-size: 9pt; }
  .marca { position: absolute; top: 45%; left: 0; right: 0; text-align: center; transform: rotate(-30deg);
    font-size: 40pt; font-weight: bold; color: rgba(176,0,0,.14); pointer-events: none; z-index: 2; }
  ${extra}`;
  }

  #renderCompleta(ctx, paginas) {
    const { dados } = ctx;
    const total = paginas.length;
    const emissor = dados.empresaEmissora;

    const folhas = paginas.map((itens, idx) => {
      const primeira = idx === 0;
      return `
  <section class="folha">
    ${ctx.homologacao ? '<div class="marca">EMITIDA EM HOMOLOGAÇÃO</div>' : ''}
    ${this.#cabecalho(ctx, idx + 1, total)}
    ${this.#quadroParte('IDENTIFICAÇÃO DO REMETENTE (USUÁRIO EMITENTE)', 'REMETENTE', dados.emitente, ctx)}
    ${primeira ? this.#quadroParte('IDENTIFICAÇÃO DO DESTINATÁRIO', 'DESTINATÁRIO', dados.destinatario, ctx) : ''}
    ${primeira && emissor ? `
    <div class="secao">IDENTIFICAÇÃO DO ${esc(EMISSOR[emissor.tipo])}</div>
    <div class="quadro grade">
      ${this.#campo(`CNPJ ${EMISSOR[emissor.tipo]}`, esc(documento({ cnpj: emissor.cnpj })))}
      ${this.#campo(`NOME ${EMISSOR[emissor.tipo]}`, esc(emissor.nome))}
    </div>` : ''}
    ${this.#tabelaItens(itens, ctx, primeira)}
    ${primeira ? this.#dadosAdicionais(ctx) : ''}
  </section>`;
    });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>DACE ${esc(dados.chaveAcesso)}</title>
<style>${this.#estilos(`
  @page { size: A4 portrait; margin: 8mm; }
  .folha { width: 194mm; margin: 0 auto; position: relative; z-index: 1; }
  .folha + .folha { page-break-before: always; break-before: page; margin-top: 8mm; }
  .quadro { border: 1px solid #000; margin-bottom: 1.5mm; }
  .campo { padding: 1mm 1.5mm; border-right: 1px solid #000; border-bottom: 1px solid #000; }
  .cab { display: grid; grid-template-columns: 62mm 1fr; }
  .cab .titulo { border-right: 1px solid #000; padding: 2mm; text-align: center; display: flex; flex-direction: column; justify-content: center; gap: 1.5mm; }
  .dace { font-size: 22pt; font-weight: bold; letter-spacing: 2px; }
  .sub { font-size: 8pt; font-weight: bold; }
  .num { font-size: 10pt; font-weight: bold; }
  .nfolha { font-size: 8pt; }
  .ident .campo:last-child, .grade .campo:nth-child(2n), .linha .campo:last-child { border-right: none; }
  .ident > .campo:last-child { border-bottom: none; }
  .barras { height: 15mm; padding: 1mm 4mm; border-bottom: 1px solid #000; }
  .barras svg { width: 100%; height: 100%; display: block; }
  .linha { display: flex; } .linha .campo { flex: 1; }
  .grade { display: grid; grid-template-columns: 52mm 1fr; }
  .grade .campo:nth-last-child(-n+2) { border-bottom: none; }
  .quadro.linha .campo { border-bottom: none; }
  .secao { font-size: 7pt; font-weight: bold; margin: 2mm 0 .5mm; }
  table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 1.5mm; }
  th, td { border: 1px solid #000; padding: .8mm 1.5mm; vertical-align: top; }
  th { font-size: 6.5pt; background: #eee; }
  .c { text-align: center; width: 12mm; } .r { text-align: right; white-space: nowrap; }
  .adic { font-size: 6.5pt; color: #333; }
  .meio { min-height: 16mm; }
  .rodape { display: grid; grid-template-columns: 38mm 1fr; }
  .qr { padding: 2mm; border-right: 1px solid #000; } .qr svg { width: 34mm; height: 34mm; display: block; }
  .obs { padding: 1.5mm 2mm; } .obs p { font-size: 6.5pt; margin: 1mm 0; text-align: justify; }
  @media screen { body { background: #888; padding: 8mm 0; } .folha { background: #fff; padding: 8mm; width: 210mm; } }
`)}</style>
</head>
<body>
  ${folhas.join('')}
</body>
</html>`;
  }

  #renderResumida(ctx) {
    const { dados } = ctx;
    const emissor = dados.empresaEmissora;
    const linha = (rotulo, valor) => `<div><span class="rot">${esc(rotulo)}:</span> <b>${valor}</b></div>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>DACE Resumida ${esc(dados.chaveAcesso)}</title>
<style>${this.#estilos(`
  @page { size: 100mm 150mm; margin: 3mm; }
  .etiqueta { width: 94mm; margin: 0 auto; border: 1px solid #000; padding: 2mm; font-size: 7.5pt; position: relative; z-index: 1; background: #fff; }
  .topo { text-align: center; font-weight: bold; font-size: 8.5pt; border-bottom: 1px solid #000; padding-bottom: 1.5mm; margin-bottom: 1.5mm; }
  .bloco { border-bottom: 1px solid #000; padding: 1mm 0; line-height: 1.35; }
  .bloco .rot { font-size: 6.5pt; }
  .obs p { font-size: 5.5pt; margin: .8mm 0; text-align: justify; }
  .final { display: grid; grid-template-columns: 26mm 1fr; gap: 2mm; align-items: center; padding-top: 1.5mm; }
  .final svg.qr, .final .qr svg { width: 26mm; height: 26mm; display: block; }
  .barras { height: 11mm; } .barras svg { width: 100%; height: 100%; display: block; }
  .chave { font-size: 7.5pt; text-align: center; margin-top: 1mm; }
  .marca { font-size: 18pt; }
  @media screen { body { background: #888; padding: 8mm 0; } }
`)}</style>
</head>
<body>
  <div class="etiqueta">
    ${ctx.homologacao ? '<div class="marca">EMITIDA EM HOMOLOGAÇÃO</div>' : ''}
    <div class="topo">DACE RESUMIDA - DECLARAÇÃO AUXILIAR DE CONTEÚDO ELETRÔNICA</div>
    <div class="bloco">
      ${linha('Nº', `${esc(milhar(dados.numero))} &nbsp; SÉRIE ${esc(dados.serie)}`)}
      ${linha('DATA DE EMISSÃO', esc(dataHora(dados.dhEmi)))}
      ${linha('PROTOCOLO DE AUTORIZAÇÃO', this.#protocolo(ctx))}
      ${linha('MODALIDADE DO TRANSPORTE', `${esc(dados.modalidadeTransporte)}-${esc(MODALIDADE[dados.modalidadeTransporte] ?? '')}`)}
    </div>
    <div class="bloco">
      ${linha('CNPJ/CPF REMETENTE (USUÁRIO EMITENTE)', esc(documento(dados.emitente, ctx.mascararCpf)))}
      ${linha('NOME REMETENTE', esc(dados.emitente?.nome))}
      ${linha('CIDADE-UF REMETENTE', esc(cidadeUf(dados.emitente?.endereco)))}
      ${linha('ENDEREÇO REMETENTE', esc(enderecoCompleto(dados.emitente?.endereco)))}
    </div>
    <div class="bloco">
      ${linha('CNPJ/CPF DESTINATÁRIO', esc(documento(dados.destinatario, ctx.mascararCpf)))}
      ${linha('NOME DESTINATÁRIO', esc(dados.destinatario?.nome))}
      ${linha('CIDADE-UF DESTINATÁRIO', esc(cidadeUf(dados.destinatario?.endereco)))}
      ${linha('ENDEREÇO DESTINATÁRIO', esc(enderecoCompleto(dados.destinatario?.endereco)))}
    </div>
    ${emissor ? `<div class="bloco">
      ${linha(`CNPJ ${EMISSOR[emissor.tipo]}`, esc(documento({ cnpj: emissor.cnpj })))}
      ${linha(`NOME ${EMISSOR[emissor.tipo]}`, esc(emissor.nome))}
    </div>` : ''}
    ${ctx.homologacao ? '<div class="bloco destaque">EMITIDA EM HOMOLOGAÇÃO — SEM VALOR FISCAL</div>' : ''}
    <div class="bloco obs">${dados.observacoes.map((o) => `<p>${esc(o)}</p>`).join('')}</div>
    <div class="final">
      <div class="qr">${ctx.qrSvg}</div>
      <div>
        <div class="barras">${ctx.barras}</div>
        <div class="chave"><span class="rot" style="text-transform:none">CHAVE DE ACESSO DC-e</span><br/><b>${esc(formatarChaveAcesso(dados.chaveAcesso))}</b></div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
