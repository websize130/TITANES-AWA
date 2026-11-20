import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp, damp, lerp, rand, smooth } from '../core/utils.js';
import { Noise, TextureFactory } from '../render/textures.js';
import { FaceMasks, GeoUtil, HAIR_STYLES, SDF, Sculpt, bootSDF, earSDF, gauss, handSDF, headSDF, marchIn, pelvisSDF, roundBoxSDF, skinColors, soleSDF, torsoSDF } from './sdf.js';
import { ModelLoader } from './modelLoader.js';
import { vnoise3 } from '../zombies/zombieFactory.js';

/* =====================================================================
   PERSONAJES: anatomía esculpida + ropa PBR, o modelo GLTF/GLB
   Jerarquía (mira hacia +Z; su mano derecha está en -X):
   root → hips → (pelvis, thigh → knee → bota) · spine → chest →
          (torso, cuello, head → ojos/párpados, shoulder → elbow → hand → pistola)
   Para usar un modelo realista basta con definir look.model.url
   (o pulsar «Cargar modelo .glb» en el menú). Ver ModelLoader.
   ===================================================================== */
export const HEAD_OFFSET = [0, 0.068, 0.014];     // centro del cráneo respecto al pivote del cuello
export const EYE_POS = [0.032, HEAD_OFFSET[1] + 0.002, HEAD_OFFSET[2] + 0.064];     // centro del globo ocular (local de la cabeza)
export const EYE_R = 0.0118;
export const NO_SHADOW = /^(shoulder|elbow|hand|gun|eye|lid)/;

export const CharacterFactory = {
  cache: new Map(), shared: null,

  // Geometría común (manos, botas, orejas, ojos, párpados, pistola): se esculpe una vez
  prepareShared() {
    if (this.shared) return this.shared;
    const S = {};
    S.handR = GeoUtil.wrap(handSDF(1.45, 1.4, 1), [0.012, -0.06, 0], { nLon: 44, nLat: 30, rMax: 0.13 });
    S.handL = GeoUtil.mirrorX(GeoUtil.wrap(handSDF(0.45, 0.6, 0.3), [0.012, -0.06, 0], { nLon: 44, nLat: 30, rMax: 0.13 }));
    GeoUtil.scaleUV(S.handR, 4, 4); GeoUtil.scaleUV(S.handL, 4, 4);
    S.boot = GeoUtil.scaleUV(GeoUtil.wrap(bootSDF(), [0, -0.03, 0.04], { nLon: 40, nLat: 28, rMax: 0.26 }), 1.4, 1.4);
    S.sole = GeoUtil.wrap(soleSDF(), [0, -0.094, 0.05], { nLon: 32, nLat: 16, rMax: 0.2 });
    S.earL = GeoUtil.scaleUV(GeoUtil.wrap(earSDF(), [0, 0, 0], { nLon: 30, nLat: 22, rMax: 0.05 }), 2, 2);
    S.earR = GeoUtil.mirrorX(S.earL.clone());
    S.eye = new THREE.SphereGeometry(EYE_R, 28, 18).rotateX(Math.PI / 2);
    S.cornea = new THREE.SphereGeometry(0.0082, 24, 10, 0, TAU, 0, Math.PI * 0.42).rotateX(Math.PI / 2).translate(0, 0, 0.0042);
    const LR = 0.0129;
    const up = GeoUtil.lid(LR, (l) => 0.0047 - 0.0026 * Math.sin(l) ** 2, true), lo = GeoUtil.lid(LR, (l) => -0.0058 + 0.0018 * Math.sin(l) ** 2, false);
    S.lidU = up.geo; S.lidL = lo.geo;
    S.rimU = GeoUtil.edgeTube(up.edge, LR + 0.0003, 0.0011); S.rimL = GeoUtil.edgeTube(lo.edge, LR + 0.0003, 0.0009);
    S.lash = GeoUtil.edgeTube(up.edge, LR + 0.0011, 0.00055, [0, 0.0007, 0.0004]);
    S.lashF = GeoUtil.edgeTube(up.edge, LR + 0.0013, 0.0008, [0, 0.001, 0.0006]);
    // Pistola (local de la mano derecha: cañón hacia -Y, arriba = +Z)
    const gp = [];
    const piece = (g, x, y, z, rx = 0) => { g.rotateX(rx); g.translate(x, y, z); gp.push(g); };
    piece(new THREE.BoxGeometry(0.029, 0.19, 0.034), 0.028, -0.136, 0.062);
    piece(new THREE.BoxGeometry(0.025, 0.11, 0.02), 0.028, -0.165, 0.037);
    piece(new THREE.BoxGeometry(0.028, 0.05, 0.105), 0.028, -0.07, -0.004, -0.26);
    piece(new THREE.TorusGeometry(0.014, 0.0025, 6, 12, Math.PI).rotateY(Math.PI / 2).rotateX(Math.PI), 0.028, -0.108, 0.026);
    piece(new THREE.CylinderGeometry(0.0055, 0.0055, 0.012, 10), 0.028, -0.236, 0.066);
    piece(new THREE.BoxGeometry(0.006, 0.006, 0.006), 0.028, -0.225, 0.082);
    piece(new THREE.BoxGeometry(0.016, 0.006, 0.006), 0.028, -0.05, 0.082);
    for (let i = 0; i < 6; i++) piece(new THREE.BoxGeometry(0.0305, 0.002, 0.026), 0.028, -0.05 - i * 0.005, 0.064); // estrías
    S.gun = mergeGeometries(gp, false);
    S.muzzle = [0.028, -0.244, 0.066];
    const B = (w, h, d, x, y, z, rx = 0) => new THREE.BoxGeometry(w, h, d).rotateX(rx).translate(x, y, z);
    const Cy = (r, len, x, y, z, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).translate(x, y, z);
    const grip = () => B(0.028, 0.05, 0.105, 0.028, -0.07, -0.004, -0.26), guard = () => new THREE.TorusGeometry(0.014, 0.0025, 6, 12, Math.PI).rotateY(Math.PI / 2).rotateX(Math.PI).translate(0.028, -0.108, 0.026);
    S.guns = {
      pistol: S.gun,
      shotgun: mergeGeometries([grip(), guard(), B(0.032, 0.22, 0.05, 0.028, -0.06, 0.066), Cy(0.011, 0.58, 0.028, -0.45, 0.082, 12), Cy(0.0095, 0.4, 0.028, -0.36, 0.054),
        B(0.037, 0.15, 0.037, 0.028, -0.37, 0.052), B(0.032, 0.27, 0.055, 0.028, 0.17, 0.052, 0.12), B(0.006, 0.006, 0.006, 0.028, -0.72, 0.096)], false),
      smg: mergeGeometries([grip(), guard(), B(0.034, 0.27, 0.055, 0.028, -0.11, 0.07), Cy(0.0085, 0.11, 0.028, -0.29, 0.075), B(0.024, 0.036, 0.17, 0.028, -0.15, -0.045, 0.08),
        B(0.012, 0.21, 0.02, 0.028, 0.1, 0.062), B(0.012, 0.022, 0.024, 0.028, -0.03, 0.105), B(0.03, 0.06, 0.06, 0.028, -0.22, 0.03, -0.3)], false),
      rifle: mergeGeometries([grip(), guard(), B(0.036, 0.3, 0.06, 0.028, -0.08, 0.07), B(0.042, 0.22, 0.052, 0.028, -0.33, 0.072), Cy(0.0075, 0.17, 0.028, -0.52, 0.075),
        B(0.027, 0.05, 0.16, 0.028, -0.17, -0.03, 0.28), B(0.034, 0.25, 0.064, 0.028, 0.17, 0.058, 0.1), B(0.012, 0.13, 0.022, 0.028, -0.1, 0.114), Cy(0.012, 0.03, 0.028, -0.605, 0.075)], false),
    };
    S.muzzles = { pistol: S.muzzle, shotgun: [0.028, -0.745, 0.082], smg: [0.028, -0.35, 0.075], rifle: [0.028, -0.625, 0.075] };
    S.flash = mergeGeometries([new THREE.CylinderGeometry(0.02, 0.024, 0.08, 14).rotateX(Math.PI / 2), new THREE.BoxGeometry(0.03, 0.012, 0.03).translate(0, -0.024, -0.02)], false);
    S.lens = new THREE.CircleGeometry(0.018, 16).translate(0, 0, 0.0405);
    // Cuchillo de combate (local de la mano izquierda: hoja hacia -Y, filos hacia ±Z)
    S.knifeBlade = new THREE.CylinderGeometry(0.017, 0, 0.17, 4, 1).rotateY(Math.PI / 4).scale(0.22, 1, 1).translate(-0.012, -0.205, 0.004);
    S.knifeGrip = mergeGeometries([new THREE.CylinderGeometry(0.0115, 0.0105, 0.095, 10).translate(-0.012, -0.07, 0), new THREE.BoxGeometry(0.014, 0.008, 0.05).translate(-0.012, -0.12, 0.004), new THREE.SphereGeometry(0.012, 8, 6).translate(-0.012, -0.02, 0)], false);
    return (this.shared = S);
  },

  // Plano del personaje: geometrías fusionadas por grupo y material (cacheadas)
  build(def) {
    if (this.cache.has(def.id)) return this.cache.get(def.id);
    const S = this.prepareShared(), L = def.look, B = { bw: L.build, hw: L.hipW, female: !!L.female };
    const bucket = new Map();
    const add = (group, mat, geo) => { const k = group + '|' + mat; if (!bucket.has(k)) bucket.set(k, []); bucket.get(k).push(geo); };
    const T = (geo, x = 0, y = 0, z = 0) => geo.translate(x, y, z);

    /* --- Cabeza --- */
    // El cuello forma parte del mismo campo: mandíbula y nuca se funden con él sin escalón
    const nr = L.female ? 0.051 : 0.06 * Math.sqrt(L.build), nrl = nr / 1.04, face = headSDF(L.face);
    const hs = (x, y, z) => SDF.smin(face(x, y, z), SDF.cap(x, y, z, 0, -0.035, -0.024, 0, -0.215, -0.019, nrl * 0.94, nrl * 1.04), 0.028);
    const hg = Sculpt.sphere(hs, { cy: -0.02, nLon: 124, nLat: 94, rMax: 0.26 }); // más resolución: párpados, aletas nasales y labios definidos
    const hn = Sculpt.normals(hg.pos, hg.index, hg.W, hg.H, { poles: true });
    const skinGeo = GeoUtil.fromGrid(hg, hn, skinColors(hg, hn, hs, L));
    add('head', 'skin', T(GeoUtil.scaleUV(skinGeo, 11, 7), ...HEAD_OFFSET));
    const style = HAIR_STYLES[L.hairStyle] || HAIR_STYLES.short;
    const shellGeo = (sh, su, sv) => T(GeoUtil.scaleUV(GeoUtil.fromGrid(sh, sh.nor), su, sv), ...HEAD_OFFSET);
    const hair = Sculpt.shell(hg, hn, (x, y, z) => FaceMasks.hair(x, y, z, L.female), (x, y, z, u, v) => style.thick(x, y, z) * smooth(0, 0.022, y - FaceMasks.hairline(x, z, L.female)) * (0.88 + 0.24 * Noise.fbm(u, v, 40, 14, 2, 7)), style.inset || 0.003); // se afina hacia la línea del pelo
    add('head', 'hair', shellGeo(hair, 6, 2));
    add('head', 'hair', shellGeo(Sculpt.shell(hg, hn, (x, y, z) => FaceMasks.brow(x, y, z, L.female), () => (L.beard ? 0.0022 : 0.0017), 0.0006), 30, 10));
    if (L.beard) add('head', 'hair', shellGeo(Sculpt.shell(hg, hn, FaceMasks.beard, (x, y) => 0.0024 + 0.0034 * smooth(-0.07, -0.11, y), 0.003), 14, 6));
    if (L.locks) for (const s of [1, -1]) { // mechones sueltos que enmarcan la cara
      const c = HEAD_OFFSET, pts = [[s * 0.058, 0.055, 0.05], [s * 0.071, 0.01, 0.052], [s * 0.074, -0.04, 0.04], [s * 0.07, -0.085, 0.028]];
      add('head', 'hair', GeoUtil.taper(pts.map((p) => [p[0] + c[0], p[1] + c[1], p[2] + c[2]]), 0.0075, 0.0025, 8, 14));
    }
    if (L.hairStyle === 'tied') {
      const c = HEAD_OFFSET;
      add('head', 'hair', GeoUtil.taper([[0, 0.03, -0.095], [0, 0.004, -0.124], [0.004, -0.06, -0.136], [0.01, -0.14, -0.122], [0.012, -0.2, -0.104]].map((p) => [p[0] + c[0], p[1] + c[1], p[2] + c[2]]), 0.019, 0.006));
      add('head', 'gear', T(new THREE.TorusGeometry(0.0145, 0.004, 6, 16).rotateX(1.25), c[0], c[1] + 0.012, c[2] - 0.112));
    }
    for (const s of [1, -1]) {
      const ear = (s > 0 ? S.earL : S.earR).clone();
      ear.rotateY(-0.35 * s).rotateX(-0.25);
      add('head', 'skinPlain', T(ear, s * 0.0735 + HEAD_OFFSET[0], -0.012 + HEAD_OFFSET[1], -0.012 + HEAD_OFFSET[2]));
      const ex = s * EYE_POS[0];
      add('lidU' + (s > 0 ? 'L' : 'R'), 'skinPlain', S.lidU.clone()); add('lidU' + (s > 0 ? 'L' : 'R'), 'skinPlain', S.rimU.clone());
      add('lidU' + (s > 0 ? 'L' : 'R'), 'lash', (L.female ? S.lashF : S.lash).clone());
      add('head', 'skinPlain', T(S.lidL.clone(), ex, EYE_POS[1], EYE_POS[2])); add('head', 'skinPlain', T(S.rimL.clone(), ex, EYE_POS[1], EYE_POS[2]));
      add('eye' + (s > 0 ? 'L' : 'R'), 'eye', S.eye.clone()); add('eye' + (s > 0 ? 'L' : 'R'), 'cornea', S.cornea.clone());
      if (L.glasses) {
        add('head', 'metal', T(new THREE.TorusGeometry(0.0175, 0.0011, 6, 28), ex, EYE_POS[1] + 0.001, EYE_POS[2] + 0.02));
        add('head', 'metal', T(new THREE.CylinderGeometry(0.0009, 0.0009, 0.09, 5).rotateX(Math.PI / 2), s * 0.069, EYE_POS[1] + 0.004, EYE_POS[2] - 0.026));
      }
    }
    if (L.glasses) add('head', 'metal', T(new THREE.CylinderGeometry(0.0009, 0.0009, 0.03, 5).rotateZ(Math.PI / 2), 0, EYE_POS[1] + 0.006, EYE_POS[2] + 0.021));

    /* --- Cuello --- */
    add('chest', 'skinPlain', T(GeoUtil.tube(0.25, (t, a) => (nr + 0.006 * t + 0.02 * t * t * t) * (1 - 0.06 * Math.abs(Math.sin(a))) + (L.female ? 0 : 0.005 * gauss((t - 0.5) / 0.1, a / 0.35, 0)), { seg: 28, rows: 12, uvScale: 0.05 }), 0, 0.68, -0.01));

    /* --- Torso y pelvis esculpidos --- */
    const ts = torsoSDF(B), tg = Sculpt.cylinder(ts, { y0: -0.06, y1: 0.63, nY: 50, nA: 64 });
    const tn = Sculpt.normals(tg.pos, tg.index, tg.W, tg.H);
    const coat = L.outfit === 'field' || L.outfit === 'trench'; // la prenda exterior cubre el torso
    add('chest', coat ? 'layer' : 'top', GeoUtil.scaleUV(GeoUtil.fromGrid(tg, tn), 3, 2));
    const ps = pelvisSDF(B), pg = Sculpt.cylinder(ps, { y0: -0.16, y1: 0.16, nY: 22, nA: 56 });
    const pn = Sculpt.normals(pg.pos, pg.index, pg.W, pg.H);
    add('hips', 'pants', GeoUtil.scaleUV(GeoUtil.fromGrid(pg, pn), 3, 1));
    const torsoShell = (mask, off, mat, su = 3, sv = 2) => { const sh = Sculpt.shell(tg, tn, mask, () => off, 0.003); add('chest', mat, GeoUtil.scaleUV(GeoUtil.fromGrid(sh, sh.nor), su, sv)); };
    const pelvisShell = (mask, off, mat) => { const sh = Sculpt.shell(pg, pn, mask, () => off, 0.003); add('hips', mat, GeoUtil.scaleUV(GeoUtil.fromGrid(sh, sh.nor), 4, 1)); };
    const surfZ = (sdf, x, y) => { const t = marchIn(sdf, x, y, -0.3, 0, 0, 1, 0.6); return t < 0 ? 0.1 : -0.3 + t; }; // z de la superficie frontal
    pelvisShell((x, y) => smooth(0.07, 0.076, y) * smooth(0.118, 0.112, y), 0.007, 'leather');                     // cinturón
    add('hips', 'metal', T(new THREE.BoxGeometry(0.05, 0.036, 0.008), 0, 0.094, surfZ(ps, 0, 0.094) + 0.009));   // hebilla
    const flashP = [0.07 * L.build, 0.36, surfZ(ts, 0.07 * L.build, 0.36) + 0.04];

    if (L.outfit === 'tactical') { // camisa + chaleco portaplacas
      torsoShell((x, y, z) => smooth(0.08, 0.1, y) * smooth(0.47, 0.45, y) * (y < 0.36 ? smooth(0.15 * B.bw + 0.01, 0.15 * B.bw - 0.01, Math.abs(x)) : smooth(0.04, 0.055, Math.abs(x)) * smooth(0.115, 0.1, Math.abs(x))), 0.016, 'layer', 4, 3);
      for (const px of [-0.085, 0, 0.085]) { const z0 = surfZ(ts, px * L.build, 0.16); add('chest', 'layer', T(GeoUtil.wrap(roundBoxSDF(0.034, 0.045, 0.017, 0.007), [0, 0, 0], { nLon: 20, nLat: 14, rMax: 0.08 }), px * L.build, 0.16, z0 + 0.031)); }
      add('chest', 'top', T(GeoUtil.tube(0.045, (t) => nr + 0.012 + 0.012 * t, { seg: 28, rows: 3, uvScale: 0.1, close: false }), 0, 0.495, -0.012));
      add('thighR', 'gear', T(GeoUtil.wrap(roundBoxSDF(0.022, 0.07, 0.05, 0.008), [0, 0, 0], { nLon: 20, nLat: 14, rMax: 0.12 }), -0.09 * L.hipW, -0.14, 0.01));
    } else if (L.outfit === 'trench') { // gabardina abierta, camisa y corbata
      const xin = (y) => 0.012 + (y - 0.16) * 0.2;
      torsoShell((x, y, z) => (z > 0 ? 1 : 0) * smooth(0.16, 0.18, y) * smooth(xin(y) + 0.004, xin(y) - 0.004, Math.abs(x)), 0.002, 'shirt');
      torsoShell((x, y, z) => (z > 0 ? 1 : 0) * smooth(0.15, 0.17, y) * smooth(0.47, 0.45, y) * smooth(0.011, 0.007, Math.abs(x)), 0.004, 'tie');
      torsoShell((x, y, z) => (z > 0 ? 1 : 0) * smooth(0.18, 0.2, y) * smooth(xin(y) - 0.002, xin(y) + 0.004, Math.abs(x)) * smooth(xin(y) + 0.06, xin(y) + 0.05, Math.abs(x)), 0.007, 'layer');
      add('chest', 'layer', T(GeoUtil.tube(0.06, (t) => nr + 0.022 - 0.006 * t, { seg: 28, rows: 4, uvScale: 0.15, close: false }), 0, 0.5, -0.016));
      add('hips', 'layer', T(GeoUtil.tube(0.66, (t, a) => {
        const rx = (0.19 + 0.07 * t) * L.hipW, rz = 0.125 + 0.05 * t, e = Math.hypot(Math.sin(a) / rx, Math.cos(a) / rz);
        return 1 / e + 0.009 * t * Math.sin(a * 9 + t * 2) + 0.004 * t * Math.sin(a * 23);
      }, { seg: 48, rows: 16, arc: [0.32, TAU - 0.32], uvScale: 0.3 }), 0, 0.09, -0.01));
    } else if (L.outfit === 'field') { // chaqueta de campo con bolsillos y camisa en el escote
      const xv = (y) => 0.008 + (y - 0.3) * 0.16;
      torsoShell((x, y, z) => (z > 0 ? 1 : 0) * smooth(0.3, 0.32, y) * smooth(xv(y) + 0.004, xv(y) - 0.004, Math.abs(x)), 0.002, 'top');
      for (const s of [1, -1]) { const z0 = surfZ(ts, s * 0.075, 0.3); add('chest', 'layer', T(GeoUtil.wrap(roundBoxSDF(0.034, 0.04, 0.007, 0.004), [0, 0, 0], { nLon: 18, nLat: 12, rMax: 0.07 }), s * 0.075, 0.3, z0 + 0.005)); }
      add('chest', 'layer', T(GeoUtil.tube(0.045, (t) => nr + 0.02 - 0.005 * t, { seg: 28, rows: 3, uvScale: 0.15, close: false }), 0, 0.495, -0.014));
      add('hips', 'layer', T(GeoUtil.tube(0.19, (t, a) => { const rx = (0.178 + 0.01 * t) * L.hipW, rz = 0.13 + 0.008 * t; return 1 / Math.hypot(Math.sin(a) / rx, Math.cos(a) / rz) + 0.004 * Math.sin(a * 11) * t; }, { seg: 48, rows: 8, uvScale: 0.3, close: false }), 0, 0.1, -0.014));
    } else if (L.outfit === 'hoodie') { // sudadera, capucha, bolsillo canguro y mochila
      torsoShell((x, y, z) => (z > 0 ? 1 : 0) * smooth(0.0, 0.015, y) * smooth(0.14, 0.125, y) * smooth(0.105, 0.09, Math.abs(x)), 0.006, 'top');
      torsoShell((x, y, z) => { const ax = Math.abs(x); return smooth(0.05, 0.06, ax) * smooth(0.098, 0.088, ax) * (z > 0 ? smooth(0.1, 0.12, y) : smooth(0.27, 0.29, y)) * smooth(0.52, 0.5, y); }, 0.011, 'gear');
      add('chest', 'top', T(new THREE.TorusGeometry(0.088, 0.034, 14, 36).scale(1.05, 1.1, 0.62).rotateX(Math.PI / 2 + 0.38), 0, 0.5, -0.05));
      for (const s of [1, -1]) add('chest', 'gear', T(new THREE.CylinderGeometry(0.0022, 0.0022, 0.13, 5), s * 0.026, 0.42, surfZ(ts, s * 0.026, 0.42) + 0.006));
      add('chest', 'pack', T(GeoUtil.wrap(roundBoxSDF(0.13, 0.17, 0.065, 0.03), [0, 0, 0], { nLon: 28, nLat: 20, rMax: 0.3 }), 0, 0.27, -0.18));
      add('hips', 'top', T(GeoUtil.tube(0.13, (t, a) => 1 / Math.hypot(Math.sin(a) / (0.166 * L.hipW), Math.cos(a) / 0.112) + 0.004, { seg: 48, rows: 6, uvScale: 0.3, close: false }), 0, 0.12, 0));
    }

    /* --- Equipo de superviviente (referencia AAA): braga de cuello, mochila con petate y rodilleras --- */
    const gear = L.gear || [];
    if (gear.includes('scarf')) {
      add('chest', 'scarf', T(GeoUtil.tube(0.072, (t, a) => nr + 0.02 + 0.012 * t + 0.008 * Math.sin(a * 6 + t * 5) + 0.004 * Math.sin(a * 11 + 1) + 0.02 * Math.max(0, Math.cos(a)) * t, { seg: 40, rows: 8, uvScale: 0.12, close: false }), 0, 0.522, -0.012));
      const zf = surfZ(ts, 0.02, 0.42) + 0.016 + 0.028;
      add('chest', 'scarf', GeoUtil.taper([[0.016, 0.47, zf - 0.012], [0.026, 0.42, zf], [0.03, 0.37, zf + 0.004], [0.026, 0.33, zf + 0.002]], 0.025, 0.014, 10, 12));
    }
    if (gear.includes('pack')) {
      const tb = marchIn(ts, 0, 0.27, 0.3, 0, 0, -1, 0.6), zb = tb < 0 ? -0.12 : 0.3 - tb; // espalda
      add('chest', 'pack', T(GeoUtil.wrap(roundBoxSDF(0.125, 0.15, 0.06, 0.028), [0, 0, 0], { nLon: 28, nLat: 20, rMax: 0.3 }), 0, 0.27, zb - 0.064));
      add('chest', 'pack', T(GeoUtil.wrap(roundBoxSDF(0.08, 0.06, 0.03, 0.015), [0, 0, 0], { nLon: 18, nLat: 12, rMax: 0.15 }), 0, 0.2, zb - 0.137));
      add('chest', 'gear', T(new THREE.CylinderGeometry(0.046, 0.046, 0.27, 18).rotateZ(Math.PI / 2), 0, 0.455, zb - 0.06)); // petate enrollado
      torsoShell((x, y) => { const ax = Math.abs(x); return smooth(0.06, 0.07, ax) * smooth(0.092, 0.082, ax) * smooth(0.2, 0.22, y) * smooth(0.6, 0.58, y); }, 0.021, 'gear'); // correas
    }

    /* --- Brazos --- */
    const top = L.outfit === 'tactical' || L.outfit === 'hoodie' ? 'top' : 'layer', bw = L.build;
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      add('shoulder' + side, top, GeoUtil.scaleUV(T(GeoUtil.wrap((x, y, z) => SDF.ellip(x, y, z, -s * 0.004, -0.03, 0, 0.046 * bw, 0.062, 0.05), [-s * 0.004, -0.03, 0], { nLon: 28, nLat: 18, rMax: 0.12 })), 2, 2));
      add('shoulder' + side, top, GeoUtil.tube(0.31, (t, a) => bw * (0.05 - 0.012 * t + 0.0045 * gauss((t - 0.45) / 0.22, 0, 0) * Math.max(0, Math.cos(a))) * (1 + 0.025 * Math.sin(t * 19 + Math.sin(a * 3) * 1.4)), { seg: 22, rows: 16 }));
      add('elbow' + side, top, GeoUtil.tube(0.24, (t, a) => bw * (0.041 - 0.012 * t + 0.004 * gauss((t - 0.25) / 0.15, 0, 0)) * (1 + 0.03 * Math.sin(t * 23 + Math.sin(a * 2) * 2) * smooth(0.6, 1, t)) * (1 + 0.08 * Math.cos(2 * a)), { seg: 22, rows: 14 }));
      add('elbow' + side, top, T(GeoUtil.tube(0.035, () => bw * 0.032, { seg: 22, rows: 2, close: false }), 0, -0.225, 0));
      const hand = (s > 0 ? S.handL : S.handR).clone().scale(bw ** 0.4, 1, bw ** 0.4);
      add('hand' + side, L.gloves ? 'glove' : 'skinPlain', hand);
    }
    add('gun', 'gun', S.gun.clone());
    add('knife', 'metal', S.knifeBlade.clone()); add('knife', 'rubber', S.knifeGrip.clone());

    /* --- Piernas --- */
    const hw = L.hipW;
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      add('thigh' + side, 'pants', GeoUtil.tube(0.45, (t, a) => hw * (0.09 - 0.032 * Math.pow(t, 1.15)) * (1 + 0.06 * Math.cos(2 * a)) * (1 + 0.02 * Math.sin(t * 17 + Math.sin(a * 2) * 2)), { seg: 26, rows: 16, off: (t) => [s * 0.004 * t, 0.006 * t] }));
      add('knee' + side, 'pants', GeoUtil.tube(0.34, (t, a) => hw * (0.058 - 0.008 * t + 0.006 * gauss((t - 0.3) / 0.2, 0, 0) * Math.max(0, -Math.cos(a))) * (1 - 0.24 * smooth(0.6, 0.7, t)) * (1 + 0.06 * Math.sin(t * 44 + a * 2) * gauss((t - 0.56) / 0.07, 0, 0)), { seg: 24, rows: 18 }));
      add('knee' + side, 'leather', T(S.boot.clone(), 0, -0.36, 0));
      add('knee' + side, 'rubber', T(S.sole.clone(), 0, -0.36, 0));
      if (L.outfit === 'tactical' || L.outfit === 'hoodie') add('thigh' + side, 'pants', T(GeoUtil.wrap(roundBoxSDF(0.02, 0.06, 0.05, 0.01), [0, 0, 0], { nLon: 18, nLat: 12, rMax: 0.1 }), s * 0.085 * hw, -0.24, 0.005));
      if (gear.includes('kneepads')) {
        add('knee' + side, 'gear', T(GeoUtil.wrap(roundBoxSDF(0.042, 0.056, 0.016, 0.012), [0, 0, 0], { nLon: 18, nLat: 12, rMax: 0.1 }), 0, -0.035, 0.058 * hw + 0.008));
        add('knee' + side, 'gear', T(GeoUtil.tube(0.018, () => 0.063 * hw, { seg: 24, rows: 1, close: false }), 0, -0.07, 0)); // correa
      }
    }

    /* --- Desgaste por vértice: barro que sube desde las botas, rozaduras en rodillas y codos, sangre seca --- */
    const GY = { hips: 0.95, thighL: 0.89, thighR: 0.89, kneeL: 0.46, kneeR: 0.46, chest: 1.0, shoulderL: 1.435, shoulderR: 1.435, elbowL: 1.135, elbowR: 1.135, handL: 0.88, handR: 0.88, head: 1.605 };
    const GRIME = new Set(['top', 'layer', 'pants', 'shirt', 'tie', 'pack', 'gear', 'leather', 'glove', 'scarf']), gseed = def.id.length * 13 + def.id.charCodeAt(0);
    for (const [k, list] of bucket) {
      const [group, mat] = k.split('|'); if (!GRIME.has(mat)) continue;
      const base = GY[group] ?? 1, knee = group.startsWith('knee'), elbow = group.startsWith('elbow');
      for (const geo of list) {
        const p = geo.attributes.position, col = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i), wy = base + y, n1 = vnoise3(x * 9 + 3, wy * 9, z * 9, gseed), n2 = vnoise3(x * 31, wy * 31, z * 31, gseed + 7);
          const mud = smooth(0.62, 0.06, wy) * (0.5 + 0.5 * n1) + smooth(0.78, 0.92, n2) * smooth(0.9, 0.3, wy) * 0.4;
          const rub = (knee ? Math.exp(-(((y + 0.02) / 0.07) ** 2)) * smooth(0, 0.04, z) : 0) + (elbow ? Math.exp(-((y / 0.06) ** 2)) * 0.6 : 0);
          const dust = 0.1 + 0.12 * n1, blood = smooth(0.87, 0.96, vnoise3(x * 55 + 9, wy * 55, z * 55, gseed + 3)) * smooth(0.5, 0.9, wy) * 0.7;
          // oclusión de contacto: axilas, entrepierna y pliegues de las articulaciones
          const limb = /^(shoulder|elbow|thigh|knee)/.test(group) ? 0.13 * Math.exp(-((y / 0.045) ** 2)) : 0;
          const pit = group === 'chest' ? 0.24 * Math.exp(-(((Math.abs(x) - 0.15 * L.build) / 0.035) ** 2) - (((y - 0.36) / 0.06) ** 2)) : group === 'hips' ? 0.22 * Math.exp(-((x / 0.045) ** 2) - (((y + 0.12) / 0.05) ** 2)) : 0;
          const ao = 1 - limb - pit;
          col[i * 3] = lerp(1 - 0.5 * mud - 0.06 * dust + rub * 0.12, 0.42, blood) * ao;
          col[i * 3 + 1] = lerp(1 - 0.55 * mud - 0.07 * dust + rub * 0.1, 0.07, blood) * ao;
          col[i * 3 + 2] = lerp(1 - 0.62 * mud - 0.09 * dust + rub * 0.06, 0.06, blood) * ao;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      }
    }

    const pieces = [];
    for (const [k, list] of bucket) {
      const [group, mat] = k.split('|');
      const geo = list.length > 1 ? mergeGeometries(list, false) : list[0];
      if (!geo) { console.warn('[BLOOD DEAD] No se pudo fusionar', k); continue; }
      geo.computeBoundingSphere();
      pieces.push({ group, mat, geo });
    }
    const bp = { pieces, flash: flashP };
    this.cache.set(def.id, bp);
    return bp;
  },

  materials(def, csm) {
    const L = def.look, T = TextureFactory.sets, M = {};
    const reg = (k, m) => { if (csm) csm.setupMaterial(m); M[k] = m; return m; };
    const v2 = (s) => new THREE.Vector2(s, s);
    const fabric = (color, set, nScale = 1, rough = 1, vc = true) => new THREE.MeshPhysicalMaterial({ color, vertexColors: vc, map: T[set].map, normalMap: T[set].normalMap, roughnessMap: T[set].roughnessMap, roughness: rough, metalness: 0, normalScale: v2(nScale * 1.15), sheen: 0.5, sheenRoughness: 0.82, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3).multiplyScalar(0.6) }); // las fibras dan un brillo suave al rasante: no parece plástico
    // Piel: rugosidad alta (sin brillo plástico) + sheen rojizo que imita la dispersión subsuperficial
    // Piel: rugosidad alta + especular dieléctrico (IOR 1,4) + sheen rojizo (dispersión) + una película de sudor muy fina
    const skin = (vc) => new THREE.MeshPhysicalMaterial({ color: vc ? 0xffffff : L.skin, vertexColors: vc, roughness: 0.66, metalness: 0, ior: 1.4, specularIntensity: 0.42, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x8c3a2c), clearcoat: 0.06, clearcoatRoughness: 0.6, normalMap: T.pores.normalMap, normalScale: v2(0.42) });
    reg('skin', skin(true)); reg('skinPlain', skin(false)).color.multiplyScalar(0.9); // iguala el tono medio de la cara (que lleva oclusión)
    const hc = new THREE.Color(L.hair);
    reg('hair', new THREE.MeshPhysicalMaterial({ color: L.hair, map: T.strands.map, normalMap: T.strands.normalMap, normalScale: v2(0.7), roughness: 0.52, metalness: 0, sheen: 0.8, sheenRoughness: 0.35, sheenColor: hc.clone().lerp(new THREE.Color(0xffffff), 0.25), side: THREE.DoubleSide }));
    reg('lash', new THREE.MeshStandardMaterial({ color: hc.clone().multiplyScalar(0.5), roughness: 0.75 }));
    reg('eye', new THREE.MeshPhysicalMaterial({ map: TextureFactory.iris(L.eyes), roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 })); // ojo húmedo
    reg('cornea', new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.03, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 2.5 }));
    reg('top', fabric(L.top, L.fab?.top || 'canvas'));
    reg('layer', fabric(L.layer || L.top, L.fab?.layer || 'canvas')).side = THREE.DoubleSide; // abrigos abiertos: se ve el forro
    reg('pants', fabric(L.pants, L.fab?.pants || 'denim'));
    reg('shirt', fabric(L.shirt || 0xb8b4ac, 'canvas', 0.6));
    reg('tie', fabric(L.tie || 0x2a1f22, 'denim', 0.4));
    reg('pack', fabric(L.pack || 0x3b3429, 'nylon'));
    reg('scarf', fabric(L.scarf || 0x3b352b, 'rib', 1.1)).side = THREE.DoubleSide;
    // Cuero gastado: rugosidad por mapa + una capa de barniz desigual (clearcoat) que capta la luz en los pliegues
    reg('leather', new THREE.MeshPhysicalMaterial({ color: L.boots, vertexColors: true, map: T.leather.map, normalMap: T.leather.normalMap, roughnessMap: T.leather.roughnessMap, roughness: 0.95, metalness: 0, normalScale: v2(1.2), clearcoat: 0.28, clearcoatRoughness: 0.55 }));
    reg('glove', new THREE.MeshPhysicalMaterial({ color: L.gloves || 0x1d1d1b, vertexColors: true, map: T.leather.map, normalMap: T.leather.normalMap, roughnessMap: T.leather.roughnessMap, roughness: 0.95, metalness: 0, normalScale: v2(1.1), clearcoat: 0.18, clearcoatRoughness: 0.6 }));
    reg('rubber', new THREE.MeshStandardMaterial({ color: 0x161514, roughness: 0.92, metalness: 0 }));
    reg('gear', fabric(0x1e2021, 'nylon', 0.8));
    reg('flashGear', fabric(0x1e2021, 'nylon', 0.8, 1, false));
    reg('metal', new THREE.MeshStandardMaterial({ color: 0x9a9c9f, roughness: 0.3, metalness: 1, roughnessMap: T.leather.roughnessMap })); // acero con microarañazos
    reg('gun', new THREE.MeshPhysicalMaterial({ color: 0x161719, roughness: 0.42, metalness: 0.9, clearcoat: 0.35, clearcoatRoughness: 0.35, roughnessMap: T.leather.roughnessMap })); // pavonado aceitado
    M.lens = new THREE.MeshBasicMaterial({ color: 0xfff3dc });
    return M;
  },

  /* --- Piel deformable: tronco y extremidades se funden por material en SkinnedMesh con pesos mezclados
         cerca de cada articulación → hombros, codos, muñecas, cintura, caderas y rodillas se doblan sin cortes --- */
  SKIN_BONES: ['hips', 'spine', 'chest', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR', 'thighL', 'kneeL', 'thighR', 'kneeR'],
  skinRest(L) { // reposo de cada hueso en el espacio del personaje (sin rotaciones)
    const o = { hips: [0, 0.95, 0], spine: [0, 1.0, 0], chest: [0, 1.0, 0] };
    for (const s of [1, -1]) {
      const d = s > 0 ? 'L' : 'R', sx = s * 0.185 * L.build, tx = s * 0.092 * L.hipW;
      o['shoulder' + d] = [sx, 1.435, -0.01]; o['elbow' + d] = [sx, 1.135, -0.01]; o['hand' + d] = [sx, 0.88, -0.01];
      o['thigh' + d] = [tx, 0.89, 0]; o['knee' + d] = [tx, 0.46, 0];
    }
    return o;
  },
  skinWeights(g, mat, x, y, z, L) { // → [hueso principal, peso, hueso vecino]
    const s = g.slice(-1);
    switch (g) {
      case 'shoulderL': case 'shoulderR': { const a = smooth(-0.03, 0.04, y) * 0.45, b = smooth(-0.25, -0.32, y) * 0.5; return a >= b ? [g, 1 - a, 'chest'] : [g, 1 - b, 'elbow' + s]; }
      case 'elbowL': case 'elbowR': { const a = smooth(-0.05, 0.03, y) * 0.5, b = smooth(-0.2, -0.26, y) * 0.35; return a >= b ? [g, 1 - a, 'shoulder' + s] : [g, 1 - b, 'hand' + s]; }
      case 'handL': case 'handR': return [g, 1 - smooth(-0.035, 0.01, y) * 0.35, 'elbow' + s];
      case 'thighL': case 'thighR': { const a = smooth(-0.07, 0.02, y) * 0.45, b = smooth(-0.37, -0.45, y) * 0.5; return a >= b ? [g, 1 - a, 'hips'] : [g, 1 - b, 'knee' + s]; }
      case 'kneeL': case 'kneeR': return [g, 1 - smooth(-0.06, 0.02, y) * 0.5, 'thigh' + s];
      case 'hips': {
        if (mat === 'layer') return ['hips', 1, 'hips']; // faldón del abrigo: rígido
        const a = smooth(0.06, 0.17, y) * 0.4; if (a > 0) return ['hips', 1 - a, 'chest'];
        return ['hips', 1 - smooth(-0.03, -0.14, y) * smooth(0.02, 0.07, Math.abs(x)) * 0.4, x > 0 ? 'thighL' : 'thighR'];
      }
      case 'chest': {
        if (mat === 'pack' || mat === 'scarf' || mat === 'skinPlain') return ['chest', 1, 'chest'];
        const a = smooth(0.03, -0.06, y) * 0.45; if (a > 0) return ['chest', 1 - a, 'hips'];
        return ['chest', 1 - smooth(0.13 * L.build, 0.2 * L.build, Math.abs(x)) * smooth(0.32, 0.42, y) * 0.35, x > 0 ? 'shoulderL' : 'shoulderR'];
      }
    }
    return [g, 1, g];
  },
  buildSkin(def, bp) {
    if (bp.skin) return bp.skin;
    const L = def.look, R = this.skinRest(L), BI = Object.fromEntries(this.SKIN_BONES.map((n, i) => [n, i])), byMat = new Map(), rigid = [];
    for (const p of bp.pieces) {
      if (!(p.group in BI) || p.mat === 'gun' || p.mat === 'cornea') { rigid.push(p); continue; }
      const geo = p.geo.clone(), P = geo.attributes.position, n = P.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), o = R[p.group];
      for (let i = 0; i < n; i++) { const w = this.skinWeights(p.group, p.mat, P.getX(i), P.getY(i), P.getZ(i), L); si[i * 4] = BI[w[0]]; sw[i * 4] = w[1]; si[i * 4 + 1] = BI[w[2]]; sw[i * 4 + 1] = 1 - w[1]; }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      geo.translate(o[0], o[1], o[2]);
      if (!byMat.has(p.mat)) byMat.set(p.mat, []);
      byMat.get(p.mat).push(geo);
    }
    const parts = [];
    for (const [mat, list] of byMat) {
      const g = list.length > 1 ? mergeGeometries(list, false) : list[0];
      if (!g) { console.warn('[BLOOD DEAD] No se pudo fundir la piel', mat); continue; }
      g.computeBoundingSphere(); parts.push({ mat, geo: g });
    }
    return (bp.skin = { parts, rigid });
  },

  create(def, { csm = null } = {}) {
    const bp = this.build(def), S = this.prepareShared(), L = def.look, M = this.materials(def, csm), G = {}, skin = this.buildSkin(def, bp), SB = new Set(this.SKIN_BONES);
    const root = new THREE.Group(); root.name = 'char-' + def.id;
    const g = (name, parent, x = 0, y = 0, z = 0) => { const o = SB.has(name) ? new THREE.Bone() : new THREE.Group(); o.name = name; o.position.set(x, y, z); parent.add(o); return (G[name] = o); };
    g('hips', root, 0, 0.95, 0); g('spine', G.hips, 0, 0.05, 0); g('chest', G.spine);
    g('head', G.chest, 0, 0.605, -0.005); G.head.scale.setScalar(1.04);
    for (const s of [1, -1]) {
      const sd = s > 0 ? 'L' : 'R', ex = s * EYE_POS[0];
      g('eye' + sd, G.head, ex, EYE_POS[1], EYE_POS[2]); g('lidU' + sd, G.head, ex, EYE_POS[1], EYE_POS[2]);
      g('shoulder' + sd, G.chest, s * 0.185 * L.build, 0.435, -0.01); g('elbow' + sd, G['shoulder' + sd], 0, -0.3, 0); g('hand' + sd, G['elbow' + sd], 0, -0.255, 0);
      g('thigh' + sd, G.hips, s * 0.092 * L.hipW, -0.06, 0); g('knee' + sd, G['thigh' + sd], 0, -0.43, 0);
    }
    g('gun', G.handR); g('knife', G.handL);
    const meshes = {};
    for (const p of skin.rigid) { // cabeza, ojos, párpados, pistola y cuchillo: piezas rígidas
      const m = new THREE.Mesh(p.geo, M[p.mat]);
      m.castShadow = !NO_SHADOW.test(p.group) && p.mat !== 'cornea' && p.mat !== 'lash';
      m.receiveShadow = p.mat !== 'cornea';
      G[p.group].add(m); meshes[p.group + '|' + p.mat] = m;
    }
    const skinned = skin.parts.map((p) => { const m = new THREE.SkinnedMesh(p.geo, M[p.mat]); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.name = 'piel-' + p.mat; root.add(m); return m; });
    root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(this.SKIN_BONES.map((n) => G[n]));
    for (const m of skinned) m.bind(skeleton);
    const muzzle = new THREE.Object3D(); muzzle.position.set(...S.muzzle); G.gun.add(muzzle);
    const gunMeshes = { pistol: meshes['gun|gun'] };
    for (const k of ['shotgun', 'smg', 'rifle']) { const m = new THREE.Mesh(S.guns[k], M.gun); m.visible = false; G.gun.add(m); gunMeshes[k] = m; }
    const setWeapon = (k) => { for (const n in gunMeshes) if (gunMeshes[n]) gunMeshes[n].visible = n === k; muzzle.position.set(...(S.muzzles[k] || S.muzzle)); };
    const flashMount = new THREE.Group(); flashMount.position.set(...bp.flash); G.chest.add(flashMount);
    flashMount.add(new THREE.Mesh(S.flash, M.flashGear), new THREE.Mesh(S.lens, M.lens));
    root.scale.setScalar(L.scale);

    const legs = { L: { thigh: G.thighL, knee: G.kneeL }, R: { thigh: G.thighR, knee: G.kneeR } };
    const arms = { L: { shoulder: G.shoulderL, elbow: G.elbowL, hand: G.handL }, R: { shoulder: G.shoulderR, elbow: G.elbowR, hand: G.handR } };
    const { hips, spine, chest, head } = G, hipBase = hips.position.y;
    const st = { t: Math.random() * 10, phase: 0, blink: rand(1, 4), blinkT: 0, gaze: 0, gx: 0, gy: 0, tx: 0, ty: 0, br: 0, ps: 0, ln: 0, lv: 0, ex: 0 };
    const shY = G.shoulderL.position.y;
    G.knife.visible = false;

    function animate(dt, o = {}) {
      st.t += dt;
      const t = st.t, speed = o.speed || 0, run = o.running ? 1 : 0, a = o.aim || 0, pitch = o.pitch || 0;
      const amt = Math.min(1, speed / 3);
      const ph = o.phase !== undefined ? o.phase : (st.phase += dt * speed * 4);
      const sw = Math.sin(ph), cw = Math.cos(ph);
      const legA = (0.5 + 0.28 * run) * amt, kA = (0.75 + 0.55 * run) * amt;
      legs.L.thigh.rotation.x = -sw * legA; legs.R.thigh.rotation.x = sw * legA;
      legs.L.knee.rotation.x = Math.max(0, cw) * kA + 0.05; legs.R.knee.rotation.x = Math.max(0, -cw) * kA + 0.05;
      hips.position.y = hipBase - 0.03 * amt * Math.abs(sw) - 0.03 * run * amt;
      hips.rotation.y = sw * 0.07 * amt;
      chest.rotation.y = -sw * 0.1 * amt * (1 - a);
      chest.rotation.x = Math.sin(t * 1.7) * 0.012 * (1 - amt);
      const lean = 0.06 * amt + 0.12 * run * amt;
      spine.rotation.x = lerp(lean, -pitch * 0.6, a);
      head.rotation.x = lerp(-lean * 0.6 + Math.sin(t * 0.9) * 0.02, -pitch * 0.35, a);
      head.rotation.y = o.idleLook ? Math.sin(t * 0.37) * 0.35 * (1 - amt) : 0;
      const armA = (0.42 + 0.4 * run) * amt;
      arms.L.shoulder.rotation.x = lerp(sw * armA + 0.05, -1.5 - pitch * 0.4, a);
      arms.L.shoulder.rotation.z = lerp(0.09, -0.46, a);
      arms.L.elbow.rotation.x = lerp(-0.25 - 0.7 * run * amt, -0.12, a);
      arms.R.shoulder.rotation.x = lerp(-sw * armA * 0.6 - 0.25, -Math.PI / 2 - pitch * 0.4, a);
      arms.R.shoulder.rotation.z = lerp(-0.09, 0.26, a);
      arms.R.elbow.rotation.x = lerp(-0.55 - 0.5 * run * amt, -0.03, a);
      /* Microanimaciones: peso, respiración, inercia y golpes */
      const idle = 1 - amt, sway = Math.sin(t * 0.42);
      hips.position.x = sw * 0.024 * amt + sway * 0.012 * idle;              // el peso pasa a la pierna de apoyo
      hips.rotation.z = -sw * 0.055 * amt + sway * 0.022 * idle;             // la pelvis cae del lado que se levanta
      chest.rotation.z = sw * 0.045 * amt - sway * 0.012 * idle;              // el tronco compensa
      legs.L.knee.rotation.x += Math.max(0, -sway) * 0.07 * idle; legs.R.knee.rotation.x += Math.max(0, sway) * 0.07 * idle;
      st.ex = damp(st.ex, clamp(o.exert || 0, 0, 1), 1.2, dt);                // respiración: más rápida y honda con el cansancio
      st.br += dt * TAU * (0.26 + 0.55 * st.ex);
      const br = Math.sin(st.br), bA = 0.008 + 0.03 * st.ex;
      chest.rotation.x -= br * bA; head.rotation.x += br * bA * 0.5;
      G.shoulderL.position.y = G.shoulderR.position.y = shY + Math.max(0, br) * (0.004 + 0.01 * st.ex);
      const acc = clamp((speed - st.ps) / Math.max(dt, 1e-3), -12, 12); st.ps = speed; // inercia: se inclina al arrancar y cabecea al frenar
      st.lv += ((acc * 0.012 - st.ln) * 90 - st.lv * 11) * dt; st.ln = clamp(st.ln + st.lv * dt, -0.14, 0.14);
      spine.rotation.x += st.ln * (1 - a);
      const hk = (o.hurt || 0) ** 2, hz = o.hitZ ?? 1, hx = o.hitX || 0;   // golpe: el cuerpo cede en la dirección del impacto
      if (hk > 0.001) {
        spine.rotation.x -= hz * 0.3 * hk; chest.rotation.z += hx * 0.2 * hk; chest.rotation.y += hx * 0.16 * hk;
        head.rotation.x -= hz * 0.26 * hk; head.rotation.y += hx * 0.22 * hk;
        arms.L.shoulder.rotation.z += 0.22 * hk; arms.R.shoulder.rotation.z -= 0.22 * hk;
      }
      // Agachado (rodillas flexionadas, tronco adelantado) y deslizamiento táctico (pierna estirada, la otra recogida, espalda atrás)
      const cr = o.crouch || 0, sl = o.slide || 0;
      if (cr > 0.001) {
        hips.position.y -= 0.29 * cr; spine.rotation.x += 0.3 * cr * (1 - a * 0.5);
        legs.L.thigh.rotation.x = lerp(legs.L.thigh.rotation.x, -1.0 - 0.25 * Math.max(0, -sw) * amt, cr); legs.R.thigh.rotation.x = lerp(legs.R.thigh.rotation.x, -1.0 - 0.25 * Math.max(0, sw) * amt, cr);
        legs.L.knee.rotation.x = lerp(legs.L.knee.rotation.x, 1.7, cr); legs.R.knee.rotation.x = lerp(legs.R.knee.rotation.x, 1.7, cr);
      }
      if (sl > 0.001) {
        hips.position.y = lerp(hips.position.y, hipBase - 0.5, sl); spine.rotation.x = lerp(spine.rotation.x, -0.38, sl); head.rotation.x = lerp(head.rotation.x, 0.3, sl);
        legs.L.thigh.rotation.x = lerp(legs.L.thigh.rotation.x, -1.25, sl); legs.L.knee.rotation.x = lerp(legs.L.knee.rotation.x, 0.1, sl);
        legs.R.thigh.rotation.x = lerp(legs.R.thigh.rotation.x, -0.35, sl); legs.R.knee.rotation.x = lerp(legs.R.knee.rotation.x, 2.0, sl);
        arms.L.shoulder.rotation.z = lerp(arms.L.shoulder.rotation.z, 0.9, sl * (1 - a)); arms.L.shoulder.rotation.x = lerp(arms.L.shoulder.rotation.x, -0.5, sl * (1 - a));
      }
      head.rotation.z = -(hips.rotation.z + chest.rotation.z) * 0.7;           // la cabeza se estabiliza (mirada nivelada)
      // Tajo de cuchillo con la mano izquierda: preparación, barrido de izquierda a derecha y recuperación
      const kn = o.knife !== undefined ? o.knife : -1;
      G.knife.visible = kn >= 0 && kn < 0.92;
      if (kn >= 0) {
        const env = smooth(0, 0.12, kn) * (1 - smooth(0.62, 1, kn));
        let sx, sz, ex, cy;
        if (kn < 0.32) { const u = smooth(0, 1, kn / 0.32); sx = lerp(-1.0, -1.3, u); sz = lerp(0.6, 1.2, u); ex = -1.2; cy = lerp(0.2, 0.5, u); }
        else if (kn < 0.56) { const u = 1 - Math.pow(1 - (kn - 0.32) / 0.24, 3); sx = -1.45; sz = lerp(1.2, -1.0, u); ex = lerp(-1.2, -0.2, u); cy = lerp(0.5, -0.55, u); }
        else { sx = -1.4; sz = -1.0; ex = -0.25; cy = -0.55; }
        arms.L.shoulder.rotation.x = lerp(arms.L.shoulder.rotation.x, sx, env); arms.L.shoulder.rotation.z = lerp(arms.L.shoulder.rotation.z, sz, env);
        arms.L.elbow.rotation.x = lerp(arms.L.elbow.rotation.x, ex, env); chest.rotation.y = lerp(chest.rotation.y, cy, env);
        arms.R.shoulder.rotation.x = lerp(arms.R.shoulder.rotation.x, -0.9, env * 0.6);
        arms.L.hand.rotation.y = 1.5 * env; // filo en el plano del barrido
      } else arms.L.hand.rotation.y = 0;
      // Parpadeo y microsacadas: lo que más «vida» da a un rostro
      st.blink -= dt;
      if (st.blink <= 0) { st.blinkT = 0.16; st.blink = rand(2.2, 5.5); }
      let b = 0; if (st.blinkT > 0) { st.blinkT = Math.max(0, st.blinkT - dt); b = Math.sin((1 - st.blinkT / 0.16) * Math.PI); }
      // Expresión: entorna los ojos al apuntar y los aprieta al recibir un golpe
      G.lidUL.rotation.x = G.lidUR.rotation.x = Math.max(0.8 * b, 0.24 * a, 0.62 * (o.hurt || 0));
      st.gaze -= dt;
      if (st.gaze <= 0) { st.gaze = rand(0.7, 2.6); st.tx = a > 0.5 ? 0 : rand(-0.2, 0.2); st.ty = a > 0.5 ? 0 : rand(-0.08, 0.1); }
      st.gx = damp(st.gx, st.tx, 28, dt); st.gy = damp(st.gy, st.ty, 28, dt);
      G.eyeL.rotation.set(-st.gy, st.gx, 0); G.eyeR.rotation.set(-st.gy, st.gx, 0);
    }
    return {
      root, animate, setWeapon, faceY: 1.678 * L.scale, isGLTF: false,
      parts: { hips, spine, chest, head, legs, arms, gun: G.gun, muzzle, flashMount },
      dispose() { root.removeFromParent(); skeleton.dispose(); Object.values(M).forEach((m) => m.dispose()); }, // la geometría se cachea y se reutiliza
    };
  },

  // Crea el personaje: GLTF/GLB si hay url (con caída al procedural si falla)
  async createAsync(def, opts = {}) {
    if (def.look.model && def.look.model.url) {
      try { return await this.createGLTF(def, opts); }
      catch (err) { console.warn('[BLOOD DEAD] No se pudo cargar el modelo GLTF, se usa el procedural', err); if (opts.onError) opts.onError(err); }
    }
    return this.create(def, opts);
  },

  async createGLTF(def, { csm = null } = {}) {
    const cfg = def.look.model, gltf = await ModelLoader.load(cfg.url), { clone } = await ModelLoader.skeletonUtils();
    const scene = clone(gltf.scene), root = new THREE.Group(), holder = new THREE.Group();
    root.name = 'gltf-' + def.id; root.add(holder); holder.add(scene);
    scene.rotation.y = cfg.rotationY || 0; scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene), h = Math.max(0.01, box.max.y - box.min.y);
    const sc = ((cfg.height || 1.78) * def.look.scale) / h;
    holder.scale.setScalar(sc); holder.position.y = -box.min.y * sc;
    const mats = [];
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      if (o.isSkinnedMesh) o.frustumCulled = false;
      const conv = (m) => { const c = m.clone(); if (/skin|face|head|body/i.test(m.name + o.name) && 'roughness' in c) c.roughness = Math.max(c.roughness, 0.62); if (csm) csm.setupMaterial(c); mats.push(c); return c; };
      o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    });
    // Animaciones (nombres estilo Mixamo o los indicados en cfg.anims)
    const mixer = new THREE.AnimationMixer(scene), actions = {};
    const find = { idle: /idle|breath|stand/i, walk: /walk/i, run: /run|sprint|jog/i, aim: /aim|pistol|shoot|gun/i };
    for (const k in find) {
      const clip = cfg.anims && cfg.anims[k] ? THREE.AnimationClip.findByName(gltf.animations, cfg.anims[k]) : gltf.animations.find((c) => find[k].test(c.name));
      if (clip) actions[k] = mixer.clipAction(clip);
    }
    if (!actions.idle && gltf.animations[0]) actions.idle = mixer.clipAction(gltf.animations[0]);
    let cur = null;
    const play = (k) => { const act = actions[k] || actions.idle; if (!act || act === cur) return; act.reset().fadeIn(0.22).play(); if (cur) cur.fadeOut(0.22); cur = act; };
    play('idle');
    // Pistola en el hueso de la mano derecha (compensando la escala del esqueleto)
    let hand = null; scene.traverse((o) => { if (!hand && /right.?hand$|hand.?r$|hand_r$/i.test(o.name)) hand = o; });
    const gm = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.36, metalness: 0.85 }); if (csm) csm.setupMaterial(gm); mats.push(gm);
    const gun = new THREE.Group(); gun.add(new THREE.Mesh(this.prepareShared().gun, gm));
    const muzzle = new THREE.Object3D(); muzzle.position.set(...this.prepareShared().muzzle); gun.add(muzzle);
    root.updateMatrixWorld(true);
    if (hand) {
      const ws = new THREE.Vector3(); hand.getWorldScale(ws); gun.scale.setScalar(1 / (ws.x || 1));
      if (cfg.gun) { gun.position.set(...(cfg.gun.position || [0, 0, 0])); gun.rotation.set(...(cfg.gun.rotation || [0, 0, 0])); }
      hand.add(gun);
    } else { gun.position.set(-0.25, 0.95, 0.1); root.add(gun); }
    const walkRef = cfg.walkSpeed || 1.5, runRef = cfg.runSpeed || 4.2;
    return {
      root, isGLTF: true, faceY: (box.max.y - box.min.y) * sc - 0.11 * def.look.scale,
      parts: { muzzle, gun },
      setWeapon(k) { const S = CharacterFactory.prepareShared(); muzzle.position.set(...(S.muzzles[k] || S.muzzle)); },
      animate(dt, o = {}) {
        const k = (o.aim || 0) > 0.5 ? 'aim' : o.running ? 'run' : (o.speed || 0) > 0.25 ? 'walk' : 'idle';
        play(k);
        if (cur) cur.timeScale = k === 'walk' ? clamp(o.speed / walkRef, 0.6, 1.6) : k === 'run' ? clamp(o.speed / runRef, 0.7, 1.5) : 1;
        mixer.update(dt);
      },
      dispose() { root.removeFromParent(); mixer.stopAllAction(); mats.forEach((m) => m.dispose()); },
    };
  },
};
