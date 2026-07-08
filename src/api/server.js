import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NFeService } from '../nfe/services/NFeService.js';
import { NFCeService } from '../nfce/services/NFCeService.js';
import { NFSeService } from '../nfse/services/NFSeService.js';
import { SefazEndpointResolver } from '../sefaz/SefazEndpointResolver.js';
import { NFSeMunicipioResolver } from '../nfse/NFSeMunicipioResolver.js';
import { SefazError } from '../errors/SefazError.js';
import { GhinfeError } from '../errors/GhinfeError.js';
import { XsdValidationError } from '../errors/XsdValidationError.js';
import { NFSeSoapError } from '../nfse/services/NFSeSoapService.js';
import { NFSE_LAYOUTS } from '../nfse/constants/municipios.js';
import { DanfeService } from '../danfe/DanfeService.js';
import { calcularIBSCBS, buildFragmentoIBSCBS } from '../reforma/ibscbs.js';
import { SEFAZ_MOCK_RESPONSES } from '../nfe/mocks/sefaz-responses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiPath = path.join(__dirname, '../../docs/openapi.yaml');
const swaggerDocument = YAML.load(openapiPath);

const app = express();
const port = process.env.PORT ?? 3333;

app.use(express.json({ limit: '2mb' }));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'GHINFE API — Swagger',
}));
app.use('/guia', express.static(path.join(__dirname, '../../docs')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', library: 'ghinfe', version: '0.6.0' });
});

app.post('/nfe/xml', (req, res) => {
  try {
    const validar = req.query.validarXsd === 'true';
    const service = new NFeService({ validarXsd: validar });
    const doc = service.resolverDocumento(req.body);
    const xml = service.gerarXml(doc, { validarXsd: validar });
    res.json({ chaveAcesso: doc.chaveAcesso, xml, xsdValidado: validar });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfe/validar-xsd', (req, res) => {
  try {
    const service = new NFeService();
    const resultado = service.validarXsd(req.body.xml, { preAssinatura: !req.body.xml.includes('</Signature>') });
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfce/xml', (req, res) => {
  try {
    const service = new NFCeService();
    const doc = service.resolverDocumento(req.body);
    const xml = service.gerarXml(doc);
    res.json({ chaveAcesso: doc.chaveAcesso, xml, observacao: 'QR Code v3 é adicionado após assinatura' });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfce/enviar-mock', async (req, res) => {
  try {
    const service = new NFCeService({ mock: true });
    const doc = service.resolverDocumento(req.body);
    const xml = service.gerarXml(doc);
    const retorno = await service.enviar(xml, doc.chaveAcesso);
    res.json({ chaveAcesso: doc.chaveAcesso, xmlGerado: xml, retorno, mock: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfe/chave', (req, res) => {
  try {
    const service = new NFeService();
    const chaveAcesso = service.gerarChaveAcesso(req.body);
    res.json({ chaveAcesso, valida: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfe/cancelar-mock', async (req, res) => {
  try {
    const service = new NFeService({ mock: true, mockEventoScenario: 'registrado' });
    const xml = service.gerarXmlCancelamento(req.body);
    const retorno = await service.enviarEventoMock(
      xml,
      req.body.chaveAcesso,
      '110111'
    );
    res.json({ xmlGerado: xml, retorno, mock: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfe/cce-mock', async (req, res) => {
  try {
    const service = new NFeService({ mock: true, mockEventoScenario: 'registrado' });
    const xml = service.gerarXmlCartaCorrecao(req.body);
    const retorno = await service.enviarEventoMock(
      xml,
      req.body.chaveAcesso,
      '110110'
    );
    res.json({ xmlGerado: xml, retorno, mock: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfe/enviar-mock', async (req, res) => {
  try {
    const cenario = req.query.cenario ?? 'autorizado';
    const service = new NFeService({ mock: true, mockScenario: cenario });

    const doc = service.resolverDocumento(req.body);
    const xml = service.gerarXml(doc);
    const retorno = await service.enviar(xml, doc.chaveAcesso);

    res.json({
      chaveAcesso: doc.chaveAcesso,
      xmlGerado: xml,
      retorno,
      mock: true,
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/sefaz/endpoints/:uf', (req, res) => {
  try {
    const ambiente = parseInt(req.query.ambiente ?? '2', 10);
    const info = SefazEndpointResolver.obterEndpoints(req.params.uf, ambiente);
    res.json(info);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/sefaz/ufs', (_req, res) => {
  res.json({ ufs: SefazEndpointResolver.listarUFs() });
});

app.get('/sefaz/status/:uf', async (req, res) => {
  try {
    const ambiente = parseInt(req.query.ambiente ?? '2', 10);
    const service = new NFeService({ mock: true, uf: req.params.uf, ambiente });
    if (req.query.cenario) service.soapService.setMockStatusScenario(req.query.cenario);
    const status = await service.consultarStatus(req.params.uf, ambiente);
    res.json(status);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/nfse/layouts', (_req, res) => {
  res.json({ layouts: Object.values(NFSE_LAYOUTS) });
});

app.post('/nfse/xml', (req, res) => {
  try {
    const layout = req.query.layout ?? req.body.layout;
    const service = new NFSeService({ layout });
    const xml = service.gerarXml(req.body, layout);
    res.json({ layout: layout ?? service.resolverLayout(req.body), xml });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/reforma/calcular', (req, res) => {
  try {
    const { baseCalculo, aliquotas } = req.body;
    const reforma = calcularIBSCBS(baseCalculo, aliquotas ?? {});
    res.json({ reforma, fragmentoXml: buildFragmentoIBSCBS(reforma) });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfse/enviar-mock', async (req, res) => {
  try {
    const layout = req.query.layout ?? req.body.layout;
    const service = new NFSeService({ mock: true, layout });
    const resultado = await service.emitir(req.body);
    res.json({ ...resultado, mock: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfse/cancelar-mock', async (req, res) => {
  try {
    const service = new NFSeService({ mock: true });
    const resultado = await service.cancelar(req.body);
    res.json({ ...resultado, mock: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/nfse/substituir-mock', async (req, res) => {
  try {
    const service = new NFSeService({ mock: true });
    const resultado = await service.substituir(req.body);
    res.json({ ...resultado, mock: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/danfe', async (req, res) => {
  try {
    const service = new DanfeService();
    const resultado = await service.gerar(req.body.xml, {
      protocolo: req.body.protocolo,
      qrCodeUrl: req.body.qrCodeUrl,
    });
    if (req.query.format === 'html') {
      res.type('html').send(resultado.html);
      return;
    }
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/nfse/municipios', (_req, res) => {
  const municipios = NFSeMunicipioResolver.listarMunicipios()
    .filter((c) => c !== 'mock')
    .map((codigo) => {
      const info = NFSeMunicipioResolver.resolver(codigo, 2);
      return { codigo, ...info };
    });
  res.json({ municipios, layouts: Object.values(NFSE_LAYOUTS) });
});

app.get('/nfe/cenarios-mock', (_req, res) => {
  res.json({
    cenarios: [
      { id: 'autorizado', descricao: 'NF-e autorizada (cStat 100)', cStat: '100' },
      { id: 'duplicidade', descricao: 'Rejeição por duplicidade (cStat 204)', cStat: '204' },
      { id: 'schema', descricao: 'Rejeição por schema inválido (cStat 225)', cStat: '225' },
      { id: 'certificado', descricao: 'Certificado inválido (cStat 280)', cStat: '280' },
      { id: 'paralisado', descricao: 'Serviço paralisado (cStat 108)', cStat: '108' },
    ],
    responses: SEFAZ_MOCK_RESPONSES,
  });
});

/**
 * @param {import('express').Response} res
 * @param {unknown} error
 */
function handleError(res, error) {
  if (error instanceof SefazError) {
    return res.status(422).json({
      error: error.name,
      code: error.code,
      cStat: error.cStat,
      xMotivo: error.xMotivo,
      details: error.details,
    });
  }

  if (error instanceof NFSeSoapError) {
    return res.status(422).json({
      error: error.name,
      code: error.code,
      codigo: error.codigo,
      message: error.message,
    });
  }

  if (error instanceof XsdValidationError) {
    return res.status(422).json({
      error: error.name,
      code: error.code,
      message: error.message,
      erros: error.erros,
      schema: error.schema,
    });
  }

  if (error instanceof GhinfeError) {
    return res.status(400).json({
      error: error.name,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  console.error(error);
  res.status(500).json({ error: 'InternalServerError', message: 'Erro interno' });
}

app.listen(port, () => {
  console.log(`GHINFE API rodando em http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
  console.log(`Guia do desenvolvedor: http://localhost:${port}/guia/developer-guide.html`);
});
