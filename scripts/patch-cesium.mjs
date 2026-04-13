import { readFileSync, writeFileSync } from 'fs';

// Cesium.js embeds WebAssembly binary data inside template literals using octal
// escape sequences (\0, \1 … \7). These are illegal in template literals per the
// JS spec (even outside strict mode), so the browser throws a SyntaxError when
// parsing the file. Replace them with semantically-identical hex escapes (\x00 etc.).
const path = 'public/cesium/Cesium.js';
const src = readFileSync(path, 'utf8');

const patched = src
  .replace(/\\0(?!\d)/g, '\\x00')
  .replace(/\\1(?!\d)/g, '\\x01')
  .replace(/\\2(?!\d)/g, '\\x02')
  .replace(/\\3(?!\d)/g, '\\x03')
  .replace(/\\4(?!\d)/g, '\\x04')
  .replace(/\\5(?!\d)/g, '\\x05')
  .replace(/\\6(?!\d)/g, '\\x06')
  .replace(/\\7(?!\d)/g, '\\x07');

const fixedCount = (src.match(/\\[0-7](?!\d)/g) || []).length;
writeFileSync(path, patched);
console.log(`Cesium.js patched: ${fixedCount} octal escapes replaced with hex equivalents`);
