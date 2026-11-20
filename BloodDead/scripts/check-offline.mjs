/* Falla el build si la salida pide recursos a un CDN o a Google Fonts: el juego debe funcionar sin conexión
   (requisito para la app de Google Play). El servidor de emparejamiento de PeerJS es la única excepción, y solo
   se usa al conectar un móvil como mando. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = /https?:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|esm\.sh|cdn\.skypack\.dev)[^\s"'`)]*/g;
const files = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; });
const hits = [];
for (const dir of ['dist', 'dist-single']) for (const f of files(dir)) {
  if (!/\.(html|js|css|mjs)$/.test(f)) continue;
  for (const m of readFileSync(f, 'utf8').matchAll(BANNED)) hits.push(`${f}: ${m[0]}`);
}
if (hits.length) { console.error('✗ Recursos externos en el build:\n  ' + hits.join('\n  ')); process.exit(1); }
console.log('✓ Build sin dependencias de CDN (dist/ y dist-single/)');
