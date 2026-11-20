import * as THREE from 'three';
import { TAU, clamp, lerp, mulberry32, nextFrame, smooth } from '../core/utils.js';

/* =====================================================================
   RUIDO + TEXTURAS PBR PROCEDURALES (albedo, normal y rugosidad)
   ===================================================================== */
export const Noise = {
  hash(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  },
  // Ruido de valor periódico (px, py) → texturas sin costuras
  value(x, y, px, py, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
    const a = this.hash(x0, y0, s), b = this.hash(x1, y0, s), c = this.hash(x0, y1, s), d = this.hash(x1, y1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  },
  fbm(u, v, fx, fy, oct, s) {
    let sum = 0, amp = 0.5, norm = 0;
    for (let o = 0; o < oct; o++) { sum += amp * this.value(u * fx, v * fy, fx, fy, s + o * 31); norm += amp; amp *= 0.5; fx *= 2; fy *= 2; }
    return sum / norm;
  },
};

export const Samplers = {
  stone(seed) {
    const rng = mulberry32(seed), rows = 7, R = [];
    for (let r = 0; r < rows; r++) {
      const ws = []; let tot = 0;
      while (tot < 1) { const w = 0.12 + rng() * 0.17; ws.push(w); tot += w; }
      const k = 1 / tot; let acc = rng(); const edges = [], widths = [], tints = [];
      for (const w of ws) { edges.push(acc); widths.push(w * k); tints.push(rng()); acc += w * k; }
      R.push({ edges, widths, tints });
    }
    return (u, v, o) => {
      const rf = v * rows, ri = Math.min(rows - 1, Math.floor(rf)), ry = rf - ri, row = R[ri];
      let bi = 0, bu = 0.5;
      for (let k = 0; k < row.edges.length; k++) { let d = u - row.edges[k]; d -= Math.floor(d); if (d < row.widths[k]) { bi = k; bu = d / row.widths[k]; break; } }
      const e = Math.min(Math.min(bu, 1 - bu) * row.widths[bi], Math.min(ry, 1 - ry) / rows);
      const n1 = Noise.fbm(u, v, 6, 6, 5, seed), n2 = Noise.fbm(u, v, 32, 32, 3, seed + 5);
      const t = row.tints[bi], m = 0.0055;
      if (e < m) {
        const s = 0.55 + 0.45 * n2;
        o.r = 52 * s; o.g = 48 * s; o.b = 42 * s; o.h = 0.05 + n2 * 0.08; o.ro = 0.96;
      } else {
        const bev = smooth(m, m + 0.022, e);
        const h = (0.35 + 0.65 * bev) * (0.72 + 0.28 * n1) + n2 * 0.07;
        const s = (0.62 + 0.55 * n1) * (0.6 + 0.4 * h) * (0.85 + 0.3 * n2);
        o.r = (84 + t * 26) * s; o.g = (80 + t * 18) * s; o.b = (72 + t * 10) * s; o.h = h; o.ro = 0.7 + 0.22 * n2;
      }
      const moss = smooth(0.6, 0.78, Noise.fbm(u, v, 3, 3, 3, seed + 9)) * 0.55;
      if (moss > 0) { o.r = lerp(o.r, 38, moss); o.g = lerp(o.g, 46, moss); o.b = lerp(o.b, 30, moss); o.ro = lerp(o.ro, 0.95, moss); }
    };
  },
  ground(seed) {
    return (u, v, o) => {
      const n = Noise.fbm(u, v, 5, 5, 5, seed), d = Noise.fbm(u, v, 28, 28, 3, seed + 3);
      const wet = smooth(0.56, 0.7, Noise.fbm(u, v, 3, 3, 4, seed + 7));
      const peb = smooth(0.84, 0.97, Noise.fbm(u, v, 40, 40, 2, seed + 11)) * (1 - wet) * 0.8;
      let h = n * 0.55 + d * 0.25 + peb * 0.4; h = lerp(h, 0.28 + d * 0.04, wet * 0.85);
      const s = 0.55 + 0.65 * n;
      let r = 64 * s, g = 51 * s, b = 39 * s;
      if (peb > 0) { const ps = 0.8 + 0.4 * d; r = lerp(r, 70 * ps, peb); g = lerp(g, 66 * ps, peb); b = lerp(b, 61 * ps, peb); }
      const wd = 1 - wet * 0.45;
      o.r = r * wd; o.g = g * wd; o.b = b * wd; o.h = h; o.ro = lerp(0.9 - d * 0.08, 0.22, wet);
    };
  },
  wood(seed) {
    const planks = 5;
    return (u, v, o) => {
      const pf = v * planks, pi = Math.min(planks - 1, Math.floor(pf)), py = pf - pi;
      const t = Noise.hash(pi, 7, seed), joint = Noise.hash(pi, 3, seed);
      let ju = u - joint; ju -= Math.floor(ju); const jd = Math.min(ju, 1 - ju);
      const grain = Noise.fbm(u, v, 2, 48, 4, seed + pi * 3);
      const streak = 0.5 + 0.5 * Math.sin((grain * 9 + v * planks * 2) * Math.PI);
      const n = Noise.fbm(u, v, 6, 6, 4, seed + 19);
      const edge = Math.min(py, 1 - py), gap = edge < 0.035 || jd < 0.0035;
      const bev = smooth(0.035, 0.11, edge) * smooth(0.0035, 0.012, jd);
      const w = smooth(0.35, 0.75, n), s = (0.62 + 0.38 * streak) * (0.75 + 0.4 * t) * (gap ? 0.25 : 1);
      o.r = lerp(102, 92, w) * s; o.g = lerp(82, 88, w) * s; o.b = lerp(60, 80, w) * s;
      o.h = gap ? 0.02 : 0.35 + 0.45 * bev + streak * 0.12 + n * 0.08; o.ro = gap ? 1 : 0.78 + 0.14 * n;
    };
  },
  plaster(seed) {
    return (u, v, o) => {
      const n = Noise.fbm(u, v, 4, 4, 5, seed), n2 = Noise.fbm(u, v, 24, 24, 3, seed + 2);
      const stain = Noise.fbm(u, v, 2, 3, 4, seed + 4);
      const fall = smooth(0.6, 0.625, Noise.fbm(u, v, 3, 3, 5, seed + 6));
      const crack = smooth(0.972, 0.996, 1 - Math.abs(Noise.fbm(u, v, 4, 4, 5, seed + 8) * 2 - 1)) * (1 - fall) * 0.8;
      const drip = Noise.fbm(u, v, 12, 2, 3, seed + 10);
      const ps = (0.72 + 0.36 * n) * (1 - stain * 0.4) * (0.85 + 0.25 * drip) * (1 - crack * 0.6), ss = 0.55 + 0.55 * n2;
      o.r = lerp(148 * ps, 78 * ss, fall); o.g = lerp(138 * ps, 72 * ss, fall); o.b = lerp(122 * ps, 64 * ss, fall);
      o.h = lerp(0.72 + n * 0.12 - crack * 0.45, 0.2 + n2 * 0.3, fall); o.ro = lerp(0.88, 0.94, fall);
    };
  },
  roof(seed) {
    // Ejes invertidos a propósito: las hileras bajan por la pendiente (u del prisma)
    // y los canales de teja corren perpendiculares a la cumbrera.
    const rows = 12, cols = 9;
    return (v, u, o) => {
      const rf = v * rows, ri = Math.min(rows - 1, Math.floor(rf)), ry = rf - ri;
      const cf = u * cols + (ri & 1) * 0.5, ci = Math.floor(cf), cx = cf - ci;
      const t = Noise.hash(((ci % cols) + cols) % cols, ri, seed);
      const curve = Math.sin(cx * Math.PI), gap = cx < 0.04 || cx > 0.96;
      const n = Noise.fbm(u, v, 6, 6, 4, seed + 3), n2 = Noise.fbm(u, v, 30, 30, 2, seed + 5);
      const moss = smooth(0.58, 0.76, Noise.fbm(u, v, 3, 3, 4, seed + 9)) * 0.7;
      let h = curve * 0.55 + (1 - ry) * 0.28 + n2 * 0.05; if (gap) h *= 0.35;
      const s = (0.6 + 0.5 * n) * (0.7 + 0.45 * t) * (0.55 + 0.45 * smooth(0, 0.12, ry)) * (0.7 + 0.3 * curve);
      o.r = lerp(100, 40, moss) * s; o.g = lerp(62, 44, moss) * s; o.b = lerp(50, 30, moss) * s; o.h = h; o.ro = 0.82 + 0.12 * n2;
    };
  },
  // Tejido: pliegues de compresión + trama real (hilo sobre hilo) + desgaste, manchas y pelusa
  fabric(seed, kind) {
    return (u, v, o) => {
      const warp = Noise.fbm(u, v, 3, 3, 2, seed + 1);
      const folds = Math.pow(1 - Math.abs(Noise.fbm(u + warp * 0.3, v, 2, 7, 3, seed) * 2 - 1), 2.6);
      const big = Noise.fbm(u, v, 2, 2, 3, seed + 3), n = Noise.fbm(u, v, 24, 24, 2, seed + 5), fz = Noise.fbm(u, v, 96, 96, 2, seed + 9);
      const wear = smooth(0.58, 0.8, Noise.fbm(u, v, 4, 4, 4, seed + 11));   // zonas raídas
      const stain = smooth(0.6, 0.78, Noise.fbm(u, v, 5, 5, 4, seed + 13));  // barro y grasa
      let w;
      if (kind === 'twill') w = 0.5 + 0.42 * Math.sin((u + v) * 96 * TAU) + 0.08 * Math.sin(u * 384 * Math.PI);
      else if (kind === 'rib') w = Math.abs(Math.sin(u * 64 * Math.PI)) * (0.85 + 0.15 * Math.abs(Math.sin(v * 128 * Math.PI)));
      else if (kind === 'ripstop') { const a = Math.sin(u * 128 * Math.PI), b = Math.sin(v * 128 * Math.PI); w = 0.35 + 0.3 * (a * b > 0 ? Math.abs(a) : Math.abs(b)) + 0.45 * Math.max(smooth(0.9, 1, Math.abs(Math.sin(u * 32 * Math.PI))), smooth(0.9, 1, Math.abs(Math.sin(v * 32 * Math.PI)))); }
      else { const a = Math.sin(u * 128 * Math.PI), b = Math.sin(v * 128 * Math.PI); w = 0.5 + 0.5 * (a * b > 0 ? Math.abs(a) : Math.abs(b)); } // tafetán: el hilo pasa por encima y por debajo
      const wd = w * (1 - 0.6 * wear);
      o.h = folds * 0.7 + wd * 0.1 + n * 0.05 + big * 0.12 + fz * 0.04;
      const t = (0.84 + 0.16 * big) * (0.72 + 0.28 * folds) * (0.93 + 0.07 * w) * (1 + 0.16 * wear) * (1 - 0.34 * stain) * (0.95 + 0.1 * fz);
      o.r = 222 * t; o.g = 222 * t * (1 - 0.04 * stain); o.b = 222 * t * (1 - 0.09 * stain);
      o.ro = 0.86 + 0.06 * n - 0.06 * folds + 0.06 * wear - 0.12 * stain;
    };
  },
  leather(seed) {
    return (u, v, o) => {
      const grain = 1 - Math.abs(Noise.fbm(u, v, 48, 48, 3, seed) * 2 - 1), pebble = smooth(0.35, 0.72, Noise.value(u * 96, v * 96, 96, 96, seed + 6));
      const crease = Math.pow(1 - Math.abs(Noise.fbm(u, v, 5, 3, 3, seed + 2) * 2 - 1), 4), n = Noise.fbm(u, v, 4, 4, 3, seed + 4);
      const scratch = Math.pow(1 - Math.abs(Noise.fbm(u, v, 3, 24, 2, seed + 7) * 2 - 1), 18) * 0.8, scuff = smooth(0.6, 0.8, Noise.fbm(u, v, 6, 6, 3, seed + 9));
      o.h = 0.5 + grain * 0.14 + pebble * 0.08 - crease * 0.5 - scratch * 0.3;
      o.r = o.g = o.b = 225 * Math.min(1.12, (0.8 + 0.2 * n) * (1 - 0.25 * crease) * (1 + 0.3 * scuff + 0.4 * scratch));
      o.ro = 0.46 + 0.18 * grain + 0.18 * crease + 0.14 * scuff + 0.1 * scratch;
    };
  },
  concrete(seed) { // hormigón: poros, manchas de humedad, grietas y juntas de encofrado
    return (u, v, o) => {
      const n = Noise.fbm(u, v, 4, 4, 5, seed), d = Noise.fbm(u, v, 40, 40, 3, seed + 2), stain = smooth(0.55, 0.8, Noise.fbm(u, v, 2, 2, 4, seed + 4));
      const pit = smooth(0.8, 0.93, Noise.value(u * 96, v * 96, 96, 96, seed + 6)), crack = smooth(0.975, 0.997, 1 - Math.abs(Noise.fbm(u, v, 3, 3, 5, seed + 8) * 2 - 1));
      const ju = (u * 2) % 1, joint = Math.min(ju, 1 - ju) < 0.004 ? 1 : 0;
      const s = (0.78 + 0.3 * n) * (1 - 0.32 * stain) * (1 - 0.5 * crack) * (joint ? 0.62 : 1) * (1 - 0.25 * pit);
      o.r = 132 * s; o.g = 130 * s; o.b = 126 * s; o.h = 0.55 + 0.15 * n + 0.08 * d - 0.35 * pit - 0.4 * crack - 0.3 * joint; o.ro = 0.88 + 0.08 * d - 0.25 * stain;
    };
  },
  tiles(seed) { // azulejo clínico: llagas de mortero, piezas rotas y suciedad
    const N = 6;
    return (u, v, o) => {
      const fx = u * N, fy = v * N, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, e = Math.min(tx, 1 - tx, ty, 1 - ty);
      const t = Noise.hash(ix, iy, seed), n = Noise.fbm(u, v, 8, 8, 4, seed + 3), dirt = smooth(0.5, 0.8, Noise.fbm(u, v, 3, 3, 4, seed + 5));
      const crk = t > 0.8 ? smooth(0.96, 0.995, 1 - Math.abs(Noise.fbm(u, v, 12, 12, 3, seed + ix * 7 + iy) * 2 - 1)) : 0;
      if (e < 0.035) { const s = 0.45 + 0.2 * n; o.r = 64 * s; o.g = 62 * s; o.b = 60 * s; o.h = 0.1; o.ro = 0.95; return; }
      const bev = smooth(0.035, 0.07, e), s = (0.82 + 0.18 * t) * (0.9 + 0.15 * n) * (1 - 0.4 * dirt) * (1 - 0.6 * crk);
      o.r = 160 * s; o.g = 163 * s; o.b = 162 * s; o.h = 0.5 + 0.3 * bev - 0.4 * crk; o.ro = 0.22 + 0.45 * dirt + 0.1 * n;
    };
  },
  rust(seed) { // chapa pintada con remaches, regueros y óxido
    return (u, v, o) => {
      const n = Noise.fbm(u, v, 6, 6, 5, seed), rs = smooth(0.5, 0.74, Noise.fbm(u, v, 4, 4, 5, seed + 2)), d = Noise.fbm(u, v, 48, 48, 2, seed + 4);
      const streak = Math.pow(Noise.fbm(u, v, 24, 2, 3, seed + 6), 2), ry = (v * 4) % 1, rx = (u * 8) % 1;
      const seam = Math.min(ry, 1 - ry) < 0.01, rv = Math.hypot(rx - 0.5, Math.min(ry, 1 - ry) - 0.05) < 0.035;
      const r = clamp(rs + streak * 0.35 * smooth(0.3, 0.9, 1 - ry), 0, 1), s = (0.8 + 0.25 * n) * (seam ? 0.55 : 1);
      o.r = lerp(96, 112, r) * s; o.g = lerp(98, 54, r) * s; o.b = lerp(100, 30, r) * s;
      o.h = 0.5 + 0.1 * n + 0.1 * d * r - (seam ? 0.35 : 0) + (rv ? 0.35 : 0); o.ro = lerp(0.42, 0.95, r) + 0.05 * d;
    };
  },
  pores(seed) { // microrrelieve de la piel: poros, líneas de tensión cruzadas y arrugas finas (solo normal map)
    return (u, v, o) => {
      const n = Noise.fbm(u, v, 24, 24, 3, seed), w1 = Noise.fbm(u, v, 6, 6, 2, seed + 4) * 0.6;
      const pit = smooth(0.62, 0.86, Noise.value(u * 160, v * 160, 160, 160, seed + 2)), pit2 = smooth(0.7, 0.9, Noise.value(u * 96 + 0.5, v * 96 + 0.5, 96, 96, seed + 6)) * 0.6;
      const l1 = Math.pow(1 - Math.abs(Math.sin((u * 0.8 + v) * 70 * Math.PI + w1 * 6)), 6), l2 = Math.pow(1 - Math.abs(Math.sin((u - v * 0.5) * 60 * Math.PI + w1 * 5)), 6);
      const wr = Math.pow(1 - Math.abs(Noise.fbm(u, v, 5, 12, 3, seed + 8) * 2 - 1), 5);
      o.h = 0.55 + 0.22 * n - 0.42 * pit - 0.25 * pit2 - 0.12 * (l1 + l2) - 0.28 * wr; o.r = o.g = o.b = 255; o.ro = 0.7;
    };
  },
  flesh(seed) { // piel de infectado: pliegues, grietas, venas hinchadas y ampollas (normal + rugosidad húmeda)
    return (u, v, o) => {
      const n = Noise.fbm(u, v, 8, 8, 4, seed), d = Noise.fbm(u, v, 32, 32, 3, seed + 2);
      const wr = Math.pow(1 - Math.abs(Noise.fbm(u, v, 6, 14, 3, seed + 4) * 2 - 1), 5), cr = Math.pow(1 - Math.abs(Noise.fbm(u, v, 10, 10, 4, seed + 6) * 2 - 1), 14);
      const vein = Math.pow(1 - Math.abs(Noise.fbm(u, v, 5, 5, 4, seed + 8) * 2 - 1), 22), blis = smooth(0.78, 0.9, Noise.value(u * 40, v * 40, 40, 40, seed + 10));
      const pit = smooth(0.7, 0.88, Noise.value(u * 128, v * 128, 128, 128, seed + 12));
      o.h = 0.5 + 0.18 * n + 0.08 * d - 0.3 * wr - 0.45 * cr + 0.2 * vein + 0.25 * blis - 0.15 * pit; o.r = o.g = o.b = 255;
      o.ro = clamp(0.62 + 0.25 * n + 0.15 * cr - 0.3 * blis, 0.25, 1);
    };
  },
  strands(seed) { // mechones de pelo a lo largo de v
    return (u, v, o) => {
      const h = 0.65 * Noise.fbm(u, v, 128, 3, 3, seed) + 0.35 * Noise.value(u * 256, v * 2, 256, 2, seed + 1);
      o.h = h; o.r = o.g = o.b = 255 * (0.62 + 0.5 * h); o.ro = 0.45 + 0.2 * (1 - h);
    };
  },
};

export function makeDataTexture(data, size, srgb) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = TextureFactory.maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// gain: lleva el albedo medio a valores físicamente plausibles (piedra ~115, barro ~95 en sRGB)
export function bakeSet(size, sampler, strength, gain = 1) {
  const N = size * size;
  const col = new Uint8ClampedArray(N * 4), rou = new Uint8ClampedArray(N * 4), nor = new Uint8ClampedArray(N * 4), hgt = new Float32Array(N);
  const o = { r: 0, g: 0, b: 0, h: 0, ro: 1 };
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      sampler(x / size, v, o);
      const i = y * size + x, j = i * 4;
      col[j] = o.r * gain; col[j + 1] = o.g * gain; col[j + 2] = o.b * gain; col[j + 3] = 255;
      const r8 = o.ro * 255; rou[j] = r8; rou[j + 1] = r8; rou[j + 2] = r8; rou[j + 3] = 255;
      hgt[i] = o.h;
    }
  }
  for (let y = 0; y < size; y++) {
    const yu = ((y + 1) % size) * size, yd = ((y - 1 + size) % size) * size, yr = y * size;
    for (let x = 0; x < size; x++) {
      const xr = (x + 1) % size, xl = (x - 1 + size) % size;
      const dx = (hgt[yr + xr] - hgt[yr + xl]) * strength, dy = (hgt[yu + x] - hgt[yd + x]) * strength;
      const il = 1 / Math.sqrt(dx * dx + dy * dy + 1), j = (yr + x) * 4;
      nor[j] = (-dx * il * 0.5 + 0.5) * 255; nor[j + 1] = (-dy * il * 0.5 + 0.5) * 255; nor[j + 2] = (il * 0.5 + 0.5) * 255; nor[j + 3] = 255;
    }
  }
  const u8 = (a) => new Uint8Array(a.buffer);
  return { map: makeDataTexture(u8(col), size, true), normalMap: makeDataTexture(u8(nor), size, false), roughnessMap: makeDataTexture(u8(rou), size, false) };
}

export const TextureFactory = {
  sets: {}, maxAniso: 4, cookie: null, cloud: null, dot: null, grainURL: '',
  async generateAll(onProgress) {
    const jobs = [
      ['stone', 512, Samplers.stone(11), 7, 1.75], ['plaster', 512, Samplers.plaster(23), 4, 1.85],
      ['ground', 512, Samplers.ground(37), 5, 2.4], ['wood', 512, Samplers.wood(41), 5, 1.7],
      ['roof', 512, Samplers.roof(53), 7, 1.95],
      ['canvas', 512, Samplers.fabric(61, 'plain'), 6, 1], ['denim', 512, Samplers.fabric(67, 'twill'), 6, 1],
      ['rib', 512, Samplers.fabric(71, 'rib'), 5, 1], ['nylon', 512, Samplers.fabric(73, 'ripstop'), 5, 1],
      ['leather', 512, Samplers.leather(79), 6, 1], ['pores', 512, Samplers.pores(83), 3.2, 1], ['strands', 256, Samplers.strands(89), 6, 1],
      ['flesh', 512, Samplers.flesh(97), 5, 1],
      ['concrete', 512, Samplers.concrete(101), 4, 1.3], ['tiles', 512, Samplers.tiles(103), 5, 1.15], ['rust', 512, Samplers.rust(107), 5, 1.2],
    ];
    const labels = { stone: 'piedra', plaster: 'yeso', ground: 'barro', wood: 'madera', roof: 'tejas', canvas: 'lona', denim: 'sarga', rib: 'punto', nylon: 'nailon', leather: 'cuero', pores: 'poros de piel', strands: 'cabello', flesh: 'carne podrida', concrete: 'hormigón', tiles: 'azulejo', rust: 'chapa oxidada' };
    for (let i = 0; i < jobs.length; i++) {
      const [name, size, sampler, str, gain] = jobs[i];
      onProgress && onProgress(i / jobs.length, `Generando texturas PBR · ${labels[name]}`);
      await nextFrame();
      this.sets[name] = bakeSet(size, sampler, str, gain);
    }
    this.cookie = this.makeCookie(); this.cloud = this.makeCloud(); this.dot = this.makeDot(); this.grainURL = this.makeGrain();
    this.bloodSplat = this.makeBloodTex('splat', 19); this.bloodDrops = this.makeBloodTex('drops', 29); this.bloodPool = this.makeBloodTex('pool', 37); this.bloodWall = this.makeBloodTex('wall', 43); this.blood = this.bloodSplat;
    onProgress && onProgress(1, 'Texturas listas');
  },
  canvas(s, h = s) { const c = document.createElement('canvas'); c.width = s; c.height = h; return [c, c.getContext('2d')]; },
  // Ojo en proyección polar (fila 0 = centro de la pupila): fibras del iris, anillo limbal, esclerótica con venas
  irisCache: new Map(),
  iris(hex) {
    if (this.irisCache.has(hex)) return this.irisCache.get(hex);
    const W = 256, H = 128, [c, g] = this.canvas(W, H), img = g.createImageData(W, H), base = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
    const P = Math.PI, pup = 0.075 * P, lim = 0.19 * P;
    for (let y = 0; y < H; y++) {
      const th = ((y + 0.5) / H) * P;
      for (let x = 0; x < W; x++) {
        const u = x / W, k = (y * W + x) * 4;
        let r, gg, b;
        if (th < pup) { r = 7; gg = 7; b = 9; }
        else if (th < lim) {
          const t = (th - pup) / (lim - pup), fib = Noise.fbm(u, t * 0.5, 72, 2, 3, 11), crypt = smooth(0.62, 0.7, Noise.fbm(u, t, 18, 3, 2, 13));
          const m = (0.55 + 0.9 * fib) * (1 + 0.35 * Math.exp(-(((t - 0.22) / 0.08) ** 2))) * (1 - 0.6 * smooth(0.72, 1, t)) * (1 - 0.35 * crypt) * (0.7 + 0.3 * smooth(0, 0.1, t));
          r = base[0] * m; gg = base[1] * m; b = base[2] * m;
        } else {
          const s = smooth(lim, lim + 0.03 * P, th), dim = 1 - 0.1 * smooth(0.3 * P, P, th);
          const vein = smooth(0.975, 1, 1 - Math.abs(Noise.fbm(u, th / P, 12, 4, 3, 17) * 2 - 1)) * smooth(0.24 * P, 0.6 * P, th) * 0.65;
          const sr = lerp(236 * dim, 168, vein), sg = lerp(229 * dim, 62, vein), sb = lerp(220 * dim, 58, vein);
          r = lerp(base[0] * 0.3, sr, s); gg = lerp(base[1] * 0.3, sg, s); b = lerp(base[2] * 0.3, sb, s);
        }
        img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = this.maxAniso;
    this.irisCache.set(hex, tex);
    return tex;
  },
  makeCookie() { // Patrón real de linterna: núcleo caliente, anillo y halo
    const s = 256, [c, g] = this.canvas(s), m = s / 2;
    g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
    const grd = g.createRadialGradient(m, m, 0, m, m, m);
    [[0, '#ffffff'], [0.16, '#fff7ea'], [0.27, '#e6d9c5'], [0.33, '#fff2de'], [0.46, '#8c8274'], [0.6, '#57514a'], [0.8, '#26231f'], [1, '#000']].forEach(([p, col]) => grd.addColorStop(p, col));
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    const rng = mulberry32(7);
    for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + rng() * 0.08})`; g.beginPath(); g.arc(m + (rng() - 0.5) * s * 0.7, m + (rng() - 0.5) * s * 0.7, 4 + rng() * 18, 0, TAU); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  },
  // Sangre: salpicadura dirigida (los regueros salen hacia +u), gotas sueltas, charco y pared con chorretones
  makeBloodTex(kind, seed) {
    const s = 256, [c, g] = this.canvas(s), rng = mulberry32(seed), m = s / 2, R = (a, b) => a + rng() * (b - a);
    const col = (a) => `rgba(${R(58, 84) | 0},${R(3, 8) | 0},${R(2, 6) | 0},${a})`;
    const blob = (x, y, r, a = 0.93) => { g.fillStyle = col(a); g.beginPath(); g.ellipse(x, y, r, r * R(0.65, 1), R(0, 3), 0, TAU); g.fill(); };
    const streak = (x, y, ang, len, r0) => { // reguero que se afila y acaba en gota
      let px = x, py = y, a = ang;
      for (let k = 0; k <= len; k += 1.5) { const t = k / len, r = r0 * Math.pow(1 - t, 0.7) + 0.6; a += R(-0.05, 0.05); px += Math.cos(a) * 1.5; py += Math.sin(a) * 1.5; g.fillStyle = col(0.9); g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); }
      blob(px + Math.cos(a) * 3, py + Math.sin(a) * 3, r0 * R(0.5, 0.9));
    };
    if (kind === 'splat') {
      for (let i = 0; i < 16; i++) { const a = R(0, TAU), d = R(0, s * 0.12); blob(m - s * 0.12 + Math.cos(a) * d, m + Math.sin(a) * d, s * R(0.05, 0.11)); }
      for (let i = 0; i < 26; i++) streak(m - s * 0.12, m, R(-0.75, 0.75) + (rng() < 0.2 ? Math.PI : 0), R(s * 0.12, s * 0.46), R(2.5, 6.5));
      for (let i = 0; i < 40; i++) { const a = R(-0.9, 0.9), d = R(s * 0.18, s * 0.5); blob(m - s * 0.12 + Math.cos(a) * d, m + Math.sin(a) * d, R(1.2, 4.2), 0.88); }
    } else if (kind === 'drops') {
      for (let i = 0; i < 9; i++) { const x = R(s * 0.25, s * 0.75), y = R(s * 0.25, s * 0.75), r = R(6, 15); blob(x, y, r); for (let k = 0; k < 7; k++) { const a = R(0, TAU), d = r + R(2, 9); blob(x + Math.cos(a) * d, y + Math.sin(a) * d, R(1, 3)); } }
    } else if (kind === 'pool') {
      const ph = [R(0, TAU), R(0, TAU), R(0, TAU)];
      g.beginPath();
      for (let i = 0; i <= 96; i++) { const a = (i / 96) * TAU, rr = s * 0.38 * (1 + 0.11 * Math.sin(3 * a + ph[0]) + 0.07 * Math.sin(5 * a + ph[1]) + 0.04 * Math.sin(9 * a + ph[2])); if (i) g.lineTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr); else g.moveTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr); }
      const grd = g.createRadialGradient(m, m, 0, m, m, s * 0.44); grd.addColorStop(0, 'rgba(34,2,2,0.98)'); grd.addColorStop(0.6, 'rgba(62,4,3,0.96)'); grd.addColorStop(1, 'rgba(80,6,5,0.9)');
      g.fillStyle = grd; g.fill(); g.lineWidth = 5; g.strokeStyle = 'rgba(26,2,2,0.55)'; g.stroke(); // el borde se seca antes
      for (let i = 0; i < 18; i++) { const a = R(0, TAU), d = s * R(0.4, 0.48); blob(m + Math.cos(a) * d, m + Math.sin(a) * d, R(2, 6)); }
    } else { // pared: impacto con regueros radiales y chorretones que bajan (abajo de la textura = abajo en el mundo)
      const cy = s * 0.36;
      for (let i = 0; i < 12; i++) { const a = R(0, TAU), d = R(0, s * 0.08); blob(m + Math.cos(a) * d, cy + Math.sin(a) * d, s * R(0.04, 0.09)); }
      for (let i = 0; i < 20; i++) streak(m, cy, R(0, TAU), R(s * 0.1, s * 0.3), R(2, 5));
      for (let i = 0; i < 9; i++) { const x = m + R(-s * 0.13, s * 0.13), y0 = cy + R(-4, 14), L = R(s * 0.18, s * 0.55), w = R(1.6, 3.6); g.fillStyle = col(0.9); g.fillRect(x - w / 2, y0, w, L); blob(x, y0 + L, w * 1.3); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.maxAniso; return t;
  },
  makeCloud() {
    const s = 128, [c, g] = this.canvas(s), rng = mulberry32(3);
    for (let i = 0; i < 22; i++) {
      const x = s / 2 + (rng() - 0.5) * s * 0.45, y = s / 2 + (rng() - 0.5) * s * 0.45, r = s * (0.14 + rng() * 0.22);
      const grd = g.createRadialGradient(x, y, 0, x, y, r); grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  },
  makeDot() {
    const s = 64, [c, g] = this.canvas(s), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  },
  makeGrain() {
    const s = 128, [c, g] = this.canvas(s), img = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) { const v = Math.random() * 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); return c.toDataURL('image/png');
  },
};

/* UV en unidades de mundo: la textura mantiene su escala real en cualquier caja */
export function uvBox(g, w, h, d, s) {
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], ou = Math.random(), ov = Math.random();
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / s + ou, uv.getY(i) * dims[f][1] / s + ov); }
  uv.needsUpdate = true;
}
export function uvScale(g, su, sv) {
  const uv = g.attributes.uv, ou = Math.random(), ov = Math.random();
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su + ou, uv.getY(i) * sv + ov);
  uv.needsUpdate = true;
}
