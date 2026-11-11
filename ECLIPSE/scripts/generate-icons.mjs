// Genera los PNG de la PWA a partir de public/icons/icon.svg.
// Requiere Playwright con Chromium (disponible en el entorno cloud de Claude Code;
// no es dependencia del proyecto). Uso: npm run icons
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('Playwright no está disponible en este entorno. Los iconos ya generados siguen siendo válidos.');
  process.exit(1);
}

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;
const targets = [
  { name: 'icon-192.png', size: 192, scale: 1 },
  { name: 'icon-512.png', size: 512, scale: 1 },
  { name: 'apple-touch-icon.png', size: 180, scale: 1 },
  // Maskable: el contenido debe caber en el 80 % central (zona segura)
  { name: 'icon-maskable-512.png', size: 512, scale: 0.78 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<html><body style="margin:0;background:#07060c;display:grid;place-items:center;height:100vh">
    <div style="width:${t.size * t.scale}px;height:${t.size * t.scale}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  await page.screenshot({ path: out(t.name), omitBackground: false });
  console.log('✔', t.name);
}
await browser.close();
