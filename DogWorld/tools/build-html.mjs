// Empaqueta todo el juego (código, estilos y Three.js) en un único HTML autónomo.
// Uso: npm run build:html  ->  dist/DogWorld.html
// Funciona abriéndolo directamente (modo local); con servidor (?server=wss://...) admite multijugador.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');

const result = await build({
  entryPoints: [path.join(pub, 'src/main.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  target: 'es2022',
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(pub, 'css/style.css'), 'utf8');
let html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/<link rel="stylesheet" href="\/css\/style.css" \/>/, () => `<style>\n${css}\n</style>`)
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, '')
  .replace(/<script type="module" src="\/src\/main.js"><\/script>/, () => `<script type="module">\n${js}\n</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist/DogWorld.html');
fs.writeFileSync(out, html);
console.log(`OK ${out} (${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} MB)`);
