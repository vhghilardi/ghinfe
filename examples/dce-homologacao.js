/**
 * DC-e em homologação (SEFA-PR) com certificado A1 real.
 *
 * Certificado (um dos dois):
 *   DCE_PFX=./cert/certificado.pfx DCE_PFX_SENHA=...
 *   DCE_CERT_PEM=./cert/cert.pem DCE_KEY_PEM=./cert/key.pem
 *
 * Titular do certificado: CNPJ e razão social vêm do certificado; endereço via JSON:
 *   DCE_EMIT_ENDERECO='{"logradouro":"...","numero":"...","bairro":"...","codigoMunicipio":"...","municipio":"...","uf":"..","cep":"..."}'
 *
 * Modalidade (DCE_TIPO_EMITENTE):
 *   proprio (padrão)  titular é o usuário emitente — só para não contribuintes do ICMS (senão: rejeição 812)
 *   marketplace       titular emite em nome de pessoa física (CPF de teste) e é o destinatário
 *
 * Uso:
 *   node examples/dce-homologacao.js status
 *   node examples/dce-homologacao.js emitir [numero]
 *   node examples/dce-homologacao.js consultar <chave>
 *   node examples/dce-homologacao.js cancelar <chave> <protocolo> [cpf|cnpj do usuário emitente]
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DCeService,
  DCE_TIPO_EMITENTE,
  DCE_MODALIDADE_TRANSPORTE,
  SefazError,
  loadPfxCertificate,
  criarPfxDePem,
} from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../tmp/dce');

function carregarCertificado() {
  if (process.env.DCE_PFX) {
    return { pfx: fs.readFileSync(process.env.DCE_PFX), senha: process.env.DCE_PFX_SENHA ?? '' };
  }
  if (process.env.DCE_CERT_PEM && process.env.DCE_KEY_PEM) {
    const senha = 'ghinfe-memoria';
    const pfx = criarPfxDePem(
      fs.readFileSync(process.env.DCE_CERT_PEM, 'utf8'),
      fs.readFileSync(process.env.DCE_KEY_PEM, 'utf8'),
      senha
    );
    return { pfx, senha };
  }
  throw new Error('Defina DCE_PFX/DCE_PFX_SENHA ou DCE_CERT_PEM/DCE_KEY_PEM');
}

/** CN do e-CNPJ ICP-Brasil: "RAZAO SOCIAL:CNPJ" */
function titularCertificado(certificado) {
  const { certificate } = loadPfxCertificate(certificado.pfx, certificado.senha);
  const cn = certificate.subject.getField('CN')?.value ?? '';
  const [razaoSocial, cnpj] = cn.split(':');
  return { razaoSocial, cnpj };
}

function salvar(nome, conteudo) {
  fs.mkdirSync(outDir, { recursive: true });
  const arquivo = path.join(outDir, nome);
  fs.writeFileSync(arquivo, conteudo);
  return arquivo;
}

const certificado = carregarCertificado();
const service = new DCeService({ certificado, ambiente: 2 });
const [comando = 'status', ...args] = process.argv.slice(2);

try {
  if (comando === 'status') {
    const status = await service.consultarStatus();
    console.log(status.cStat, '—', status.xMotivo, `(tMed ${status.tMed ?? '-'}s)`);
  } else if (comando === 'emitir') {
    if (!process.env.DCE_EMIT_ENDERECO) throw new Error('Defina DCE_EMIT_ENDERECO (JSON)');
    const endereco = JSON.parse(process.env.DCE_EMIT_ENDERECO);
    const titular = { ...titularCertificado(certificado), endereco };
    const pessoaFisica = {
      cpf: '12345678909',
      razaoSocial: 'PESSOA FISICA TESTE',
      endereco: {
        logradouro: 'Rua XV de Novembro', numero: '100', bairro: 'Centro',
        codigoMunicipio: '4106902', municipio: 'Curitiba', uf: 'PR', cep: '80020310',
      },
    };
    const marketplace = process.env.DCE_TIPO_EMITENTE === 'marketplace';
    const emitente = marketplace ? pessoaFisica : titular;

    const resultado = await service.emitir({
      ide: {
        uf: emitente.endereco.uf,
        serie: 1,
        numero: Number(args[0] ?? Math.floor(Date.now() / 1000) % 1_000_000_000),
        tipoEmitente: marketplace ? DCE_TIPO_EMITENTE.MARKETPLACE : DCE_TIPO_EMITENTE.EMISSOR_PROPRIO,
      },
      emitente,
      marketplace: marketplace
        ? { cnpj: titular.cnpj, razaoSocial: titular.razaoSocial, site: process.env.DCE_MARKETPLACE_SITE ?? 'www.exemplo.com.br' }
        : undefined,
      destinatario: marketplace ? titular : pessoaFisica,
      itens: [{ descricao: 'ITEM DE TESTE EM HOMOLOGACAO', ncm: '63022100', quantidade: 1, valorUnitario: 10 }],
      transporte: { modalidade: DCE_MODALIDADE_TRANSPORTE.CORREIOS },
    });

    console.log('Autorizada:', resultado.retorno.cStat, '—', resultado.retorno.xMotivo);
    console.log('Chave:', resultado.chaveAcesso);
    console.log('Protocolo:', resultado.retorno.protocolo);
    console.log('QR Code:', resultado.qrCode);
    console.log('dceProc:', salvar(`${resultado.chaveAcesso}-dceProc.xml`, resultado.retorno.xmlProc));
  } else if (comando === 'consultar') {
    const consulta = await service.consultar(args[0]);
    console.log(consulta.cStat, '—', consulta.xMotivo, consulta.protocolo ? `(protocolo ${consulta.protocolo})` : '');
    console.log('Eventos:', consulta.eventos.length);
  } else if (comando === 'cancelar') {
    const [chaveAcesso, protocolo, documentoEmitente] = args;
    const doc = (documentoEmitente ?? titularCertificado(certificado).cnpj).replace(/\D/g, '');
    const resultado = await service.cancelar({
      chaveAcesso,
      protocolo,
      justificativa: 'Cancelamento de teste em ambiente de homologacao',
      emitente: doc.length === 11 ? { cpf: doc } : { cnpj: doc },
    });
    console.log('Cancelamento:', resultado.retorno.cStat, '—', resultado.retorno.xMotivo);
    console.log('Protocolo:', resultado.retorno.protocolo);
    if (resultado.retorno.xmlProc) {
      console.log('procEventoDCe:', salvar(`${chaveAcesso}-cancelamento.xml`, resultado.retorno.xmlProc));
    }
  } else {
    console.log('Comandos: status | emitir [numero] | consultar <chave> | cancelar <chave> <protocolo> [cpf|cnpj]');
  }
} catch (error) {
  if (error instanceof SefazError) {
    console.error(`Rejeição ${error.cStat}: ${error.xMotivo}`);
    if (error.details?.xmlRetorno) console.error(error.details.xmlRetorno);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
