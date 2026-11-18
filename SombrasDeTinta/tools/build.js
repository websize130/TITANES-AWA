#!/usr/bin/env node
// Empaqueta src/ (módulos ES) en UN solo HTML autocontenido: dist/index.html.
// Sin dependencias: ordena los módulos por importación, elimina import/export y los une en un ámbito.
// Falla si dos módulos declaran el mismo nombre de nivel superior.
//   node tools/build.js
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const IMPORT_RE = /^import\s+[\s\S]*?from\s+['"]([^'"]+)['"];?[ \t]*$/gm;

const order = [], seen = new Set();
function visit(file) {
  if (seen.has(file)) return; seen.add(file);
  const code = fs.readFileSync(file, 'utf8');
  for (const m of code.matchAll(IMPORT_RE)) visit(path.resolve(path.dirname(file), m[1]));
  order.push(file);
}
visit(path.join(src, 'ui/main.js'));

const owners = new Map();
const parts = order.map((f) => {
  const rel = path.relative(root, f);
  let code = fs.readFileSync(f, 'utf8').replace(IMPORT_RE, (stmt) => {
    const out = [];
    for (const m of stmt.matchAll(/([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)/g)) out.push(`const ${m[2]} = ${m[1]};`);
    return out.join('\n');
  }).replace(/^export\s+/gm, '');
  for (const m of code.matchAll(/^(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (owners.has(m[1])) throw new Error(`Nombre duplicado "${m[1]}" en ${rel} y ${owners.get(m[1])}`);
    owners.set(m[1], rel);
  }
  return `// ---- ${rel}\n${code}`;
});

const js = `(function () {\n'use strict';\n${parts.join('\n')}\n})();`.replace(/<\/script/gi, '<\\/script');
let html = fs.readFileSync(path.join(src, 'ui/index.html'), 'utf8');
const css = fs.readFileSync(path.join(src, 'ui/style.css'), 'utf8');
html = html.replace('<!--STYLE-->', () => `<style>\n${css}\n</style>`).replace('<!--SCRIPT-->', () => `<script>\n${js}\n</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log(`dist/index.html · ${order.length} módulos · ${(html.length / 1024).toFixed(0)} KB`);
