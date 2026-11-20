import * as THREE from 'three';
import { TAU, clamp, lerp, smooth } from '../core/utils.js';

/* =====================================================================
   ESCULTURA PROCEDURAL (SDF → malla): rostros y cuerpos anatómicos
   Cada forma se define como un campo de distancia con uniones suaves
   y se "envuelve" con una rejilla (shrink-wrap). Sin dependencias.
   ===================================================================== */
export const SDF = {
  ellip(x, y, z, cx, cy, cz, rx, ry, rz) {
    const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
    const k0 = Math.sqrt(px * px + py * py + pz * pz);
    const qx = px / rx, qy = py / ry, qz = pz / rz;
    const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
  },
  cap(x, y, z, ax, ay, az, bx, by, bz, ra, rb) { // cápsula cónica (radio ra → rb)
    const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
    const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h);
  },
  smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; },
  smax(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; },
};

// Avanza desde fuera hacia el origen y devuelve la distancia de la superficie más externa (o -1)
export function marchIn(sdf, ox, oy, oz, dx, dy, dz, tMax) {
  let t = tMax, d = sdf(ox + dx * t, oy + dy * t, oz + dz * t);
  if (d < 0) return tMax;
  for (let i = 0; i < 90; i++) {
    const tPrev = t;
    t -= Math.max(d * 0.8, 0.0006);
    if (t <= 0) return -1;
    d = sdf(ox + dx * t, oy + dy * t, oz + dz * t);
    if (d < 0) {
      let a = t, b = tPrev;
      for (let k = 0; k < 9; k++) { const m = (a + b) * 0.5; if (sdf(ox + dx * m, oy + dy * m, oz + dz * m) < 0) a = m; else b = m; }
      return (a + b) * 0.5;
    }
    if (d < 0.00015) return t;
  }
  return -1;
}

/* Cabeza. Origen en el centro del cráneo, +Y arriba, +Z cara, metros. */
export function headSDF(F) {
  const jw = 0.049 * F.jawW, jr = F.jawR, nl = F.noseL, nw = F.noseW, lp = F.lips, cz = F.chinZ;
  return (x, y, z) => {
    const ax = Math.abs(x);
    let d = SDF.ellip(x, y, z, 0, 0.024, -0.012, 0.075 * F.cw, 0.093, 0.096);                                  // cráneo
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, 0.048, 0.032, 0.063 * F.cw, 0.054, 0.054), 0.045);                    // frente (transición amplia)
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.026, 0.03, 0.06 * F.fw, 0.068, 0.054), 0.035);                     // masa facial
    d = SDF.smin(d, SDF.cap(ax, y, z, jw, -0.066, -0.004, 0.016 * F.chinW, -0.103, 0.07 * cz, jr, jr * 0.75), 0.026); // mandíbula
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.103, 0.072 * cz, 0.02 * F.chinW, 0.016, 0.017), 0.018);           // mentón
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.046, -0.006, 0.052, 0.022, 0.012 * F.cheek, 0.02), 0.016);           // pómulos
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.036, -0.04, 0.056, 0.02, 0.021, 0.02 * F.fat), 0.02);              // tejido blando de la mejilla
    d = SDF.smin(d, SDF.cap(ax, y, z, 0.006, 0.024, 0.078, 0.045, 0.022, 0.066, 0.0072 * F.brow, 0.005 * F.brow), 0.024); // arco superciliar (fundido)
    d = SDF.smin(d, SDF.cap(x, y, z, 0, 0.014, 0.08, 0, -0.028 * nl, 0.101 + 0.006 * nl, 0.0052 * nw, 0.0092 * nw), 0.011); // dorso nasal
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.031 * nl, 0.1 + 0.006 * nl, 0.0086 * nw, 0.0078, 0.0082), 0.01); // punta
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.0112 * nw, -0.036 * nl, 0.09, 0.0082 * nw, 0.0072, 0.0088), 0.01);  // aletas
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.07, 0.07, 0.026, 0.016, 0.012), 0.014);                            // orbicular de la boca
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.064, 0.0815, 0.021, 0.0058 * lp, 0.008), 0.01);                   // labio superior
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.0765, 0.0795, 0.018, 0.0066 * lp, 0.008), 0.01);                  // labio inferior
    d = SDF.smax(d, -SDF.ellip(x, y, z, 0, -0.0702, 0.094, 0.0235, 0.0016, 0.008), 0.0025);                     // línea de la boca
    d = SDF.smax(d, -SDF.ellip(x, y, z, 0, -0.087, 0.091, 0.016, 0.0045, 0.006), 0.007);                        // surco mentolabial
    d = SDF.smax(d, -SDF.ellip(ax, y, z, 0.032, 0.003, 0.079, 0.018, 0.0125, 0.017), 0.014);                   // cuencas oculares (borde suave)
    d = SDF.smax(d, -SDF.ellip(ax, y, z, 0.084, 0.022, 0.045, 0.01, 0.022, 0.018), 0.02);                       // sienes
    return d;
  };
}

/* Torso (local del pecho: y=0 a la altura del ombligo). B = { bw, female } */
export function torsoSDF(B) {
  const w = B.bw, f = B.female ? 1 : 0;
  return (x, y, z) => {
    const ax = Math.abs(x);
    let d = SDF.ellip(x, y, z, 0, 0.25, -0.005, 0.15 * w, 0.2, 0.11);                                         // caja torácica
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, 0.06, 0.005, (0.13 - 0.016 * f) * w, 0.15, 0.098), 0.06);            // abdomen / cintura
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.072 * w, 0.31, 0.04, 0.08 * w, 0.06, 0.055), 0.04);                  // pectorales
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.074 * w, 0.29, -0.055, 0.08 * w, 0.11, 0.05), 0.04);                 // escápulas / dorsal
    d = SDF.smin(d, SDF.cap(ax, y, z, 0.03, 0.525, -0.03, 0.15 * w, 0.445, -0.02, 0.045, 0.034), 0.05);          // trapecio
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.165 * w, 0.405, -0.008, 0.045, 0.05, 0.05), 0.04);                   // hombro (acromion)
    if (f) d = SDF.smin(d, SDF.ellip(ax, y, z, 0.058, 0.282, 0.062, 0.058, 0.055, 0.05), 0.03);                // pecho
    return d;
  };
}

/* Pelvis (local de la cadera: y=0 a 0,95 m del suelo). B = { hw, female } */
export function pelvisSDF(B) {
  const w = B.hw;
  return (x, y, z) => {
    const ax = Math.abs(x);
    let d = SDF.ellip(x, y, z, 0, 0.0, 0.0, 0.158 * w, 0.12, 0.104);                                          // pelvis
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, 0.1, 0.01, 0.135 * w, 0.09, 0.096), 0.05);                            // vientre bajo
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.058 * w, -0.05, -0.05, 0.075 * w, 0.085, 0.062), 0.04);              // glúteos
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.09 * w, -0.07, 0.0, 0.08, 0.07, 0.08), 0.04);                         // arranque de muslo
    return d;
  };
}

/* Rejillas envolventes */
export const Sculpt = {
  // Esfera envolvente: más densidad en la cara (longitud 0 = +Z)
  sphere(sdf, { cx = 0, cy = 0, cz = 0, nLon = 112, nLat = 80, rMax = 0.2 }) {
    const W = nLon + 1, H = nLat + 1, pos = new Float32Array(W * H * 3), uv = new Float32Array(W * H * 2);
    for (let i = 0; i < H; i++) {
      const th = Math.PI * (i / nLat), st = Math.sin(th), ct = Math.cos(th);
      for (let j = 0; j < W; j++) {
        const t = (j / nLon) * 2 - 1, lam = Math.PI * (0.42 * t + 0.58 * t * t * t);
        const dx = st * Math.sin(lam), dy = ct, dz = st * Math.cos(lam);
        let r = marchIn(sdf, cx, cy, cz, dx, dy, dz, rMax); if (r < 0) r = 0.002;
        const k = i * W + j;
        pos[k * 3] = cx + dx * r; pos[k * 3 + 1] = cy + dy * r; pos[k * 3 + 2] = cz + dz * r;
        uv[k * 2] = j / nLon; uv[k * 2 + 1] = 1 - i / nLat;
      }
    }
    return { pos, uv, index: Sculpt.gridIndex(W, H), W, H, poles: true, seam: true };
  },
  // Cilindro envolvente (torso): filas por altura, columnas por ángulo (0 = +Z)
  cylinder(sdf, { y0, y1, nY = 44, nA = 64, rMax = 0.35, cx = 0, cz = 0 }) {
    const W = nA + 1, H = nY + 1, pos = new Float32Array(W * H * 3), uv = new Float32Array(W * H * 2);
    for (let i = 0; i < H; i++) {
      const y = y1 - ((y1 - y0) * i) / nY;
      for (let j = 0; j < W; j++) {
        const a = (j / nA) * TAU, dx = Math.sin(a), dz = Math.cos(a);
        let r = marchIn(sdf, cx, y, cz, dx, 0, dz, rMax); if (r < 0) r = 0.004;
        const k = i * W + j;
        pos[k * 3] = cx + dx * r; pos[k * 3 + 1] = y; pos[k * 3 + 2] = cz + dz * r;
        uv[k * 2] = j / nA; uv[k * 2 + 1] = 1 - i / nY;
      }
    }
    return { pos, uv, index: Sculpt.gridIndex(W, H), W, H, poles: false, seam: true };
  },
  gridIndex(W, H) {
    const idx = new Uint32Array((W - 1) * (H - 1) * 6); let n = 0;
    for (let i = 0; i < H - 1; i++) for (let j = 0; j < W - 1; j++) {
      const a = i * W + j, b = a + W, c = b + 1, d = a + 1;
      idx[n++] = a; idx[n++] = b; idx[n++] = c; idx[n++] = a; idx[n++] = c; idx[n++] = d;
    }
    return idx;
  },
  // Normales suaves ponderadas por área, sin costura trasera ni polos facetados
  normals(pos, index, W, H, { poles = false, seam = true } = {}) {
    const nor = new Float32Array(pos.length);
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) { nor[k] += nx; nor[k + 1] += ny; nor[k + 2] += nz; }
    }
    const merge = (list) => {
      let x = 0, y = 0, z = 0;
      for (const k of list) { x += nor[k * 3]; y += nor[k * 3 + 1]; z += nor[k * 3 + 2]; }
      for (const k of list) { nor[k * 3] = x; nor[k * 3 + 1] = y; nor[k * 3 + 2] = z; }
    };
    if (seam) for (let i = 0; i < H; i++) merge([i * W, i * W + W - 1]);
    if (poles) { merge(Array.from({ length: W }, (_, j) => j)); merge(Array.from({ length: W }, (_, j) => (H - 1) * W + j)); }
    for (let k = 0; k < nor.length; k += 3) {
      const l = Math.hypot(nor[k], nor[k + 1], nor[k + 2]) || 1;
      nor[k] /= l; nor[k + 1] /= l; nor[k + 2] /= l;
    }
    return nor;
  },
  // Capa desplazada (pelo, barba, chaleco): fuera de la máscara se hunde bajo la piel
  shell(grid, nor, mask, thick, inset = 0.004) {
    const { pos, uv, index, W, H, poles, seam } = grid, n = pos.length / 3, out = new Float32Array(pos.length), m = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
      const mk = mask(x, y, z, uv[k * 2], uv[k * 2 + 1]); m[k] = mk;
      const off = lerp(-inset, thick(x, y, z, uv[k * 2], uv[k * 2 + 1]), mk);
      out[k * 3] = x + nor[k * 3] * off; out[k * 3 + 1] = y + nor[k * 3 + 1] * off; out[k * 3 + 2] = z + nor[k * 3 + 2] * off;
    }
    const keep = [];
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t], b = index[t + 1], c = index[t + 2];
      if (m[a] > 0.02 || m[b] > 0.02 || m[c] > 0.02) keep.push(a, b, c);
    }
    const idx = new Uint32Array(keep);
    return { pos: out, uv, index: idx, nor: Sculpt.normals(out, idx, W, H, { poles, seam }), mask: m, W, H, poles, seam };
  },
};

/* Máscaras faciales (coordenadas locales de la cabeza) */
export const HAIRLINE = {
  male: [[0, 0.064], [0.45, 0.058], [0.75, 0.046], [1.02, 0.03], [1.12, -0.004], [1.3, -0.006], [1.42, 0.022], [1.85, 0.022], [2.05, -0.028], [2.6, -0.056], [Math.PI, -0.064]],
  female: [[0, 0.066], [0.45, 0.062], [0.8, 0.05], [1.05, 0.034], [1.25, 0.016], [1.42, 0.022], [1.85, 0.02], [2.05, -0.026], [2.6, -0.058], [Math.PI, -0.066]],
};
export const tableLerp = (T, a) => { for (let i = 0; i < T.length - 1; i++) if (a <= T[i + 1][0]) return lerp(T[i][1], T[i + 1][1], (a - T[i][0]) / (T[i + 1][0] - T[i][0])); return T[T.length - 1][1]; };
export const gauss = (x, y, z) => Math.exp(-(x * x + y * y + z * z));
export const FaceMasks = {
  hairline(x, z, female) { return tableLerp(female ? HAIRLINE.female : HAIRLINE.male, Math.abs(Math.atan2(x, z + 0.005))); },
  hair(x, y, z, female) { const b = FaceMasks.hairline(x, z, female); return smooth(b - 0.007, b + 0.006, y); },
  brow(x, y, z, female) {
    if (z < 0.04) return 0;
    const t = (Math.abs(x) - 0.011) / 0.046; if (t < -0.12 || t > 1.12) return 0;
    const arch = female ? 0.0085 : 0.0062, tc = clamp(t, 0, 1);
    const yc = 0.0205 + arch * Math.sin(Math.PI * Math.min(1, tc * (female ? 1.35 : 1.15))) - 0.003 * tc;
    const h = (0.0042 * (1 - 0.5 * tc) + 0.0008) * (female ? 0.72 : 1);
    return smooth(h, h * 0.45, Math.abs(y - yc)) * smooth(-0.1, 0.1, t) * smooth(1.1, 0.86, t);
  },
  beard(x, y, z) {
    if (z < -0.014) return 0;
    const ax = Math.abs(x), top = lerp(-0.056, -0.008, smooth(0.03, 0.066, ax));
    const m = smooth(top + 0.003, top - 0.005, y) * smooth(-0.122, -0.11, y) * smooth(-0.014, 0.0, z);
    const must = smooth(0.03, 0.022, ax) * smooth(-0.067, -0.062, y) * smooth(-0.045, -0.049, y) * smooth(0.07, 0.08, z);
    return Math.max(m, must) * (1 - Math.min(1, FaceMasks.lips(x, y, z) * 1.4));
  },
  lips(x, y, z) {
    const e = (x / 0.024) ** 2 + ((y + 0.0705) / 0.0125) ** 2;
    return smooth(1.0, 0.7, e) * smooth(0.072, 0.079, z);
  },
};

/* Color de piel por vértice (lineal): labios, rubor, ojeras, barba incipiente, cuero cabelludo y oclusión */
export const srgbLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
export const hexLin = (h) => [srgbLin(((h >> 16) & 255) / 255), srgbLin(((h >> 8) & 255) / 255), srgbLin((h & 255) / 255)];
export function skinColors(grid, nor, sdf, L) {
  const { pos } = grid, n = pos.length / 3, col = new Float32Array(n * 3);
  const base = hexLin(L.skin), hair = hexLin(L.hair), lip = hexLin(L.lip || 0x9a5a52);
  const stub = [lerp(base[0], hair[0], 0.55) * 0.75, lerp(base[1], hair[1], 0.55) * 0.75, lerp(base[2], hair[2], 0.55) * 0.82];
  for (let k = 0; k < n; k++) {
    const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2], ax = Math.abs(x);
    let r = base[0], g = base[1], b = base[2];
    const red = 0.6 * gauss((ax - 0.044) / 0.016, (y + 0.022) / 0.016, 0) + 0.7 * gauss(x / 0.01, (y + 0.03) / 0.012, (z - 0.1) / 0.012) + 0.3 * gauss((ax - 0.07) / 0.012, (y + 0.01) / 0.03, 0);
    r *= 1 + 0.14 * red; g *= 1 - 0.06 * red; b *= 1 - 0.04 * red;
    const ue = gauss((ax - 0.031) / 0.013, (y + 0.012) / 0.0055, 0) * smooth(0.05, 0.07, z);
    r *= 1 - 0.14 * ue; g *= 1 - 0.18 * ue; b *= 1 - 0.1 * ue;
    const lm = FaceMasks.lips(x, y, z) * 0.65;
    r = lerp(r, lip[0], lm); g = lerp(g, lip[1], lm); b = lerp(b, lip[2], lm);
    const st = FaceMasks.beard(x, y, z) * (L.stubble || 0);
    r = lerp(r, stub[0], st); g = lerp(g, stub[1], st); b = lerp(b, stub[2], st);
    const hm = FaceMasks.hair(x, y, z, L.female) * 0.85;
    r = lerp(r, hair[0] * 0.7, hm); g = lerp(g, hair[1] * 0.7, hm); b = lerp(b, hair[2] * 0.7, hm);
    const bm = FaceMasks.brow(x, y, z, L.female) * 0.4;
    r = lerp(r, hair[0], bm); g = lerp(g, hair[1], bm); b = lerp(b, hair[2], bm);
    const e = 0.006, ao = clamp(sdf(x + nor[k * 3] * e, y + nor[k * 3 + 1] * e, z + nor[k * 3 + 2] * e) / e, 0, 1), o = 0.5 + 0.5 * Math.pow(ao, 0.7);
    col[k * 3] = r * o; col[k * 3 + 1] = g * o; col[k * 3 + 2] = b * o;
  }
  return col;
}

/* Grosor del pelo por peinado (con mechones por ruido) */
export const HAIR_STYLES = {
  buzz: { thick: () => 0.0018, inset: 0.0015 },
  short: { thick: (x, y) => 0.0028 + 0.0022 * smooth(0.04, 0.11, y) },
  swept: { thick: (x, y, z) => 0.003 + 0.0025 * smooth(0.04, 0.115, y) + 0.0025 * smooth(0.02, 0.09, z) * smooth(0.055, 0.1, y) },
  tied: { thick: (x, y) => 0.0024 + 0.0008 * smooth(0.05, 0.11, y) },
};

/* Piezas anatómicas adicionales (SDF) */
// Mano: muñeca en el origen, dedos hacia -Y, palma hacia +X (lado medial), índice arriba (+Z)
export function handSDF(curl1, curl2, thumb) {
  const F = [[0.026, 0.044, 0.04, 0.0088, 0.002], [0.0088, 0.048, 0.044, 0.0092, 0], [-0.0088, 0.045, 0.041, 0.0087, 0.003], [-0.025, 0.035, 0.032, 0.0077, 0.009]];
  const d1x = Math.sin(curl1), d1y = -Math.cos(curl1), d2x = Math.sin(curl1 + curl2), d2y = -Math.cos(curl1 + curl2);
  const segs = F.map(([z, l1, l2, r, o]) => {
    const kx = 0.004, ky = -0.092 + o, px = kx + d1x * l1, py = ky + d1y * l1;
    return [kx, ky, z, px, py, z * 1.04, px + d2x * l2, py + d2y * l2, z * 1.08, r];
  });
  const tx = lerp(0.03, 0.036, thumb), ty = lerp(-0.082, -0.074, thumb), tz = lerp(0.05, 0.028, thumb);
  return (x, y, z) => {
    let d = SDF.ellip(x, y, z, 0.003, -0.052, 0, 0.0165, 0.046, 0.041);                       // palma
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.01, 0, 0.019, 0.022, 0.027), 0.012);              // muñeca
    d = SDF.smin(d, SDF.ellip(x, y, z, 0.014, -0.04, 0.028, 0.014, 0.024, 0.016), 0.01);       // eminencia tenar
    for (const s of segs) {
      d = SDF.smin(d, SDF.cap(x, y, z, s[0], s[1], s[2], s[3], s[4], s[5], s[9], s[9] * 0.93), 0.007);
      d = SDF.smin(d, SDF.cap(x, y, z, s[3], s[4], s[5], s[6], s[7], s[8], s[9] * 0.92, s[9] * 0.78), 0.004);
    }
    d = SDF.smin(d, SDF.cap(x, y, z, 0.012, -0.022, 0.03, 0.026, -0.048, 0.045, 0.011, 0.0098), 0.008); // pulgar
    return SDF.smin(d, SDF.cap(x, y, z, 0.026, -0.048, 0.045, tx, ty, tz, 0.0098, 0.0082), 0.004);
  };
}
// Bota: tobillo en el origen, puntera hacia +Z; la suela va aparte
export function bootSDF() {
  return (x, y, z) => {
    let d = SDF.cap(x, y, z, 0, 0.13, -0.008, 0, -0.03, -0.012, 0.05, 0.046);                 // caña
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.052, -0.03, 0.043, 0.036, 0.046), 0.03);         // talón
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.058, 0.07, 0.046, 0.032, 0.075), 0.035);         // empeine
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, -0.064, 0.14, 0.042, 0.026, 0.038), 0.02);          // puntera
    return SDF.smax(d, -0.085 - y, 0.004);
  };
}
export const soleSDF = () => (x, y, z) => SDF.smax(SDF.ellip(x, y, z, 0, -0.094, 0.052, 0.052, 0.03, 0.148), Math.abs(y + 0.094) - 0.0115, 0.003);
// Oreja: x hacia fuera, y arriba, z hacia la cara
export function earSDF() {
  const P = []; for (let i = 0; i <= 7; i++) { const t = -0.8 + (i / 7) * 3.2; P.push([0.0028, 0.027 * Math.cos(t), -0.016 * Math.sin(t)]); }
  return (x, y, z) => {
    let d = SDF.ellip(x, y, z, 0, 0, 0, 0.0055, 0.03, 0.018);
    for (let i = 0; i < P.length - 1; i++) d = SDF.smin(d, SDF.cap(x, y, z, ...P[i], ...P[i + 1], 0.0032, 0.0032), 0.003); // hélix
    d = SDF.smin(d, SDF.ellip(x, y, z, 0.0015, -0.025, -0.002, 0.0048, 0.009, 0.0075), 0.004);  // lóbulo
    d = SDF.smin(d, SDF.ellip(x, y, z, 0.0025, -0.005, 0.0135, 0.0035, 0.005, 0.0035), 0.003); // trago
    return SDF.smax(d, -SDF.ellip(x, y, z, 0.0065, -0.004, -0.001, 0.0042, 0.012, 0.008), 0.003); // concha
  };
}
export const roundBoxSDF = (sx, sy, sz, r) => (x, y, z) => {
  const qx = Math.abs(x) - sx + r, qy = Math.abs(y) - sy + r, qz = Math.abs(z) - sz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};

/* Utilidades de geometría */
export const GeoUtil = {
  // Copia los arrays: la rejilla se reutiliza después para capas (pelo, chaleco…) y no debe moverse
  fromGrid(g, nor, col) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(g.pos.slice(), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor.slice(), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(g.uv.slice(), 2));
    if (col) geo.setAttribute('color', new THREE.BufferAttribute(col.slice(), 3));
    geo.setIndex(new THREE.BufferAttribute(g.index.slice(), 1));
    return geo;
  },
  wrap(sdf, c, o = {}) { // malla envolvente de un SDF compacto
    const g = Sculpt.sphere(sdf, { cx: c[0], cy: c[1], cz: c[2], ...o });
    return GeoUtil.fromGrid(g, Sculpt.normals(g.pos, g.index, g.W, g.H, { poles: true }));
  },
  scaleUV(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; },
  mirrorX(geo) { // espejo sin invertir caras
    const p = geo.attributes.position, n = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) { p.setX(i, -p.getX(i)); n.setX(i, -n.getX(i)); }
    const idx = geo.index; for (let i = 0; i < idx.count; i += 3) { const b = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, b); }
    return geo;
  },
  // Tubo anatómico: filas de arriba (t=0) a abajo (t=1), ángulo 0 = +Z. rFn(t, a) da el radio; off(t) desplaza el centro
  tube(len, rFn, { seg = 24, rows = 18, off = null, arc = null, close = true, uvScale = 0.3 } = {}) {
    const a0 = arc ? arc[0] : 0, a1 = arc ? arc[1] : TAU, ts = [];
    if (close && !arc) ts.push(-1);
    for (let i = 0; i <= rows; i++) ts.push(i / rows);
    if (close && !arc) ts.push(2);
    const W = seg + 1, H = ts.length, pos = new Float32Array(W * H * 3), uv = new Float32Array(W * H * 2);
    let circ = 0;
    for (let i = 0; i < H; i++) {
      const t = clamp(ts[i], 0, 1), pole = ts[i] < 0 || ts[i] > 1, o = off ? off(t) : null;
      for (let j = 0; j < W; j++) {
        const a = a0 + ((a1 - a0) * j) / seg, r = pole ? 0 : rFn(t, a), k = i * W + j;
        pos[k * 3] = Math.sin(a) * r + (o ? o[0] : 0); pos[k * 3 + 1] = -t * len; pos[k * 3 + 2] = Math.cos(a) * r + (o ? o[1] : 0);
        uv[k * 2] = j / seg; uv[k * 2 + 1] = 1 - t;
        if (i === Math.floor(H / 2) && !pole) circ = Math.max(circ, r);
      }
    }
    const idx = Sculpt.gridIndex(W, H), nor = Sculpt.normals(pos, idx, W, H, { poles: close && !arc, seam: !arc });
    const geo = GeoUtil.fromGrid({ pos, uv, index: idx }, nor);
    return GeoUtil.scaleUV(geo, ((a1 - a0) * Math.max(circ, 0.02)) / uvScale, len / uvScale);
  },
  // Tubo cónico a lo largo de una curva (coleta)
  taper(points, r0, r1, seg = 12, rows = 24) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const fr = curve.computeFrenetFrames(rows, false), W = seg + 1, H = rows + 1;
    const pos = new Float32Array(W * H * 3), nor = new Float32Array(W * H * 3), uv = new Float32Array(W * H * 2);
    for (let i = 0; i < H; i++) {
      const t = i / rows, P = curve.getPointAt(t), r = lerp(r0, r1, Math.pow(t, 0.8)) * (i === rows ? 0.2 : 1), N = fr.normals[i], B = fr.binormals[i];
      for (let j = 0; j < W; j++) {
        const a = (j / seg) * TAU, cx = Math.cos(a), sx = Math.sin(a), k = i * W + j;
        const nx = cx * N.x + sx * B.x, ny = cx * N.y + sx * B.y, nz = cx * N.z + sx * B.z;
        pos[k * 3] = P.x + nx * r; pos[k * 3 + 1] = P.y + ny * r; pos[k * 3 + 2] = P.z + nz * r;
        nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz; uv[k * 2] = j / seg * 2; uv[k * 2 + 1] = 1 - t * 3;
      }
    }
    const idx = Sculpt.gridIndex(W, H); for (let i = 0; i < idx.length; i += 3) { const b = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = b; }
    return GeoUtil.fromGrid({ pos, uv, index: idx }, nor);
  },
  // Párpado: casquete esférico con borde curvo (almendrado). upper=true cubre desde arriba
  lid(R, edgeY, upper, seg = 22, rows = 7) {
    const W = seg + 1, H = rows + 1, pos = new Float32Array(W * H * 3), nor = new Float32Array(W * H * 3), uv = new Float32Array(W * H * 2), edge = [];
    for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) {
      const lam = -1.5 + (3 * j) / seg, thE = Math.acos(clamp(edgeY(lam) / R, -1, 1));
      const th = upper ? thE * (i / rows) : thE + (Math.PI - thE) * (i / rows), k = i * W + j;
      const nx = Math.sin(th) * Math.sin(lam), ny = Math.cos(th), nz = Math.sin(th) * Math.cos(lam);
      pos[k * 3] = nx * R; pos[k * 3 + 1] = ny * R; pos[k * 3 + 2] = nz * R; nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz;
      uv[k * 2] = j / seg; uv[k * 2 + 1] = 1 - i / rows;
      if ((upper && i === rows) || (!upper && i === 0)) edge.push(new THREE.Vector3(nx, ny, nz));
    }
    return { geo: GeoUtil.fromGrid({ pos, uv, index: Sculpt.gridIndex(W, H) }, nor), edge };
  },
  edgeTube(edge, R, rad, push = [0, 0, 0]) {
    const pts = edge.filter((_, i) => i % 2 === 0).map((n) => n.clone().multiplyScalar(R).add(new THREE.Vector3(...push)));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, rad, 5, false);
  },
};
