/* Descarga las texturas PBR de assets-src/textures.json desde Poly Haven (CC0) y las convierte a WebP.
   Salida: public/assets/textures/<id>/<res>/{diff,nor,arm}.webp + manifest.json + CREDITS en el manifiesto.
   · diff: color (sRGB) · nor: normales OpenGL · arm: oclusión (R), rugosidad (G), metal (B) — el formato que lee Three.js
   Uso: node scripts/fetch-textures.mjs [--force] */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = JSON.parse(readFileSync('assets-src/textures.json', 'utf8'));
const OUT = 'public/assets/textures', force = process.argv.includes('--force');
const MAPS = { diff: 'Diffuse', nor: 'nor_gl', arm: 'arm' };
const Q = { diff: 82, nor: 90, arm: 80 }; // las normales toleran peor la compresión
const getJSON = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
const manifest = { generated: new Date().toISOString().slice(0, 10), license: 'CC0 1.0 (Poly Haven)', sets: {} };
let bytes = 0;
for (const [key, { id, use }] of Object.entries(SRC.sets)) {
  const [files, info] = await Promise.all([getJSON(`https://api.polyhaven.com/files/${id}`), getJSON(`https://api.polyhaven.com/info/${id}`)]);
  for (const res of SRC.resolutions) {
    const dir = join(OUT, id, res); mkdirSync(dir, { recursive: true });
    for (const [name, field] of Object.entries(MAPS)) {
      const dst = join(dir, `${name}.webp`);
      if (!force && existsSync(dst)) continue;
      const url = files[field][res].jpg.url, r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
      await sharp(Buffer.from(await r.arrayBuffer())).webp({ quality: Q[name], effort: 5, smartSubsample: name === 'diff' }).toFile(dst);
    }
    for (const name of Object.keys(MAPS)) bytes += readFileSync(join(dir, `${name}.webp`)).length;
  }
  manifest.sets[key] = { id, name: info.name, use, size: +(info.dimensions[0] / 1000).toFixed(3), authors: Object.keys(info.authors), url: `https://polyhaven.com/a/${id}` };
  console.log(`✓ ${key.padEnd(14)} ${id} (${manifest.sets[key].size} m)`);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Total: ${(bytes / 1048576).toFixed(1)} MB en ${OUT}`);
