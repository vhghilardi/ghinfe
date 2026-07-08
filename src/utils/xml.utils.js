import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

/**
 * @param {string} xml
 * @returns {string}
 */
export function minifyXml(xml) {
  return xml.replace(/>\s+</g, '><').trim();
}

/**
 * @param {string} xml
 * @returns {Document}
 */
export function parseXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const parseError = doc.getElementsByTagName('parsererror')[0];
  if (parseError) {
    throw new Error(`XML inválido: ${parseError.textContent}`);
  }
  return doc;
}

/**
 * @param {Document|Element} node
 * @returns {string}
 */
export function serializeXml(node) {
  return new XMLSerializer().serializeToString(node);
}

/**
 * @param {string} value
 * @returns {string}
 */
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
