import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Qué se precachea al instalar (lo esencial para arrancar sin conexión). */
function shouldPrecache(file) {
  if (file === 'index.html' || file === 'manifest.webmanifest') return true;
  if (file.startsWith('icons/')) return true;
  if (!file.startsWith('assets/')) return false;           // models/, textures/... se cachean al usarse
  if (/draco/i.test(file)) return false;                   // decodificador: solo si se usa
  if (/\.woff2$/.test(file)) return /-latin-wght/.test(file); // solo el subconjunto latino
  return /\.(js|css|svg|png|webp)$/.test(file);
}

/**
 * Genera dist/sw.js a partir de src/pwa/sw.js tras cada build, con la lista
 * de precaché y una versión = hash de todos los archivos publicados.
 */
export function serviceWorkerPlugin({ template = 'src/pwa/sw.js' } = {}) {
  let root;
  let outDir;
  return {
    name: 'eclipse-service-worker',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = walk(outDir).map((f) => relative(outDir, f).split('\\').join('/')).filter((f) => f !== 'sw.js').sort();
      const hash = createHash('sha256');
      for (const f of files) { hash.update(f); hash.update(readFileSync(join(outDir, f))); }
      const version = hash.digest('hex').slice(0, 12);
      const precache = ['./', ...files.filter(shouldPrecache).map((f) => `./${f}`)];
      const sw = readFileSync(resolve(root, template), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
      writeFileSync(join(outDir, 'sw.js'), sw);
      console.log(`[eclipse-sw] sw.js versión ${version} · ${precache.length} recursos en precaché`);
    },
  };
}
