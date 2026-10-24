# GHINFE

Biblioteca Node.js para emissão de documentos fiscais eletrônicos brasileiros: **NF-e**, **NFC-e**, **NFS-e** e **DC-e**.

Inspirada na filosofia do [ACBr](https://projetoacbr.com.br/) (objeto de domínio → XML → assinatura → envio SEFAZ), a GHINFE separa responsabilidades em serviços modulares, prontos para integração com **Sequelize**, filas **Bull/Redis** e ambientes de alta escala.

## Funcionalidades (v0.6)

| Módulo | Status |
|--------|--------|
| Geração XML NF-e / NFC-e / NFS-e | ✅ |
| DC-e (modelo 99): geração, autorização, consulta, status e cancelamento | ✅ |
| DACE completa e resumida (HTML imprimível, CODE-128C + QR Code) | ✅ |
| IBS/CBS injetado no XML NF-e (item + totais) | ✅ experimental |
| Cancelamento e substituição NFS-e | ✅ |
| DANFE / DANFCE (HTML imprimível) | ✅ |
| Assinatura A1, XSD, multi-UF, filas Bull | ✅ |
| Injeção completa conforme XSD PL_010 estável | 🔜 |

## Estrutura de pastas

```
ghinfe/
├── docs/
│   ├── openapi.yaml              # Especificação Swagger/OpenAPI
│   └── developer-guide.html      # Guia completo para desenvolvedores
├── examples/
│   ├── emitir-nfe.js             # Exemplo de geração + mock
│   └── mock-sefaz.js             # Cenários de retorno SEFAZ
├── src/
│   ├── api/
│   │   └── server.js             # Servidor Express + Swagger UI
│   ├── constants/
│   │   └── sefaz.js              # UF, cStat, URLs, versão layout
│   ├── errors/
│   │   ├── GhinfeError.js
│   │   └── SefazError.js         # Erros reais da SEFAZ (cStat)
│   ├── nfe/
│   │   ├── builders/
│   │   │   ├── NFeXmlBuilder.js
│   │   │   └── NFeEventoXmlBuilder.js  # Cancelamento, CC-e
│   │   ├── mocks/
│   │   │   └── sefaz-responses.js
│   │   ├── services/
│   │   │   ├── NFeXmlService.js
│   │   │   ├── NFeSignService.js
│   │   │   ├── NFeSoapService.js
│   │   │   ├── NFeEventoService.js     # Eventos SEFAZ
│   │   │   └── NFeService.js
│   │   └── types/
│   │       ├── NFeDocument.js
│   │       └── NFeEvento.js
│   ├── sefaz/
│   │   ├── endpoints.registry.js   # URLs por autorizador (SVRS, SP, MG...)
│   │   └── SefazEndpointResolver.js
│   ├── nfse/
│   │   ├── builders/NFSeXmlBuilder.js
│   │   ├── services/               # NFSeService, NFSeSoapService
│   │   └── NFSeMunicipioResolver.js
│   ├── queue/
│   │   ├── NFeQueue.js
│   │   ├── NFCeQueue.js
│   │   └── NFSeQueue.js
│   ├── utils/
│   │   ├── certificate.utils.js
│   │   ├── chave.utils.js          # Chave de acesso + DV
│   │   ├── date.utils.js
│   │   └── xml.utils.js
│   └── index.js                  # Exports públicos
├── .env.example
└── package.json
```

## Instalação

```bash
npm install
cp .env.example .env
npm run schemas:download   # baixa XSDs se necessário (já inclusos em schemas/)
```

## Uso rápido

### 1. Montar o objeto e gerar XML (chave automática)

```javascript
import { NFeService } from 'ghinfe';

const service = new NFeService();

const documento = {
  // chaveAcesso é opcional — gerada automaticamente
  ambiente: 2,
  ide: { uf: 'SP', codigoMunicipio: '3550308', serie: 1, numero: 1 },
  emitente: { cnpj: '12345678000199', /* ... */ },
  destinatario: { /* ... */ },
  itens: [{ /* ... */ }],
};

const xml = service.gerarXml(documento);
```

### 1b. Gerar chave de acesso manualmente

```javascript
import { gerarChaveAcesso, validarChaveAcesso } from 'ghinfe';

const chave = gerarChaveAcesso({
  uf: 'SP',
  cnpj: '12345678000199',
  serie: 1,
  numero: 42,
});
console.log(validarChaveAcesso(chave)); // true
```

### Endpoints SEFAZ automáticos (multi-UF)

```javascript
import { SefazEndpointResolver, NFeService } from 'ghinfe';

// Por UF — resolve autorizador (SVRS, SP, MG...) automaticamente
const urls = SefazEndpointResolver.paraNFe('RJ', 2); // homologação
console.log(urls.endpoint);

// No serviço — basta informar UF
const service = new NFeService({ mock: false, uf: 'SP', ambiente: 2 });

// Ou configurar em runtime a partir do documento
service.configurarUf('MG', 2);
```

### NFS-e (layouts municipais)

```javascript
import { NFSeService, NFSE_LAYOUTS, NFSeMunicipioResolver } from 'ghinfe';

// Layout explícito ou automático pelo município
const service = new NFSeService({ mock: true, layout: NFSE_LAYOUTS.GINFES });
const xml = service.gerarXml(documento);

// Assinatura A1 do RPS
const xmlAssinado = service.gerarXmlAssinado(documento, { pfx, senha });

// Emissão com assinatura opcional
const resultado = await service.emitir(documento, { pfx, senha });
```

Layouts: `abrasf`, `ginfes`, `betha`, `issnet` — municípios pré-cadastrados em SP, RJ, BH, Curitiba, POA, Floripa, Salvador, Recife, Fortaleza.

### Consulta status SEFAZ

```javascript
const service = new NFeService({ mock: true });
const status = await service.consultarStatus('SP', 2);
// { emOperacao: true, cStat: '107', xMotivo: 'Serviço em Operação', tMed: '1' }
```

### Reforma tributária (IBS/CBS no XML)

```javascript
import { NFeService, calcularIBSCBS } from 'ghinfe';

const item = {
  codigo: '001', descricao: '...', ncm: '...', cfop: '5102',
  unidade: 'UN', quantidade: 1, valorUnitario: 100, valorTotal: 100,
  reforma: calcularIBSCBS(100, { pIBSUF: 0.1, pIBSMun: 0.05, pCBS: 0.9 }),
};

const xml = service.gerarXml({ ...documento, itens: [item] });
// XML contém <IBSCBS> no item e <IBSCBSTot> nos totais
// Não use validarXsd:true com reforma até o schema PL_010 estar embutido
```

### Cancelamento / substituição NFS-e

```javascript
await service.cancelar({
  numeroNfse: '2026000001',
  cnpjPrestador: '...',
  inscricaoMunicipal: '...',
  codigoMunicipio: '3550308',
});

await service.substituir({
  numeroNfseSubstituida: '2026000001',
  cnpjPrestador: '...',
  inscricaoMunicipal: '...',
  codigoMunicipio: '3550308',
  documentoSubstituto: { /* novo RPS */ },
});
```

### DANFE / DANFCE

```javascript
import { DanfeService } from 'ghinfe';

const danfe = new DanfeService();
const { html } = await danfe.gerarDanfe(xmlNfe, { protocolo: '...' });
const { html: cupom } = await danfe.gerarDanfce(xmlNfce, { qrCodeUrl: '...' });
// Salve o HTML e imprima / “Salvar como PDF” no navegador
```

### Consulta status SEFAZ

```javascript
import { NFeService, XsdValidationError } from 'ghinfe';

const service = new NFeService({ validarXsd: true });

try {
  service.validarXsd(xml, { preAssinatura: true });
} catch (error) {
  if (error instanceof XsdValidationError) console.error(error.erros);
}
```

Schemas oficiais em `schemas/nfe/PL_009_V4/`.

### NFC-e (modelo 65)

```javascript
import { NFCeService } from 'ghinfe';

const service = new NFCeService({ mock: true });

const documento = {
  ambiente: 2,
  ide: { uf: 'SP', codigoMunicipio: '3550308', serie: 1, numero: 1 },
  emitente: { cnpj: '...', razaoSocial: '...', ie: '...', crt: '1', endereco: { /* ... */ } },
  itens: [{ codigo: '001', descricao: '...', ncm: '...', cfop: '5102', unidade: 'UN', quantidade: 1, valorUnitario: 10, valorTotal: 10 }],
  csc: { idCSC: '000001', codigo: 'SEU-CSC-SEFAZ' },
};

const xml = service.gerarXml(documento);
// QR Code v3 é adicionado após assinatura:
const { xml: xmlCompleto, qrCode } = service.gerarXmlAssinado(documento, { pfx, senha });
```

### DC-e — Declaração de Conteúdo eletrônica (modelo 99)

Para remessa de bens por pessoas físicas ou não contribuintes do ICMS. Layout 1.00 (PL_DCe_v1.00a + NT 2024.001), validado contra o XSD oficial em `schemas/dce/`.

```javascript
import { DCeService, DCE_TIPO_EMITENTE, DCE_MODALIDADE_TRANSPORTE } from 'ghinfe';

const service = new DCeService();

const documento = {
  ambiente: 2,
  ide: { uf: 'SP', serie: 1, numero: 42, tipoEmitente: DCE_TIPO_EMITENTE.MARKETPLACE },
  emitente: { cpf: '...', razaoSocial: '...', endereco: { /* ... */ } },
  marketplace: { cnpj: '...', razaoSocial: '...', site: 'www.exemplo.com.br' },
  destinatario: { cpf: '...', razaoSocial: '...', endereco: { /* ... */ } },
  itens: [{ descricao: 'LIVRO USADO', ncm: '49019900', quantidade: 2, valorUnitario: 35.5 }],
  transporte: { modalidade: DCE_MODALIDADE_TRANSPORTE.CORREIOS },
};

const xml = service.gerarXml(documento, { validarXsd: true });
const { xml: xmlAssinado, chaveAcesso, qrCode } = service.gerarXmlAssinado(documento, { pfx, senha });
```

- `tipoEmitente` define o grupo obrigatório: `fisco` (0), `marketplace` (1), nenhum na emissão própria (2), `transportadora` (3) ou `ect` (4). O CNPJ desse emissor compõe a chave de acesso.
- Em homologação, `dest/xNome` recebe automaticamente o literal exigido pela SEFAZ.
- Contingência off-line (`ide.tipoEmissao: 2`): o QR Code leva o parâmetro `sign`, por isso use `gerarXmlAssinado`.

#### Comunicação com a SEFAZ (autorizador SEFA-PR, atende todas as UFs)

```javascript
const service = new DCeService({ certificado: { pfx, senha }, ambiente: 2 });

await service.consultarStatus();                       // { emOperacao: true, cStat: '107', ... }

const resultado = await service.emitir(documento);     // lança SefazError se rejeitada
resultado.retorno.protocolo;                           // nProt
resultado.retorno.xmlProc;                             // dceProc (DC-e + protDCe) — guarde este XML

await service.consultar(resultado.chaveAcesso);        // cStat 100 (autorizada) / 101 (cancelada)

await service.cancelar({                               // até 24h após a autorização
  chaveAcesso: resultado.chaveAcesso,
  protocolo: resultado.retorno.protocolo,
  justificativa: 'Motivo com no minimo 15 caracteres',
  emitente: { cpf: '...' },                            // mesmo usuário emitente da DC-e
});
```

- TLS mútuo com o certificado A1; a raiz ICP-Brasil v10 (`src/sefaz/ca/`) é adicionada às CAs do Node, sem desligar a verificação do servidor.
- `emitir(documento, { compactar: true })` usa `dceAutorizacaoZip` (GZip + Base64).
- Emissão própria (`tipoEmitente: 2`) só é aceita para não contribuintes do ICMS; contribuintes recebem a rejeição 812.
- Certificado em PEM (`cert.pem` + `key.pem`): `criarPfxDePem(certPem, keyPem, senha)` gera o PFX em memória.
- Testes em homologação: `npm run example:dce-homologacao -- status` (veja as variáveis no topo de `examples/dce-homologacao.js`).

#### DACE — Declaração Auxiliar de Conteúdo eletrônica

```javascript
import { DaceService } from 'ghinfe';

const dace = new DaceService();
const { html, folhas } = await dace.gerar(xmlDceProc);                        // completa (A4, com itens)
const { html: etiqueta } = await dace.gerar(xmlDceProc, { modelo: 'resumida' }); // sem itens, 10×15 cm

// ou direto do resultado da emissão
const { html: dace2 } = await service.gerarDace(resultado);
```

- Segue o Manual DC-e — Anexo II: chave em blocos de 4 dígitos, código de barras CODE-128C (SVG, sem dependência) e QR Code do `infDCeSupl`.
- Folhas adicionais repetem cabeçalho, código de barras, chave e remetente; ajuste com `itensPrimeiraFolha` / `itensDemaisFolhas`.
- Homologação: "EMITIDA EM HOMOLOGAÇÃO" em marca d'água e nas informações complementares. Contingência: "EMITIDA EM CONTINGÊNCIA" no protocolo.
- CPF mascarado por padrão (`123.***.***-09`, recomendação LGPD da NT 2024.001); use `mascararCpf: false` para exibir completo.
- Exige o protocolo de autorização (use o `dceProc`), exceto em contingência.

### 2. Assinar com certificado A1

```javascript
import fs from 'fs';

const pfx = fs.readFileSync('./certs/certificado.pfx');
const xmlAssinado = service.gerarXmlAssinado(documento, {
  pfx,
  senha: process.env.PFX_PASSWORD,
});
```

### 3. Enviar para SEFAZ (mock em desenvolvimento)

```javascript
const service = new NFeService({ mock: true });

const resultado = await service.emitir(documento, { pfx, senha: '...' });

if (resultado.retorno.autorizado) {
  console.log('Protocolo:', resultado.retorno.protocolo);
}
```

### 4. Persistir no banco (Sequelize)

```javascript
const payload = service.toPersistencePayload(resultado);

await NotaFiscal.create({
  chave_acesso: payload.chave_acesso,
  xml_nfe: payload.xml_nfe,
  xml_protocolo: payload.xml_protocolo,
  protocolo: payload.protocolo,
  status: payload.status,
});
```

### 5. Cancelar NF-e

```javascript
const resultado = await service.cancelar({
  chaveAcesso: '35260712345678000199550010000000011000000011',
  cnpj: '12345678000199',
  uf: 'SP',
  protocolo: '135260000000001',
  justificativa: 'Cancelamento por erro de digitacao no pedido',
}, { pfx, senha });

console.log(resultado.retorno.cStat); // '135' — evento registrado
```

### 6. Carta de Correção (CC-e)

```javascript
const resultado = await service.cartaCorrecao({
  chaveAcesso: '...',
  cnpj: '12345678000199',
  uf: 'SP',
  sequencia: 1,
  correcao: 'Correcao do endereco de entrega: Rua Nova, 500',
}, { pfx, senha });
```

### 7. Fila assíncrona (Bull + Redis)

```javascript
import { NFeQueue } from 'ghinfe';

const queue = new NFeQueue({
  redis: { host: '127.0.0.1', port: 6379 },
  nfeOptions: { mock: true },
});

await queue.adicionarEmissao({ documento, certificado: { pfx, senha } });

queue.onCompleted(async (resultado) => {
  await NotaFiscal.create(service.toPersistencePayload(resultado));
});
```

## Tratamento de erros SEFAZ

```javascript
import { SefazError } from 'ghinfe';

try {
  await service.enviar(xmlAssinado, chaveAcesso);
} catch (error) {
  if (error instanceof SefazError) {
    console.error(`Rejeição ${error.cStat}: ${error.xMotivo}`);
    // 204 = duplicidade, 225 = schema, 280 = certificado...
  }
}
```

## API de testes (Swagger)

```bash
npm start
```

| URL | Descrição |
|-----|-----------|
| http://localhost:3333/docs | Swagger UI interativo |
| http://localhost:3333/guia/developer-guide.html | Guia HTML do desenvolvedor |
| http://localhost:3333/health | Health check |

### Endpoints

- `GET /sefaz/endpoints/:uf?ambiente=2` — URLs SEFAZ por UF
- `GET /sefaz/ufs` — Lista UFs suportadas
- `POST /nfse/cancelar-mock` — Cancela NFS-e (mock)
- `POST /nfse/substituir-mock` — Substitui NFS-e (mock)
- `POST /danfe` — Gera DANFE/DANFCE (JSON ou `?format=html`)
- `GET /sefaz/status/:uf?cenario=ok` — Consulta status SEFAZ (mock)
- `GET /nfse/layouts` — Layouts NFS-e suportados
- `POST /reforma/calcular` — Calcula IBS/CBS + fragmento XML
- `POST /nfse/xml?layout=ginfes` — Gera XML RPS NFS-e
- `POST /nfse/enviar-mock` — Emite NFS-e mock
- `GET /nfse/municipios` — Municípios configurados
- `POST /nfe/xml?validarXsd=true` — Gera XML com validação XSD
- `POST /nfe/validar-xsd` — Valida XML existente
- `POST /nfce/xml` — Gera XML NFC-e (modelo 65)
- `POST /nfce/enviar-mock` — Envia NFC-e mock
- `POST /nfe/xml` — Gera XML a partir do JSON
- `POST /nfe/enviar-mock?cenario=autorizado` — Fluxo completo mock
- `POST /nfe/cancelar-mock` — Cancelamento simulado
- `POST /nfe/cce-mock` — Carta de correção simulada
- `GET /nfe/cenarios-mock` — Lista cenários de teste

## Exemplos CLI

```bash
npm run example:nfe      # Gera XML e simula retorno
npm run example:mock     # Testa cenários SEFAZ mock
npm run example:endpoints # Endpoints SEFAZ por UF
npm run example:reforma-xml  # NF-e com IBSCBS no XML
npm run example:nfse-eventos # Cancelamento / substituição NFS-e
npm run example:danfe        # Gera HTML em tmp/
npm run example:dce          # Gera DC-e (modelo 99) e valida XSD
npm run example:dce-homologacao -- status  # DC-e real em homologação (requer certificado)
npm run example:dace         # Gera DACE completa e resumida em tmp/
npm run example:status   # Status SEFAZ mock
npm run example:layouts  # ABRASF / GINFES / Betha / ISSNet
npm run example:reforma  # Cálculo IBS/CBS
npm run example:nfse     # NFS-e mock
npm run example:nfce     # Gera NFC-e modelo 65
npm run example:xsd      # Valida XML contra XSD
npm run example:eventos  # Cancelamento e CC-e mock
npm run schemas:download # Baixa schemas XSD da SEFAZ
```

## Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌────────────┐
│  Seu App    │────▶│  NFeService  │────▶│ NFeXmlService │────▶│ XML NF-e   │
│ (Sequelize) │     │ (orquestrador)│     └───────────────┘     └────────────┘
└─────────────┘     │              │────▶│ NFeSignService│────▶│ XML Assinado│
       │            │              │     └───────────────┘     └────────────┘
       │            │              │────▶│ NFeSoapService│────▶│ SEFAZ/Mock │
       ▼            └──────────────┘     └───────────────┘     └────────────┘
┌─────────────┐
│  NFeQueue   │  Bull/Redis — processamento assíncrono
└─────────────┘
```

## Roadmap

- [ ] Validação XSD PL_010 completa (quando SEFAZ publicar pacote estável)
- [ ] Mais municípios / provedores NFS-e
- [ ] PDF nativo (puppeteer opcional) no DanfeService
- [ ] Assinatura XML de cancelamento NFS-e por layout

## Licença

MIT — veja [LICENSE](LICENSE).
