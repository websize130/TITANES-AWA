/* PokerVegasPro — genera la versión de un solo archivo (dist/index.html y dist/admin.html).
 *
 *   node tools/build-single.js [--three ruta/three.min.js] [--tailwind ruta/tailwind.css] [--supabase ruta/supabase.js]
 *
 * Sin opciones, Three.js, Tailwind y Supabase JS se siguen cargando desde su CDN.
 * Nota: el build UMD de supabase-js no funciona incrustado (calcula su ruta pública a partir del src del script),
 * así que lo normal es dejarlo en CDN: las cuentas necesitan conexión de todos modos.
 * Con ellas quedan incrustados y el juego funciona sin conexión (salvo las fuentes de Google, que tienen respaldo).
 * Para compilar Tailwind:  npx tailwindcss@3.4.16 -c tools/tailwind.config.js -o /tmp/tailwind.css --minify
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const threePath = opt('--three');
const twPath = opt('--tailwind');
const sbPath = opt('--supabase');

// Evita que el contenido incrustado cierre la etiqueta o abra comentarios HTML.
const safeJs = (src) => src.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const safeCss = (src) => src.replace(/<\/style/gi, '<\\/style');

function build(file) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');

  if (twPath) {
    const tw = fs.readFileSync(twPath, 'utf8');
    html = html.replace(/\s*<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>/, '');
    html = html.replace(/\s*<script>\s*tailwind\.config = [\s\S]*?<\/script>/, '');
    html = html.replace(/(\s*)<link rel="stylesheet" href="css\/app\.css" \/>/, (m, ws) => `${ws}<style>/* Tailwind CSS compilado */\n${safeCss(tw)}\n</style>${m}`);
  }

  html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)" \/>/g, (m, href) =>
    `<style>/* ${href} */\n${safeCss(fs.readFileSync(path.join(ROOT, href), 'utf8'))}\n</style>`);

  if (threePath) {
    html = html.replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js"><\/script>/, () =>
      `<script>/* three.js r128 */\n${fs.readFileSync(threePath, 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`);
  }

  if (sbPath) {
    html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^"]+"><\/script>/, () =>
      `<script>/* @supabase/supabase-js (MIT) */\n${fs.readFileSync(sbPath, 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`);
  }

  html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, src) =>
    `<script>/* ${src} */\n${safeJs(fs.readFileSync(path.join(ROOT, src), 'utf8'))}\n</script>`);

  const banner = `<!-- PokerVegasPro · versión de un solo archivo generada con tools/build-single.js. No editar a mano salvo la configuración (busca "ADMIN: null"). -->\n`;
  html = html.replace(/^<!doctype html>\n/i, (d) => d + banner);
  if (/<script src="js\/|href="css\//.test(html)) throw new Error(file + ': quedan referencias a archivos locales');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, file), html);
  console.log(`dist/${file}  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
}

build('index.html');
build('admin.html');
