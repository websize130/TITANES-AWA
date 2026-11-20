import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp, lerp, rand, smooth } from '../core/utils.js';
import { Noise, TextureFactory } from '../render/textures.js';
import { FaceMasks, GeoUtil, SDF, Sculpt, bootSDF, handSDF, headSDF, hexLin, marchIn, pelvisSDF, roundBoxSDF, soleSDF, torsoSDF } from '../characters/sdf.js';
import { HEAD_OFFSET } from '../characters/characterFactory.js';
import { ZOMBIE_TYPES, ZOMBIE_VARIANTS } from './zombieTypes.js';

export const vnoise3 = (x, y, z, s = 1) => { // ruido de valor 3D (para ensuciar y ensangrentar la superficie)
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf), h = (a, b, c) => Noise.hash(a, b, c * 131 + s);
  const a0 = lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v);
  const a1 = lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v);
  return lerp(a0, a1, w);
};
export function bloaterTorsoSDF() {
  return (x, y, z) => {
    const ax = Math.abs(x);
    let d = SDF.ellip(x, y, z, 0, 0.12, 0.07, 0.3, 0.3, 0.31);                        // vientre
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, 0.33, -0.01, 0.27, 0.2, 0.2), 0.08);         // pecho
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.2, 0.42, -0.03, 0.11, 0.09, 0.1), 0.06);     // hombros
    d = SDF.smin(d, SDF.ellip(x, y, z, 0, 0.46, -0.1, 0.16, 0.12, 0.11), 0.06);        // joroba
    d = SDF.smin(d, SDF.ellip(ax, y, z, 0.13, 0.04, 0.24, 0.09, 0.09, 0.08), 0.05);    // pliegues
    return d + 0.006 * Math.sin(x * 40) * Math.sin(y * 37 + z * 11);                  // piel abultada
  };
}

export const SHIELD_VS = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); vP = position; gl_Position = projectionMatrix * viewMatrix * wp; }`;
export const SHIELD_FS = `uniform float uA; uniform float uT; uniform float uHit; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
  vec2 q = vec2(atan(vP.z, vP.x) * 6.0, vP.y * 9.0 - uT * 0.8);
  float hex = smoothstep(0.86, 1.0, max(abs(sin(q.x * 3.0)), abs(sin(q.y * 3.0 + q.x))));
  float a = (f * 0.85 + 0.035 + hex * 0.22 * (0.3 + f) + uHit * 0.35) * uA;
  gl_FragColor = vec4(vec3(1.0, 0.13, 0.08) * a * 1.5, a);
}`;
export const ZombieFactory = {
  BONES: ['hips', 'spine', 'chest', 'belly', 'head', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR', 'thighL', 'kneeL', 'thighR', 'kneeR'],
  PARENT: [-1, 0, 1, 1, 2, 2, 5, 6, 2, 8, 9, 0, 11, 0, 13],
  variants: {}, shared: null,
  prepare() { for (const k in ZOMBIE_VARIANTS) if (!ZOMBIE_VARIANTS[k].boss && !this.variants[k]) this.variants[k] = this.build(k); },
  ensure(keys) { for (const k of keys) if (ZOMBIE_VARIANTS[k] && !this.variants[k]) this.variants[k] = this.build(k); },
  // Materiales de las piezas rígidas de los jefes (casco, visera, placas, tubos, hongos, núcleo y escudo)
  extraMats(csm) {
    const s = (p) => { const m = new THREE.MeshStandardMaterial(p); if (csm) csm.setupMaterial(m); return m; }, Rt = TextureFactory.sets.rust || {};
    return {
      helmet: s({ color: 0x1b1e24, roughness: 0.32, metalness: 0.6 }),
      visor: s({ color: 0x08090b, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.85 }),
      metal: s({ color: 0x2a2c2f, roughness: 0.42, metalness: 0.85 }),
      rust: s({ map: Rt.map || null, normalMap: Rt.normalMap || null, roughnessMap: Rt.roughnessMap || null, color: 0xb0a49a, metalness: 0.55, roughness: 1 }),
      tube: s({ color: 0x232529, roughness: 0.5, metalness: 0.2 }),
      glass: s({ color: 0x9fb3c8, roughness: 0.05, transparent: true, opacity: 0.32, depthWrite: false }),
      fluid: s({ color: 0x2a0404, emissive: 0x8a0a0a, emissiveIntensity: 1.6, roughness: 0.2 }),
      fungus: s({ color: 0xa88458, emissive: 0x6a3008, emissiveIntensity: 1.1, roughness: 0.6 }),
      core: s({ color: 0x220000, emissive: 0xff1a1a, emissiveIntensity: 2.4, roughness: 0.3 }),
      flesh: s({ color: 0x5a1a14, emissive: 0x1a0202, roughness: 0.42, metalness: 0.05 }),
      brain: s({ color: 0x9a5a58, emissive: 0x2a0505, roughness: 0.32 }),
      claw: s({ color: 0x1a1715, roughness: 0.3, metalness: 0.2, transparent: true }),
      chitin: s({ color: 0x1e1816, roughness: 0.36, metalness: 0.18 }),
      egg: s({ color: 0xb89a70, emissive: 0x5a1a08, emissiveIntensity: 0.8, roughness: 0.22, transparent: true, opacity: 0.92 }),
      pod: s({ color: 0x3a0505, emissive: 0xff3a1a, emissiveIntensity: 1.6, roughness: 0.25 }),
      bone: s({ color: 0xcfc4ac, roughness: 0.6 }),
      shield: new THREE.ShaderMaterial({ uniforms: { uA: { value: 1 }, uT: { value: 0 }, uHit: { value: 0 } }, vertexShader: SHIELD_VS, fragmentShader: SHIELD_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
  },
  rest(V) {
    return {
      hips: [0, V.thigh + V.shin + 0.165, 0], spine: [0, 0.05, 0], chest: [0, 0, 0], belly: [0, 0.12, 0.05], head: [0, V.neck, -0.005],
      shoulderL: [0.185 * V.bw, 0.435, -0.01], elbowL: [0, -V.upper, 0], handL: [0, -V.fore, 0],
      shoulderR: [-0.185 * V.bw, 0.435, -0.01], elbowR: [0, -V.upper, 0], handR: [0, -V.fore, 0],
      thighL: [0.092 * V.hw, -0.06, 0], kneeL: [0, -V.thigh, 0], thighR: [-0.092 * V.hw, -0.06, 0], kneeR: [0, -V.thigh, 0],
    };
  },
  prepareShared() {
    if (this.shared) return this.shared;
    const S = {};
    S.handR = GeoUtil.wrap(handSDF(0.3, 0.55, 0.2), [0.012, -0.06, 0], { nLon: 18, nLat: 12, rMax: 0.13 });
    S.handL = GeoUtil.mirrorX(S.handR.clone());
    S.boot = GeoUtil.wrap(bootSDF(), [0, -0.03, 0.04], { nLon: 20, nLat: 14, rMax: 0.26 });
    S.sole = GeoUtil.wrap(soleSDF(), [0, -0.094, 0.05], { nLon: 16, nLat: 8, rMax: 0.2 });
    return (this.shared = S);
  },

  build(key) {
    const V = ZOMBIE_VARIANTS[key], R = this.rest(V), N = this.BONES, Sh = this.prepareShared();
    const W = {}; N.forEach((n, i) => { const p = this.PARENT[i], r = R[n]; W[n] = p < 0 ? r.slice() : [W[N[p]][0] + r[0], W[N[p]][1] + r[1], W[N[p]][2] + r[2]]; });
    const BI = Object.fromEntries(N.map((n, i) => [n, i])), seed = (key.length * 7919 + key.charCodeAt(0) * 31) | 0;
    const skin = hexLin(V.skin), blood = hexLin(0x420907), dried = hexLin(0x241009), hairC = hexLin(V.hairCol);
    const parts = [];
    // Añade una pieza (en coordenadas locales del hueso) con color por vértice y pesos de piel
    const put = (bone, geo, colorFn, weightFn = null) => {
      const P = geo.attributes.position, n = P.count, o = W[bone];
      const col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      const hasCol = !!geo.attributes.color, pc = hasCol ? geo.attributes.color.array : null;
      for (let i = 0; i < n; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        const c = hasCol ? [pc[i * 3], pc[i * 3 + 1], pc[i * 3 + 2]] : colorFn(x, y, z, x + o[0], y + o[1], z + o[2]);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        if (weightFn) { const w = weightFn(x, y, z); si[i * 4] = BI[w[0]]; sw[i * 4] = w[1]; si[i * 4 + 1] = BI[w[2]]; sw[i * 4 + 1] = 1 - w[1]; }
        else { si[i * 4] = BI[bone]; sw[i * 4] = 1; }
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      geo.translate(o[0], o[1], o[2]);
      parts.push(geo);
    };
    // Superficie sucia y ensangrentada; tear > 0 abre rotos que dejan ver piel herida
    const surf = (base, { tear = 0, bl = 0.25, dirt = 0.35 } = {}) => (x, y, z, wx, wy, wz) => {
      const n = vnoise3(wx * 9, wy * 9, wz * 9, seed), k = 0.68 + 0.6 * n;
      let r = base[0] * k, g = base[1] * k, b = base[2] * k;
      if (tear) {
        const tn = vnoise3(wx * 5 + 11, wy * 5, wz * 5, seed + 5), t = smooth(0.78 - tear * 0.12, 0.83 - tear * 0.12, tn), wound = smooth(0.86, 0.92, tn);
        r = lerp(r, lerp(skin[0] * 0.85, blood[0], wound), t); g = lerp(g, lerp(skin[1] * 0.8, blood[1], wound), t); b = lerp(b, lerp(skin[2] * 0.8, blood[2], wound), t);
      }
      const bn = vnoise3(wx * 3.2 + 7, wy * 3.2, wz * 3.2, seed + 9), bm = smooth(1 - bl * 0.9, 1.08 - bl * 0.9, bn), dry = vnoise3(wx * 14, wy * 14, wz * 14, seed + 3);
      r = lerp(r, lerp(blood[0], dried[0], dry), bm); g = lerp(g, lerp(blood[1], dried[1], dry), bm); b = lerp(b, lerp(blood[2], dried[2], dry), bm);
      const dk = 1 - dirt * smooth(0.7, 0.0, wy);
      return [r * dk, g * dk * 0.97, b * dk * 0.92];
    };
    const sk0 = surf(skin, { bl: 0.36, dirt: 0.25 });
    const sk = (x, y, z, wx, wy, wz) => { // carne putrefacta: placas negruzcas, cardenales violáceos y ceniza
      const c = sk0(x, y, z, wx, wy, wz), rot = smooth(0.62, 0.78, vnoise3(wx * 7 + 3, wy * 7, wz * 7, seed + 17)), bru = smooth(0.66, 0.8, vnoise3(wx * 4, wy * 4 + 9, wz * 4, seed + 23)), ash = smooth(0.55, 0.75, vnoise3(wx * 13, wy * 13, wz * 13 + 5, seed + 29));
      return [lerp(lerp(lerp(c[0], 0.07, rot * 0.8), 0.2, bru * 0.45), 0.42, ash * 0.25), lerp(lerp(lerp(c[1], 0.065, rot * 0.8), 0.09, bru * 0.45), 0.41, ash * 0.25), lerp(lerp(lerp(c[2], 0.05, rot * 0.8), 0.17, bru * 0.45), 0.4, ash * 0.25)];
    };
    const C = (h, o) => surf(hexLin(h), o);
    // Oclusión de contacto: los extremos de cada segmento (codo, rodilla, axila) se oscurecen como en la vida real
    const ao = (fn, len) => (x, y, z, wx, wy, wz) => { const c = fn(x, y, z, wx, wy, wz), k = 1 - 0.16 * Math.exp(-((y / 0.035) ** 2)) - 0.12 * Math.exp(-(((y + len) / 0.035) ** 2)); return [c[0] * k, c[1] * k, c[2] * k]; };

    /* --- Cabeza (con cuello integrado, boca abierta y cuencas hundidas) --- */
    const face = headSDF(V.face), open = V.mouth || 1, mw = V.mw || 1, jx = V.jaw || 0, nr = V.female ? 0.05 : 0.058 * Math.sqrt(Math.min(V.bw, 1.3));
    const jaw = (x, y) => x - jx * clamp((-0.076 - y) / 0.02, -1, 1); // mandíbula desplazada: la parte baja de la boca se tuerce a un lado
    const hs = (x, y, z) => {
      let d = SDF.smin(face(x, y, z), SDF.cap(x, y, z, 0, -0.035, -0.024, 0, -0.215, -0.019, nr * 0.94, nr * 1.04), 0.028);
      d = SDF.smax(d, -SDF.ellip(jaw(x, y), y, z, 0, -0.078, 0.092, 0.019 * mw, 0.011 * open, 0.032), 0.004);
      return SDF.smax(d, -SDF.ellip(Math.abs(x), y, z, 0.032, 0.002, 0.072, 0.0165, 0.0125, 0.017), 0.006);
    };
    const hg = Sculpt.sphere(hs, { cy: -0.02, nLon: 44, nLat: 32, rMax: 0.26 }), hn = Sculpt.normals(hg.pos, hg.index, hg.W, hg.H, { poles: true });
    const hc = new Float32Array(hg.pos.length);
    for (let i = 0; i < hg.pos.length / 3; i++) {
      const x = hg.pos[i * 3], y = hg.pos[i * 3 + 1], z = hg.pos[i * 3 + 2], ax = Math.abs(x), wy = y + W.head[1] + HEAD_OFFSET[1];
      let c = sk(x, y, z, x, wy, z);
      const veins = smooth(0.9, 0.97, 1 - Math.abs(vnoise3(x * 60, y * 60, z * 60, seed + 21) * 2 - 1)) * 0.5;
      c = [lerp(c[0], 0.05, veins), lerp(c[1], 0.035, veins), lerp(c[2], 0.06, veins)];
      const mouth = SDF.ellip(jaw(x, y), y, z, 0, -0.078, 0.092, 0.022 * mw, 0.0135 * open, 0.036) < 0.002 ? 1 : 0;
      const gore = Math.max(Math.exp(-((x / 0.03) ** 2 + ((y + 0.09) / 0.035) ** 2)) * smooth(0.03, 0.07, z), smooth(0.55, 0.75, vnoise3(x * 70, y * 9, z * 70, seed + 4)) * smooth(-0.07, -0.1, y) * smooth(0.02, 0.06, z));
      const sock = Math.exp(-(((ax - 0.032) / 0.017) ** 2 + ((y - 0.002) / 0.014) ** 2)) * smooth(0.045, 0.07, z);
      let hm = V.hair === 'none' ? 0 : FaceMasks.hair(x, y, z, V.female);
      if (V.hair === 'sparse') hm *= smooth(0.45, 0.62, vnoise3(x * 40, y * 40, z * 40, seed + 8));
      c = [lerp(c[0], hairC[0], hm * 0.9), lerp(c[1], hairC[1], hm * 0.9), lerp(c[2], hairC[2], hm * 0.9)];
      c = [lerp(c[0], blood[0], gore), lerp(c[1], blood[1], gore), lerp(c[2], blood[2], gore)];
      const dark = Math.max(sock * 0.92, mouth * 0.95);
      c = [lerp(c[0], 0.02, dark), lerp(c[1], 0.006 * (1 - mouth) + 0.003, dark), lerp(c[2], 0.004, dark)];
      const e = 0.006, ao = clamp(hs(x + hn[i * 3] * e, y + hn[i * 3 + 1] * e, z + hn[i * 3 + 2] * e) / e, 0, 1), k = 0.45 + 0.55 * Math.pow(ao, 0.7);
      hc[i * 3] = c[0] * k; hc[i * 3 + 1] = c[1] * k; hc[i * 3 + 2] = c[2] * k;
    }
    put('head', GeoUtil.scaleUV(GeoUtil.fromGrid(hg, hn, hc), 5, 3).translate(...HEAD_OFFSET), null);
    { // Dientes: hileras irregulares, amarillentas y ensangrentadas (faltan algunos)
      const tg = [], my = -0.078, ry = 0.011 * open, rx = 0.019 * mw;
      for (const row of [1, -1]) for (let i = 0; i < 9; i++) {
        if (Noise.hash(i, row + 3, seed) < 0.22) continue;
        const u = (i / 8) * 2 - 1, x = u * rx * 0.8 + (row < 0 ? jx : 0), yy = my + row * ry * Math.sqrt(Math.max(0, 1 - u * u * 0.8)) * 0.8;
        const zt = marchIn(hs, x, yy + row * 0.003, -0.3, 0, 0, 1, 0.6); if (zt < 0) continue;
        const h = 0.0042 + 0.0032 * Noise.hash(i, row, seed + 1);
        tg.push(new THREE.SphereGeometry(1, 5, 4).scale(0.0026, h, 0.0022).rotateZ((Noise.hash(i, 7, seed) - 0.5) * 0.6).translate(x, yy - row * h * 0.45, -0.3 + zt - 0.003));
      }
      if (tg.length) put('head', mergeGeometries(tg, false).translate(...HEAD_OFFSET), surf(hexLin(0x8a7a52), { bl: 0.4, dirt: 0 }));
    }
    if (V.hair === 'long') { // melena enredada
      const hcol = surf(hairC, { bl: 0.2, dirt: 0 });
      for (let i = 0; i < 9; i++) {
        const a = -1.3 + (i / 8) * 2.6 + rand(-0.1, 0.1), sx = Math.sin(a), cz = Math.cos(a), len = rand(0.2, 0.3);
        const pts = [[sx * 0.07, 0.085, -0.02 + cz * -0.06], [sx * 0.09, 0.03, -0.035 + cz * -0.07], [sx * 0.1 + rand(-0.01, 0.01), -0.06, -0.04 + cz * -0.07], [sx * 0.11 + rand(-0.02, 0.02), -0.02 - len, -0.03 + cz * -0.06]];
        put('head', GeoUtil.taper(pts.map((p) => [p[0] + HEAD_OFFSET[0], p[1] + HEAD_OFFSET[1], p[2] + HEAD_OFFSET[2]]), 0.024, 0.006, 7, 10), hcol);
      }
    }

    /* --- Torso y pelvis --- */
    const B = { bw: V.bw, hw: V.hw, female: !!V.female }, fat = V.type === 'bloater';
    let ts = fat ? bloaterTorsoSDF() : torsoSDF(B);
    if (V.ribs) { const base = ts; ts = (x, y, z) => base(x, y, z) - 0.0028 * Math.max(0, Math.sin(y * 92)) * smooth(0.1, 0.18, y) * smooth(0.44, 0.34, y) * smooth(-0.04, 0.03, z); }
    const tg = Sculpt.cylinder(ts, { y0: -0.07, y1: fat ? 0.62 : 0.63, nY: 22, nA: 28, rMax: fat ? 0.55 : 0.35 }), tn = Sculpt.normals(tg.pos, tg.index, tg.W, tg.H);
    let torsoCol;
    if (V.outfit === 'villager') { // camisa raída con tirantes
      const shirt = C(0x7e7056, { tear: 1.55, bl: 0.52 }), strap = C(0x2e2218, { bl: 0.1 });
      torsoCol = (x, y, z, wx, wy, wz) => { // delante: dos tirantes rectos; detrás: en X
        const ax = Math.abs(x), st = z > 0 ? ax > 0.052 && ax < 0.086 : Math.abs(ax - (0.025 + (0.47 - y) * 0.13)) < 0.016;
        return (st && y < 0.5 ? strap : shirt)(x, y, z, wx, wy, wz);
      };
    } else if (V.outfit === 'casual') { // camiseta de tirantes oscura
      const top = C(0x3a3230, { tear: 1.65, bl: 0.56 });
      torsoCol = (x, y, z, wx, wy, wz) => (y < 0.38 || (Math.abs(Math.abs(x) - 0.075) < 0.018 && y < 0.5) ? top : sk)(x, y, z, wx, wy, wz);
    } else if (V.outfit === 'police') torsoCol = C(0x262b36, { tear: 1.25, bl: 0.46 });
    else if (V.outfit === 'riot') torsoCol = C(0x1b1f27, { tear: 1.05, bl: 0.4 });
    else if (V.outfit === 'lab') torsoCol = C(0x8a9399, { tear: 1.75, bl: 0.62 });   // bata de paciente desgarrada
    else if (V.outfit === 'robe') torsoCol = C(0x35281f, { tear: 1.45, bl: 0.35, dirt: 0.5 });
    else if (V.outfit === 'shadow') { const dark = surf(skin, { bl: 0.18, dirt: 0.55 }); torsoCol = (x, y, z, wx, wy, wz) => { const c = dark(x, y, z, wx, wy, wz), k = 0.55 + 0.45 * smooth(0.35, 0.65, vnoise3(x * 30, y * 30, z * 30, seed + 7)); return [c[0] * k, c[1] * k, c[2] * k]; }; } // piel ennegrecida, casi sin brillo
    else if (V.outfit === 'queen') { const pale = surf(skin, { bl: 0.38, dirt: 0.15 }), plate = C(0x1e1816, { bl: 0.1 }); torsoCol = (x, y, z, wx, wy, wz) => (z < -0.02 && Math.sin(y * 70) > 0.2 && y > 0.08 ? plate : pale)(x, y, z, wx, wy, wz); } // placas de quitina en la espalda
    else if (V.outfit === 'colossus' || V.outfit === 'titan') { // arnés de correas sobre la piel
      const strap = C(0x1c1612, { bl: 0.2 }), base = surf(skin, { bl: 0.42, dirt: 0.2 });
      torsoCol = (x, y, z, wx, wy, wz) => (y > 0.04 && Math.abs(Math.abs(x) - (0.05 + (0.5 - y) * 0.28 * V.bw)) < 0.022 ? strap : base)(x, y, z, wx, wy, wz);
    }
    else torsoCol = surf(skin, { bl: fat ? 0.42 : 0.3, dirt: 0.2 });
    const bellyW = fat ? (x, y, z) => ['belly', smooth(0.0, 0.1, z) * smooth(0.36, 0.18, y), 'chest'] : (x, y) => ['chest', 1 - smooth(0.02, -0.07, y) * 0.45, 'hips']; // cintura flexible
    put('chest', GeoUtil.scaleUV(GeoUtil.fromGrid(tg, tn), 3, 2), fat ? (x, y, z, wx, wy, wz) => { // pústulas y moratones del hinchado
      const c = torsoCol(x, y, z, wx, wy, wz), les = smooth(0.7, 0.8, vnoise3(x * 11, y * 11, z * 11, seed + 13));
      return [lerp(c[0], 0.16, les), lerp(c[1], 0.05, les), lerp(c[2], 0.07, les)];
    } : torsoCol, bellyW);
    if (V.outfit === 'lab') { // coraza médica: placa frontal de cerámica con juntas
      const plate = C(0xcbc6bc, { bl: 0.32, dirt: 0.12 });
      const sh = Sculpt.shell(tg, tn, (x, y, z) => smooth(-0.01, 0.03, z) * smooth(0.06, 0.09, y) * smooth(0.5, 0.47, y) * smooth(0.17 * V.bw, 0.15 * V.bw, Math.abs(x)), () => 0.03, 0.003);
      put('chest', GeoUtil.fromGrid(sh, sh.nor), (x, y, z, wx, wy, wz) => { const c = plate(x, y, z, wx, wy, wz), seam = Math.abs(y - 0.27) < 0.006 || Math.abs(x) < 0.004 ? 0.35 : 1; return [c[0] * seam, c[1] * seam, c[2] * seam]; });
    }
    if (V.outfit === 'police' || V.outfit === 'riot') { // chaleco con bolsillos
      const sh = Sculpt.shell(tg, tn, (x, y) => smooth(0.08, 0.1, y) * smooth(0.46, 0.44, y) * (y < 0.36 ? smooth(0.16 * V.bw, 0.14 * V.bw, Math.abs(x)) : smooth(0.04, 0.055, Math.abs(x)) * smooth(0.115, 0.1, Math.abs(x))), () => 0.016, 0.003);
      put('chest', GeoUtil.fromGrid(sh, sh.nor), C(0x15171b, { bl: 0.25, dirt: 0.1 }));
      for (const px of [-0.09, 0, 0.09]) { const t = marchIn(ts, px * V.bw, 0.17, -0.3, 0, 0, 1, 0.6); put('chest', GeoUtil.wrap(roundBoxSDF(0.034, 0.042, 0.016, 0.006), [0, 0, 0], { nLon: 10, nLat: 8, rMax: 0.08 }).translate(px * V.bw, 0.17, -0.3 + t + 0.03), C(0x1a1c20, { bl: 0.15 })); }
    }
    if (fat) for (let i = 0; i < 14; i++) { // pústulas
      const a = rand(-2.4, 2.4), y = rand(0.0, 0.48), dx = Math.sin(a), dz = Math.cos(a), t = marchIn(ts, 0, y, 0, dx, 0, dz, 0.55), r = rand(0.025, 0.055);
      if (t > 0) put('chest', new THREE.SphereGeometry(r, 8, 6).translate(dx * t * 0.97, y, dz * t * 0.97), C(0x8a5a3a, { bl: 0.5, dirt: 0 }), bellyW);
    }
    const ps = pelvisSDF(B), pg = Sculpt.cylinder(ps, { y0: -0.16, y1: 0.16, nY: 10, nA: 24 }), pn = Sculpt.normals(pg.pos, pg.index, pg.W, pg.H);
    const pantsHex = { villager: 0x4a3a2a, casual: 0x2e3440, police: 0x22252c, rags: 0x4a3c34, bloater: 0x3a3026, lab: 0x7d858a, riot: 0x1a1d24, colossus: 0x2e2620, robe: 0x33271e, titan: 0x241c18, shadow: 0x141210, queen: 0x1c1614 }[V.outfit];
    const pants = C(pantsHex, { tear: 1.35, bl: 0.42 }), belt = C(0x1c1612, { bl: 0.1 });
    put('hips', GeoUtil.scaleUV(GeoUtil.fromGrid(pg, pn), 3, 1), (x, y, z, wx, wy, wz) => (y > 0.075 && y < 0.115 && V.outfit !== 'rags' ? belt : pants)(x, y, z, wx, wy, wz), (x, y) => ['hips', 1 - smooth(0.06, 0.16, y) * 0.4, 'chest']);

    /* --- Brazos y manos (garras) --- */
    const thin = V.arm || (V.type === 'runner' ? 0.72 : V.type === 'bloater' ? 1.25 : 1);
    const sleeve = { villager: C(0x7e7056, { tear: 1.55, bl: 0.45 }), police: C(0x262b36, { tear: 1.25, bl: 0.4 }), riot: C(0x1b1f27, { tear: 1.05, bl: 0.35 }), robe: C(0x35281f, { tear: 1.4, bl: 0.3 }), lab: C(0x8a9399, { tear: 1.8, bl: 0.5 }) }[V.outfit] || (V.type === 'bloater' ? surf(skin, { bl: 0.14, dirt: 0.15 }) : sk);
    for (const s of [1, -1]) {
      const sd = s > 0 ? 'L' : 'R';
      put('shoulder' + sd, new THREE.SphereGeometry(0.05 * V.bw * (V.type === 'bloater' ? 0.82 : thin), 10, 8).translate(0, -0.025, 0), sleeve);
      put('shoulder' + sd, GeoUtil.tube(V.upper + 0.02, (t) => V.bw * (0.047 - 0.011 * t) * thin, { seg: 10, rows: 8 }), ao(sleeve, V.upper + 0.02), (x, y) => ['shoulder' + sd, 1 - smooth(-(V.upper - 0.05), -(V.upper + 0.02), y) * 0.5, 'elbow' + sd]);
      put('elbow' + sd, GeoUtil.tube(V.fore + 0.01, (t) => V.bw * (0.039 - 0.014 * t) * thin * (1 + 0.08 * Math.sin(t * 9)), { seg: 10, rows: 7 }), ao(V.type === 'bloater' ? sleeve : sk, V.fore + 0.01), (x, y) => ['elbow' + sd, 1 - smooth(-0.05, 0.01, y) * 0.5, 'shoulder' + sd]);
      const hk = V.bw ** 0.4 * (V.arm || 1) ** 0.5, hand = (s > 0 ? Sh.handL : Sh.handR).clone().scale(hk, V.type === 'runner' ? 1.3 : (V.arm || 1) ** 0.3, hk);
      put('hand' + sd, hand, surf(skin, { bl: 0.6, dirt: 0.1 }));
    }

    /* --- Piernas y pies --- */
    const legT = V.legT || (V.type === 'runner' ? 0.75 : V.type === 'bloater' ? 1.2 : 1), bare = ['rags', 'bloater', 'robe', 'colossus', 'titan', 'lab', 'shadow', 'queen'].includes(V.outfit);
    for (const s of V.noLegs ? [] : [1, -1]) { // la Reina no tiene piernas humanas: abdomen y patas de araña
      const sd = s > 0 ? 'L' : 'R';
      put('thigh' + sd, GeoUtil.tube(V.thigh + 0.02, (t, a) => V.hw * (0.086 - 0.03 * t) * legT * (1 + 0.06 * Math.cos(2 * a)), { seg: 12, rows: 8 }), ao(V.outfit === 'rags' ? (x, y, z, wx, wy, wz) => (y > -0.18 ? pants : sk)(x, y, z, wx, wy, wz) : pants, V.thigh + 0.02),
        (x, y) => { const a = smooth(-0.07, 0, y) * 0.4, b = smooth(-(V.thigh - 0.06), -(V.thigh + 0.02), y) * 0.5; return a >= b ? ['thigh' + sd, 1 - a, 'hips'] : ['thigh' + sd, 1 - b, 'knee' + sd]; });
      put('knee' + sd, GeoUtil.tube(V.shin - 0.02, (t, a) => V.hw * (0.056 - 0.01 * t + 0.006 * Math.exp(-(((t - 0.3) / 0.2) ** 2)) * Math.max(0, -Math.cos(a))) * legT, { seg: 12, rows: 8 }), ao(bare ? sk : pants, V.shin - 0.02), (x, y) => ['knee' + sd, 1 - smooth(-0.05, 0.01, y) * 0.5, 'thigh' + sd]);
      put('knee' + sd, Sh.boot.clone().scale(legT, 1, 1).translate(0, -V.shin, 0), bare ? surf(skin, { bl: 0.3, dirt: 0.6 }) : C(0x2a221a, { bl: 0.15, dirt: 0.4 }));
      if (!bare) put('knee' + sd, Sh.sole.clone().translate(0, -V.shin, 0), () => [0.015, 0.014, 0.013]);
    }

    const T0 = ZOMBIE_TYPES[V.type] || {};
    /* --- Piezas rígidas de los jefes (en coordenadas locales del hueso; se pueden ocultar: placas rotas, escudo caído, vainas)
           y apéndices animados (rigs): tentáculos y patas de araña --- */
    const extras = [], rigs = [], X = (bone, g, mat, name) => extras.push({ bone, geo: g, mat, name: name || mat });
    const cone = (r, h, x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.ConeGeometry(r, h, 7).translate(0, h / 2, 0).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z);
    const blob = (arr, x, y, z, r, sy = 1) => arr.push(new THREE.SphereGeometry(r, 10, 8).scale(1, sy, 1).translate(x, y, z));
    const tent = (bone, base, rot, segs, len, r0, r1, mat, amp = 0.35, speed = 2.2) => rigs.push({ kind: 'tentacle', bone, base, rot, segs, len, r0, r1, mat, amp, speed });
    if (V.outfit === 'lab') {
      for (const s of [1, -1]) X('chest', GeoUtil.taper([[s * 0.06, 0.36, -0.1], [s * 0.15, 0.47, -0.17], [s * 0.2, 0.6, -0.12], [s * 0.15, 0.66, 0.0]], 0.015, 0.01, 8, 14), 'tube', 'tubes');
      X('chest', new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16).translate(0, 0.28, -0.21), 'glass', 'tank');
      X('chest', new THREE.CylinderGeometry(0.064, 0.064, 0.25, 12).translate(0, 0.27, -0.21), 'fluid', 'fluid');
      X('chest', mergeGeometries([new THREE.CylinderGeometry(0.086, 0.086, 0.035, 16).translate(0, 0.44, -0.21), new THREE.CylinderGeometry(0.086, 0.086, 0.035, 16).translate(0, 0.12, -0.21)], false), 'metal', 'caps');
    }
    if (V.type === 'subject') { // tumores, espinas dorsales, tercer brazo con garra y cerebro al descubierto
      const tum = [];
      for (let i = 0; i < 9; i++) blob(tum, rand(-0.17, 0.17) * V.bw, rand(0.2, 0.5), -0.12 + rand(-0.02, 0.03), rand(0.035, 0.07));
      for (const s of [1, -1]) { blob(tum, s * 0.19 * V.bw, 0.47, 0.0, 0.07, 0.8); blob(tum, s * 0.21 * V.bw, 0.42, -0.05, 0.05); }
      X('chest', mergeGeometries(tum, false), 'flesh', 'tumors');
      X('chest', mergeGeometries([0.08, 0.18, 0.28, 0.38, 0.48].map((y, i) => cone(0.022, 0.12 - i * 0.012, 0, y, -0.13, -1.25)), false), 'bone', 'spikes');
      X('chest', mergeGeometries([GeoUtil.taper([[-0.13, 0.44, -0.1], [-0.28, 0.52, -0.22], [-0.42, 0.33, -0.3], [-0.46, 0.06, -0.24]], 0.05, 0.022, 9, 16),
        cone(0.012, 0.14, -0.46, 0.06, -0.24, Math.PI), cone(0.012, 0.12, -0.43, 0.06, -0.21, Math.PI - 0.3), cone(0.012, 0.12, -0.49, 0.06, -0.26, Math.PI + 0.3)], false), 'flesh', 'arm3');
      X('head', new THREE.SphereGeometry(0.07, 14, 10).scale(1, 0.62, 1.15).translate(HEAD_OFFSET[0], HEAD_OFFSET[1] + 0.078, HEAD_OFFSET[2] - 0.01), 'brain', 'brain');
    }
    if (V.type === 'stalker') { // garras largas, cresta ósea y espinazo
      for (const sd of ['L', 'R']) X('hand' + sd, mergeGeometries([-0.022, 0, 0.022].map((x, i) => cone(0.008, 0.3 - i * 0.03, x, -0.1, 0.01, Math.PI + 0.12)), false), 'claw', 'claws');
      X('head', mergeGeometries([0, 1, 2, 3].map((i) => cone(0.012, 0.16 - i * 0.025, (i - 1.5) * 0.02, HEAD_OFFSET[1] + 0.06 - i * 0.02, HEAD_OFFSET[2] - 0.07, -2.0 + i * 0.12)), false), 'claw', 'crest');
      X('chest', mergeGeometries([0.05, 0.15, 0.25, 0.35, 0.45, 0.55].map((y) => cone(0.012, 0.09, 0, y, -0.1, -1.35)), false), 'claw', 'spine');
    }
    if (V.outfit === 'colossus' || V.outfit === 'titan') {
      const ar = V.bw * (V.arm || 1);
      for (const sd of ['L', 'R']) {
        X('elbow' + sd, new THREE.BoxGeometry(0.1 * ar, V.fore * 0.72, 0.1 * ar).translate(0, -V.fore * 0.46, 0.005), 'rust', V.type === 'behemoth' ? 'plate' + sd : 'plates');
        X('shoulder' + sd, new THREE.BoxGeometry(0.115 * ar, V.upper * 0.55, 0.115 * ar).translate(0, -V.upper * 0.42, 0), 'rust', V.type === 'behemoth' ? 'plate' + sd : 'plates');
        X('shoulder' + sd, new THREE.SphereGeometry(0.075 * ar, 12, 8, 0, TAU, 0, Math.PI * 0.55), 'metal', 'pad');
      }
      X('chest', mergeGeometries([new THREE.BoxGeometry(0.34 * V.bw, 0.3, 0.06).translate(0, 0.3, -0.16), new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8).translate(0.11 * V.bw, 0.42, -0.2), new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8).translate(-0.11 * V.bw, 0.42, -0.2)], false), 'rust', 'back');
    }
    if (V.type === 'behemoth') { // placa pectoral (se rompe), máscara de acero y cadenas colgando de las muñecas
      const sh = Sculpt.shell(tg, tn, (x, y, z) => smooth(-0.02, 0.03, z) * smooth(0.05, 0.08, y) * smooth(0.52, 0.48, y), () => 0.035, 0.003);
      X('chest', GeoUtil.fromGrid(sh, sh.nor), 'rust', 'plateC');
      const mask = Sculpt.shell(hg, hn, (x, y, z) => smooth(0.02, 0.045, z) * smooth(-0.03, -0.015, y) * smooth(0.06, 0.045, y), () => 0.02, 0.002);
      X('head', GeoUtil.fromGrid(mask, mask.nor).translate(...HEAD_OFFSET), 'metal', 'mask');
      for (const sd of ['L', 'R']) {
        const links = []; for (let i = 0; i < 11; i++) links.push(new THREE.TorusGeometry(0.03, 0.009, 6, 10).rotateY(i % 2 ? Math.PI / 2 : 0).translate(0, -V.fore * 0.95 - i * 0.05, 0.05));
        X('elbow' + sd, mergeGeometries(links, false), 'metal', 'chains');
      }
    }
    if (V.outfit === 'titan') {
      X('chest', new THREE.SphereGeometry(0.075, 20, 14).translate(0, 0.27, 0.15), 'core', 'core');
      X('chest', new THREE.TorusGeometry(0.1, 0.018, 8, 24).translate(0, 0.27, 0.135), 'metal', 'ring');
      X(null, new THREE.SphereGeometry(1.2, 40, 24).translate(0, 0.98, 0), 'shield', 'shield');
    }
    if (V.type === 'alpha') { // biomecánico: cables a la espalda, costillas metálicas, vainas (fase 2) y cuatro tentáculos
      for (const s of [1, -1]) X('chest', GeoUtil.taper([[s * 0.1, 0.4, -0.16], [s * 0.22, 0.3, -0.38], [s * 0.3, -0.3, -0.55], [s * 0.34, -0.9, -0.62]], 0.03, 0.022, 8, 16), 'tube', 'cables');
      X('chest', mergeGeometries([0.12, 0.2, 0.28].map((y) => new THREE.TorusGeometry(0.17 * V.bw, 0.012, 6, 20, Math.PI * 0.9).rotateX(Math.PI / 2).rotateZ(Math.PI * 0.55).translate(0, y, 0.02)), false), 'metal', 'ribs');
      T0.pods.forEach((p, i) => X(p.bone, new THREE.SphereGeometry(p.r, 16, 12).translate(...p.off), 'pod', 'pod' + i));
      for (const [x, y, ry, rz] of [[0.12, 0.46, 0.5, -0.5], [-0.12, 0.46, -0.5, 0.5], [0.09, 0.3, 0.9, -0.9], [-0.09, 0.3, -0.9, 0.9]]) tent('chest', [x, y, -0.14], [-1.3, ry, rz], 7, 1.0, 0.055, 0.012, 'flesh', 0.42, 1.6);
    }
    if (V.type === 'queen') { // abdomen de araña con sacos de huevos, ocho patas, corona ósea y tentáculos
      X('hips', new THREE.SphereGeometry(0.5, 22, 16).scale(1, 0.72, 1.25).translate(0, 0.02, -0.62), 'chitin', 'abdomen');
      const eggs = []; for (let i = 0; i < 9; i++) { const a = rand(-1.2, 1.2), e = rand(0.3, 1.2); blob(eggs, Math.sin(a) * Math.sin(e) * 0.5, 0.02 + Math.cos(e) * 0.36, -0.62 - Math.cos(a) * Math.sin(e) * 0.62, rand(0.05, 0.09)); }
      X('hips', mergeGeometries(eggs, false), 'egg', 'eggs');
      X('head', mergeGeometries([0, 1, 2, 3, 4, 5].map((i) => { const a = -1.2 + i * 0.48; return cone(0.014, 0.13 + (i % 2) * 0.05, Math.sin(a) * 0.08, HEAD_OFFSET[1] + 0.08, HEAD_OFFSET[2] - 0.01 + Math.cos(a) * 0.05, -0.25 * Math.cos(a), 0, 0.35 * Math.sin(a)); }), false), 'bone', 'crown');
      X('hips', new THREE.SphereGeometry(0.2, 14, 10).scale(1.15, 0.8, 1).translate(0, 0.0, -0.05), 'chitin', 'waist');
      const legs = [[0.16, 0.12, -0.75, 0], [0.18, -0.1, -0.25, 1], [0.18, -0.32, 0.25, 0], [0.16, -0.55, 0.75, 1]];
      for (const [x, z, yaw, set] of legs) for (const s of [1, -1]) rigs.push({ kind: 'leg', bone: 'hips', base: [s * x, 0.02, z], yaw: s > 0 ? yaw : Math.PI - yaw, side: s, set: s > 0 ? set : 1 - set, Lf: 0.62, Lt: 1.55, reach: 0.95 + Math.abs(yaw) * 0.22, r: 0.04, mat: 'chitin' });
      for (const [x, y, ry, rz] of [[0.08, 0.5, 0.4, -0.6], [-0.08, 0.5, -0.4, 0.6], [0.05, 0.36, 0.7, -0.9], [-0.05, 0.36, -0.7, 0.9]]) tent('chest', [x, y, -0.12], [-1.1, ry, rz], 6, 0.75, 0.03, 0.008, 'flesh', 0.5, 2.6);
    }

    const geo = mergeGeometries(parts, false);
    const rad = fat ? 2.5 : V.boss ? 2.9 : 2.2;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), rad);
    const eye = V.noEyes ? [] : [[0.032, 0.002, 0.07], [-0.032, 0.002, 0.07]].map((e) => [e[0] + HEAD_OFFSET[0], e[1] + HEAD_OFFSET[1], e[2] + HEAD_OFFSET[2]]);
    // Triángulos agrupados por hueso: los impactos buscan la superficie exacta (heridas bien pegadas a la piel)
    const SIx = geo.attributes.skinIndex.array, Ix = geo.index.array, lists = N.map(() => []);
    for (let t = 0; t < Ix.length; t += 3) lists[SIx[Ix[t] * 4]].push(t);
    // Sondas: vértices repartidos por todo el cuerpo (hueso + posición local) para saber dónde toca el suelo
    const Pp = geo.attributes.position.array, nv = Pp.length / 3, stp = Math.max(1, Math.floor(nv / 160)), probes = [];
    for (let i = 0; i < nv; i += stp) { const bi = SIx[i * 4], o = W[N[bi]]; probes.push(bi, Pp[i * 3] - o[0], Pp[i * 3 + 1] - o[1], Pp[i * 3 + 2] - o[2]); }
    // Por hueso: vértices únicos y esfera envolvente local (descarta en un instante las partes que el rayo no toca)
    const bverts = lists.map((l) => { const s = new Set(); for (const t of l) { s.add(Ix[t]); s.add(Ix[t + 1]); s.add(Ix[t + 2]); } return Uint32Array.from(s); });
    const bsph = bverts.map((vs, bi) => {
      if (!vs.length) return null; const o = W[N[bi]]; let mx = [Infinity, Infinity, Infinity], Mx = [-Infinity, -Infinity, -Infinity];
      for (const v of vs) for (let c = 0; c < 3; c++) { const q = Pp[v * 3 + c] - o[c]; if (q < mx[c]) mx[c] = q; if (q > Mx[c]) Mx[c] = q; }
      const cx = (mx[0] + Mx[0]) / 2, cy = (mx[1] + Mx[1]) / 2, cz = (mx[2] + Mx[2]) / 2; let r2 = 0;
      for (const v of vs) { const dx = Pp[v * 3] - o[0] - cx, dy = Pp[v * 3 + 1] - o[1] - cy, dz = Pp[v * 3 + 2] - o[2] - cz; r2 = Math.max(r2, dx * dx + dy * dy + dz * dz); }
      return Float32Array.of(cx, cy, cz, Math.sqrt(r2) + 0.005);
    });
    return { bverts, bsph, probes: Float32Array.from(probes), key, V, T: ZOMBIE_TYPES[V.type], rest: R, world: W, geo, eye, extras, rigs, radius: rad, tris: geo.index.count / 3, btris: lists.map((l) => Uint32Array.from(l)) };
  },

  material(csm) {
    const T = TextureFactory.sets, f = T.flesh || T.leather; // piel podrida: pliegues, grietas y venas en el normal map; zonas húmedas en la rugosidad
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, roughnessMap: f.roughnessMap, metalness: 0, normalMap: f.normalMap, normalScale: new THREE.Vector2(0.95, 0.95) });
    if (csm) csm.setupMaterial(m);
    return m;
  },

  instance(key, material) {
    const VD = this.variants[key], bones = this.BONES.map((n) => { const b = new THREE.Bone(); b.name = n; b.position.set(...VD.rest[n]); return b; });
    this.PARENT.forEach((p, i) => { if (p >= 0) bones[p].add(bones[i]); });
    const mesh = new THREE.SkinnedMesh(VD.geo, material);
    mesh.add(bones[0]); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
    mesh.rotation.order = 'YXZ'; mesh.scale.setScalar(VD.V.scale);
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), VD.radius); // fija: no se recalcula con cada pose
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.layers.set(1); // capa 1: la linterna proyecta su sombra, la luna (sombras en cascada) no → mitad de coste
    const map = {}; bones.forEach((b) => (map[b.name] = b));
    return { mesh, bones: map };
  },
  // Apéndices articulados (tentáculos por segmentos y patas de araña de dos huesos); la geometría se comparte entre instancias
  rigGeo: {},
  rigGeometry(S) {
    if (S.kind === 'tentacle') { const L = S.len / S.segs; return Array.from({ length: S.segs }, (_, i) => new THREE.CylinderGeometry(lerp(S.r0, S.r1, (i + 1) / S.segs), lerp(S.r0, S.r1, i / S.segs), L * 1.08, 7, 1).translate(0, L / 2, 0)); }
    const fem = mergeGeometries([new THREE.CylinderGeometry(S.r * 0.85, S.r * 1.25, S.Lf, 7).rotateZ(-Math.PI / 2).translate(S.Lf / 2, 0, 0), new THREE.SphereGeometry(S.r * 1.2, 8, 6)], false);
    const tib = mergeGeometries([new THREE.CylinderGeometry(S.r * 0.12, S.r * 0.85, S.Lt, 7).rotateZ(-Math.PI / 2).translate(S.Lt / 2, 0, 0), new THREE.SphereGeometry(S.r * 1.05, 8, 6)], false);
    return [fem, tib];
  },
  buildRig(S, bone, xmat) {
    const key = [S.kind, S.segs, S.len, S.r0, S.r1, S.Lf, S.Lt, S.r].join('|'), G = this.rigGeo[key] || (this.rigGeo[key] = this.rigGeometry(S));
    const root = new THREE.Group(); root.position.set(S.base[0], S.base[1], S.base[2]); bone.add(root);
    const mk = (geo, parent) => { const m = new THREE.Mesh(geo, xmat[S.mat]); m.layers.set(1); m.castShadow = S.kind === 'leg'; m.receiveShadow = true; parent.add(m); return m; };
    if (S.kind === 'tentacle') {
      root.rotation.set(S.rot[0], S.rot[1], S.rot[2]); const segs = []; let parent = root;
      for (let i = 0; i < S.segs; i++) { const g = new THREE.Group(); if (i) g.position.y = S.len / S.segs; parent.add(g); mk(G[i], g); segs.push(g); parent = g; }
      return { spec: S, root, segs, ph: rand(0, TAU) };
    }
    root.rotation.y = S.yaw; const femur = new THREE.Group(); root.add(femur); mk(G[0], femur);
    const knee = new THREE.Group(); knee.position.x = S.Lf; femur.add(knee); mk(G[1], knee);
    return { spec: S, root, femur, knee };
  },
};
