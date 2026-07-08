import libxmljs from 'libxmljs2';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { NFeService } from '../src/index.js';

const dir = path.resolve('schemas/nfe/PL_009_V4');
const baseUrl = pathToFileURL(dir + path.sep).href;
const xsd = libxmljs.parseXml(fs.readFileSync(path.join(dir, 'nfe_v4.00.xsd'), 'utf8'), { baseUrl });

const documento = {
  chaveAcesso: '35260712345678000199550010000000011000000011',
  ambiente: 2,
  ide: { uf: 'SP', codigoMunicipio: '3550308', serie: 1, numero: 1 },
  emitente: {
    cnpj: '12345678000199', razaoSocial: 'EMPRESA EXEMPLO LTDA', ie: '123456789012', crt: '3',
    endereco: { logradouro: 'Rua Exemplo', numero: '100', bairro: 'Centro', codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01001000' },
  },
  destinatario: {
    cpf: '12345678909', razaoSocial: 'CONSUMIDOR', indIEDest: 9,
    endereco: { logradouro: 'Rua B', numero: '2', bairro: 'Centro', codigoMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01001000' },
  },
  itens: [{ codigo: '001', descricao: 'PRODUTO TESTE', ncm: '84713012', cfop: '5102', unidade: 'UN', quantidade: 1, valorUnitario: 100, valorTotal: 100 }],
};

let xml = new NFeService().gerarXml(documento);
const id = `NFe${documento.chaveAcesso}`;
const stub = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI="#${id}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><DigestValue>ZHVtbXk=</DigestValue></Reference></SignedInfo><SignatureValue>ZHVtbXk=</SignatureValue><KeyInfo><X509Data><X509Certificate>ZHVtbXk=</X509Certificate></X509Data></KeyInfo></Signature>`;
xml = xml.replace('</NFe>', `${stub}</NFe>`);

const doc = libxmljs.parseXml(xml);
const valid = doc.validate(xsd);
console.log('valid:', valid);
if (!valid) doc.validationErrors.forEach((e) => console.log(e.message));
