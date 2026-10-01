// Local text extraction. The chosen file and its contents never leave the browser.
// DOCX text structure: https://learn.microsoft.com/en-us/office/open-xml/word/how-to-open-and-add-text-to-a-word-processing-document
// Native decompression: https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 30000;
const MAX_XML_BYTES = 2 * 1024 * 1024;
const WORD_NS = new Set(['http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'http://purl.oclc.org/ooxml/wordprocessingml/main']);
const utf8 = new TextDecoder('utf-8', {fatal: true});
function fail(message = 'No se puede leer este Word. Guarda una copia nueva en .docx o expórtalo como texto .txt.') { throw new Error(message); }
function xmlDocument(bytes) {
  let value;
  try { value = utf8.decode(bytes); } catch { fail(); }
  if (/<!DOCTYPE|<!ENTITY/i.test(value)) fail('Este archivo contiene una estructura XML no admitida. Guarda una copia nueva en .docx o .txt.');
  const doc = new DOMParser().parseFromString(value, 'application/xml');
  if (doc.querySelector('parsererror')) fail();
  return doc;
}
function zipEntries(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  if (bytes.length < 22) fail();
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) {
    if (view.getUint32(at, true) === 0x06054b50 && at + 22 + view.getUint16(at + 20, true) === bytes.length) { end = at; break; }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) fail();
  const count = view.getUint16(end + 10, true), length = view.getUint32(end + 12, true), start = view.getUint32(end + 16, true);
  if (count > 5000 || count !== view.getUint16(end + 8, true) || start + length > end) fail();
  const entries = new Map();
  let at = start;
  for (let i = 0; i < count; i++) {
    if (at + 46 > start + length || view.getUint32(at, true) !== 0x02014b50) fail();
    const nameLength = view.getUint16(at + 28, true), next = at + 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    if (next > start + length) fail();
    let name;
    try { name = utf8.decode(bytes.subarray(at + 46, at + 46 + nameLength)); } catch { fail(); }
    if (entries.has(name)) fail();
    entries.set(name, {flags: view.getUint16(at + 8, true), method: view.getUint16(at + 10, true), crc: view.getUint32(at + 16, true), compressed: view.getUint32(at + 20, true), size: view.getUint32(at + 24, true), offset: view.getUint32(at + 42, true)});
    at = next;
  }
  return {entries, bytes, view, centralStart: start};
}
function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
async function unzip(zip, name) {
  const item = zip.entries.get(name);
  if (!item) return null;
  if (item.flags & 1) fail('Los documentos protegidos con contraseña no se pueden importar. Elige una copia sin protección.');
  if (item.size > MAX_XML_BYTES || item.compressed > MAX_FILE_BYTES) fail('El texto interno de este Word es demasiado grande. Usa un documento más corto.');
  const at = item.offset;
  if (at + 30 > zip.centralStart || zip.view.getUint32(at, true) !== 0x04034b50) fail();
  const from = at + 30 + zip.view.getUint16(at + 26, true) + zip.view.getUint16(at + 28, true);
  if (from + item.compressed > zip.centralStart) fail();
  const source = zip.bytes.slice(from, from + item.compressed);
  let result;
  if (item.method === 0) result = source;
  else if (item.method === 8) {
    let decompressor;
    try { decompressor = new DecompressionStream('deflate-raw'); }
    catch { fail('Este navegador no puede abrir Word aquí. Actualízalo o guarda el documento como .txt para importarlo.'); }
    const reader = new Blob([source]).stream().pipeThrough(decompressor).getReader();
    const parts = [];
    let size = 0;
    try {
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_XML_BYTES || size > item.size) { await reader.cancel(); fail('El texto interno de este Word supera el límite permitido.'); }
        parts.push(value);
      }
    } finally { reader.releaseLock(); }
    result = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { result.set(part, offset); offset += part.length; }
  } else fail('La compresión de este Word no está admitida. Guarda una copia nueva en .docx o .txt.');
  if (result.length !== item.size || crc32(result) !== item.crc) fail('El archivo parece incompleto o dañado. Descarga una copia nueva e inténtalo otra vez.');
  return result;
}
async function docxText(buffer) {
  const zip = zipEntries(buffer);
  let path = 'word/document.xml';
  const relationships = await unzip(zip, '_rels/.rels');
  if (relationships) {
    const rel = Array.from(xmlDocument(relationships).getElementsByTagNameNS('*', 'Relationship')).find(node => /\/officeDocument$/.test(node.getAttribute('Type') || ''));
    if (rel) {
      if (rel.getAttribute('TargetMode') === 'External') fail();
      const target = (rel.getAttribute('Target') || '').replace(/^\//, '');
      if (!target || target.includes('..') || /[:\\?#]/.test(target)) fail();
      path = target;
    }
  }
  const bytes = await unzip(zip, path);
  if (!bytes) fail('No se encuentra el texto principal del Word. Elige un archivo .docx normal o .txt.');
  const xml = xmlDocument(bytes);
  const paragraphs = Array.from(xml.getElementsByTagNameNS('*', 'p')).filter(node => WORD_NS.has(node.namespaceURI));
  return paragraphs.map(paragraph => {
    let text = '';
    for (const node of paragraph.getElementsByTagName('*')) {
      if (!WORD_NS.has(node.namespaceURI)) continue;
      if (node.localName === 't') text += node.textContent;
      else if (node.localName === 'tab') text += '\t';
      else if (node.localName === 'br' || node.localName === 'cr') text += '\n';
    }
    return text;
  }).join('\n');
}
export async function readOwnDocument(file) {
  if (!file || !file.size) fail('Elige un documento que contenga texto.');
  if (file.size > MAX_FILE_BYTES) fail('El archivo supera 5 MB. Elige una copia más ligera o un documento .txt.');
  const extension = String(file.name || '').split('.').pop().toLowerCase();
  if (!['docx', 'txt'].includes(extension)) fail('Admitimos Word .docx y texto .txt. Para un PDF, copia su texto en un .txt o conviértelo antes a .docx.');
  const buffer = await file.arrayBuffer();
  let text;
  if (extension === 'docx') {
    try { text = await docxText(buffer); }
    catch (error) { if (error instanceof TypeError || error instanceof RangeError) fail(); throw error; }
  } else {
    try { text = utf8.decode(buffer); }
    catch { fail('Este .txt no está en UTF-8. Guárdalo como texto UTF-8 e inténtalo otra vez.'); }
    if (/\u0000/.test(text)) fail('Este archivo no parece texto UTF-8. Guárdalo como .txt UTF-8.');
  }
  text = text.replace(/\r\n?/g, '\n').trim();
  if (!text) fail('No se ha encontrado texto editable. Las imágenes y los documentos escaneados no se reconocen.');
  if (text.length > MAX_DOCUMENT_CHARS) fail('El documento supera 30.000 caracteres. Divide el contenido en varios documentos; no se ha recortado nada.');
  return {text, filename: file.name, format: extension, note: extension === 'docx' ? 'Se ha importado el texto principal. Imágenes, diseño, encabezados, notas y comentarios no se conservan. Revisa las tablas y los saltos de línea.' : 'Texto importado. Puedes revisarlo y adaptarlo antes de descargar.'};
}
