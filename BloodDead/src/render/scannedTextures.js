import * as THREE from 'three';
import { TextureFactory } from './textures.js';

/* Texturas PBR fotoescaneadas (Poly Haven, CC0) para los escenarios.
   · Calidad Alto → 2K, Medio → 1K, Bajo → no se descargan (se usan las procedurales).
   · Cada conjunto trae diff (sRGB), nor (normales OpenGL) y arm (oclusión R · rugosidad G · metal B).
   · Si faltan los archivos (p. ej. la versión de un solo .html) todo sigue funcionando con las procedurales.
   Las genera scripts/fetch-textures.mjs a partir de assets-src/textures.json. */
const BASE = 'assets/textures/';
const RES = { alto: '2k', medio: '1k' };

export const ScannedTextures = {
  sets: {},          // clave de conjunto → { map, normalMap, armMap, size }
  res: null,         // resolución cargada ('1k' | '2k' | null)
  manifest: null,

  // Carga (o reutiliza) los conjuntos de la calidad pedida. Nunca lanza: devuelve true si hay texturas escaneadas.
  async load(qualityKey, onProgress) {
    const res = RES[qualityKey] || null;
    if (res === this.res) return !!res;
    this.dispose();
    if (!res) return false;
    try {
      if (!this.manifest) {
        const r = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
        if (!r.ok) throw new Error('sin manifiesto (' + r.status + ')');
        this.manifest = await r.json();
      }
      const loader = new THREE.TextureLoader(), entries = Object.entries(this.manifest.sets);
      let done = 0;
      const sets = await Promise.all(entries.map(async ([key, info]) => {
        const dir = `${BASE}${info.id}/${res}/`;
        const [map, normalMap, armMap] = await Promise.all(['diff', 'nor', 'arm'].map((n) => loader.loadAsync(dir + n + '.webp')));
        map.colorSpace = THREE.SRGBColorSpace;
        for (const t of [map, normalMap, armMap]) {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.anisotropy = TextureFactory.maxAniso;
        }
        onProgress && onProgress(++done / entries.length);
        return [key, { map, normalMap, armMap, size: info.size, scanned: true }];
      }));
      this.sets = Object.fromEntries(sets); this.res = res;
      return true;
    } catch (err) {
      console.warn('[BLOOD DEAD] Texturas escaneadas no disponibles; se usan las procedurales.', err);
      this.dispose();
      return false;
    }
  },
  get(key) { return this.sets[key] || null; },
  dispose() {
    for (const s of Object.values(this.sets)) for (const t of [s.map, s.normalMap, s.armMap]) t.dispose();
    this.sets = {}; this.res = null;
  },
};
