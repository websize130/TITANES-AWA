// Constructor paramétrico de perros estilizados a partir de BreedData.model.
// Jerarquía (permite ponerse a dos patas pivotando sobre la cadera trasera):
//   root ─ rig ─ pelvis ─┬─ torso / manchas / pelaje
//                        ├─ chest ─┬─ head ─ (jaw, ears, eyes…)
//                        │         └─ legs.fl / legs.fr
//                        ├─ legs.bl / legs.br  (contrarrotan para quedarse en el suelo)
//                        └─ tail
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../world/Textures.js';

const geoCache = new Map();
function rbox(w, h, d, r = 0.08, seg = 2) {
  const key = `rb${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${r.toFixed(3)}_${seg}`;
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
  return geoCache.get(key);
}
function sphere(r, ws = 14, hs = 10) {
  const key = `sp${r.toFixed(3)}_${ws}_${hs}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.SphereGeometry(r, ws, hs));
  return geoCache.get(key);
}

export function buildDogModel(breed) {
  const m = breed.model;
  const C = m.colors;
  const mk = m.markings || {};
  const rnd = mulberry32(breed.id.length * 977 + breed.id.charCodeAt(0));

  const mats = {
    base: new THREE.MeshStandardMaterial({ color: C.base, roughness: 0.78 }),
    white: new THREE.MeshStandardMaterial({ color: C.white, roughness: 0.82 }),
    shade: new THREE.MeshStandardMaterial({ color: C.shade, roughness: 0.8 }),
    nose: new THREE.MeshStandardMaterial({ color: C.nose, roughness: 0.3, metalness: 0.1 }),
    eye: new THREE.MeshStandardMaterial({ color: C.eyes, roughness: 0.2, emissive: C.eyes, emissiveIntensity: breed.id === 'blizzard' ? 0.6 : 0.05 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#0b0b0d' }),
    shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    tongue: new THREE.MeshStandardMaterial({ color: C.tongue, roughness: 0.5 }),
    mouth: new THREE.MeshStandardMaterial({ color: '#3a1218', roughness: 0.6 }),
    dirt: new THREE.MeshStandardMaterial({ color: C.dirt || '#6b4a2e', roughness: 1 }),
  };
  // Pelaje rizado (Rufus): color base un poco más cálido en las sombras.
  const furMat = m.fluffy ? new THREE.MeshStandardMaterial({ color: C.base, roughness: 0.95 }) : mats.base;

  const root = new THREE.Group();
  root.name = `Dog-${breed.id}`;
  const rig = new THREE.Group();
  root.add(rig);

  const B = m.body;
  const legLen = m.legLen;
  const hipY = legLen + B.h * 0.35;
  const halfL = B.l / 2;

  // Pelvis en la cadera trasera.
  const pelvis = new THREE.Group();
  pelvis.position.set(0, hipY, -halfL + 0.12);
  rig.add(pelvis);

  const add = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // --- Torso ---
  const torsoZ = halfL - 0.12;
  const torso = add(pelvis, rbox(B.w, B.h, B.l, Math.min(B.w, B.h) * 0.42, 3), mats.base, 0, 0, torsoZ);
  if (m.waist) {
    // Galgo: pecho profundo y cintura estrecha.
    torso.scale.set(0.82, 0.9, 1);
    add(pelvis, sphere(B.w * 0.62), mats.base, 0, -0.02, torsoZ + B.l * 0.28, 1, 1.15, 1.1);
  }
  if (mk.chest) add(pelvis, sphere(B.w * 0.42), mats.white, 0, -B.h * 0.12, torsoZ + B.l * 0.42, 1, 1.15, 0.7);
  if (mk.belly) add(pelvis, rbox(B.w * 0.78, B.h * 0.3, B.l * 0.75, 0.1), mats.white, 0, -B.h * 0.36, torsoZ + 0.02);
  if (m.ruff) add(pelvis, sphere(B.w * 0.58), mk.chest ? mats.white : mats.base, 0, B.h * 0.08, torsoZ + B.l * 0.38, 1.1, 1.1, 0.8);
  if (breed.id === 'goliath') {
    // Manto marrón oscuro sobre el lomo.
    add(pelvis, rbox(B.w * 1.02, B.h * 0.45, B.l * 0.62, 0.15), mats.base, 0, B.h * 0.32, torsoZ - 0.05);
  }

  // --- Pecho (ancla de cabeza y patas delanteras) ---
  const chest = new THREE.Group();
  chest.position.set(0, 0.02, torsoZ + B.l * 0.38);
  pelvis.add(chest);

  // --- Cabeza ---
  const H = m.head;
  const head = new THREE.Group();
  head.position.set(0, B.h * 0.5 + H.h * 0.38, 0.12 + H.d * 0.1);
  chest.add(head);
  const skull = add(head, rbox(H.w, H.h, H.d, Math.min(H.w, H.h) * 0.4, 3), mats.base, 0, 0, 0);
  if (mk.mask) {
    // Husky: cara blanca con "antifaz" oscuro sobre los ojos.
    add(head, rbox(H.w * 0.9, H.h * 0.6, 0.08, 0.04), mats.white, 0, -H.h * 0.12, H.d / 2 - 0.01);
    add(head, rbox(H.w * 0.16, H.h * 0.35, 0.06, 0.03), mats.base, 0, H.h * 0.2, H.d / 2 + 0.005);
  }
  if (mk.blaze) add(head, rbox(H.w * 0.2, H.h * 0.62, 0.06, 0.028), mats.white, 0, H.h * 0.1, H.d / 2 - 0.022);
  if (mk.eyeMask) {
    for (const sx of [-1, 1]) add(head, sphere(H.w * 0.17), mats.shade, sx * H.w * 0.24, H.h * 0.1, H.d / 2 - 0.04, 1, 0.85, 0.5);
  }

  // Hocico + mandíbula articulada.
  const S = m.snout;
  const snoutMat = mk.muzzle ? mats.white : mats.base;
  const snoutZ = H.d / 2 + S.l / 2 - 0.04;
  const snout = add(head, rbox(S.w, S.h, S.l, Math.min(S.w, S.h) * 0.42), snoutMat, 0, -H.h * 0.16, snoutZ);
  add(head, sphere(Math.max(0.045, S.w * 0.22)), mats.nose, 0, -H.h * 0.16 + S.h * 0.32, snoutZ + S.l / 2, 1.2, 0.85, 0.8);
  if (m.jowls) {
    for (const sx of [-1, 1]) add(head, sphere(S.w * 0.32), snoutMat, sx * S.w * 0.32, -H.h * 0.27, snoutZ + S.l * 0.1, 1, 1.05, 1.1);
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -H.h * 0.16 - S.h * 0.42, H.d / 2 - 0.06);
  head.add(jaw);
  add(jaw, rbox(S.w * 0.86, S.h * 0.38, S.l * 0.9, 0.04), snoutMat, 0, -0.01, S.l * 0.42);
  add(jaw, rbox(S.w * 0.62, 0.025, S.l * 0.7), mats.mouth, 0, 0.04, S.l * 0.4);
  const tongue = add(jaw, rbox(S.w * 0.42, 0.04, S.l * 0.7, 0.02), mats.tongue, 0, 0.05, S.l * 0.55);
  if (m.jowls && breed.id === 'tyson') {
    // Colmillos inferiores del bulldog.
    for (const sx of [-1, 1]) add(jaw, new THREE.ConeGeometry(0.025, 0.07, 6), mats.shine, sx * S.w * 0.3, 0.07, S.l * 0.8);
  }

  // Ojos (iris de color + pupila + brillo).
  for (const sx of [-1, 1]) {
    const ex = sx * H.w * 0.24;
    const ey = H.h * 0.1;
    const ez = H.d / 2 - 0.015;
    add(head, sphere(H.w * 0.1), mats.white, ex, ey, ez - 0.01, 1, 1, 0.6);
    add(head, sphere(H.w * 0.08), mats.eye, ex, ey, ez + 0.012, 1, 1, 0.55);
    add(head, sphere(H.w * 0.045), mats.pupil, ex, ey, ez + 0.03, 1, 1, 0.5);
    add(head, sphere(H.w * 0.022), mats.shine, ex + 0.02, ey + 0.022, ez + 0.045);
    if (breed.id === 'tyson') {
      // Ceño fruncido.
      const brow = add(head, rbox(H.w * 0.26, 0.05, 0.06, 0.02), mats.shade, ex, ey + H.h * 0.13, ez + 0.01);
      brow.rotation.z = -sx * 0.35;
    }
  }

  // Orejas.
  const ears = [];
  const earPivotY = H.h * 0.42;
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * H.w * 0.36, earPivotY, -H.d * 0.05);
    head.add(ear);
    ear.userData.side = sx;
    let restZ = 0;
    let restX = 0;
    switch (m.ears) {
      case 'upright': case 'bigUpright': case 'semi': {
        const big = m.ears === 'bigUpright';
        const h = big ? H.h * 0.85 : H.h * 0.62;
        const g = new THREE.ConeGeometry(big ? H.w * 0.24 : H.w * 0.18, h, 4, 1);
        g.rotateY(Math.PI / 4);
        g.scale(1, 1, 0.45);
        g.translate(0, h / 2, 0);
        add(ear, g, mats.base, 0, 0, 0);
        const inner = g.clone();
        inner.scale(0.6, 0.75, 0.5);
        add(ear, inner, mk.mask || big ? mats.white : mats.shade, 0, 0.01, 0.03);
        restZ = -sx * (big ? 0.32 : 0.18);
        if (m.ears === 'semi') {
          // Border collie: punta doblada hacia delante.
          const tip = add(ear, sphere(H.w * 0.07), mats.base, 0, h * 0.82, 0.05, 1, 0.6, 0.6);
          tip.userData.tip = true;
          restX = 0.25;
        }
        break;
      }
      case 'rose': case 'fold': {
        const g = rbox(H.w * 0.24, 0.05, H.d * 0.32, 0.02);
        add(ear, g, mats.shade, sx * 0.04, 0.02, -0.04);
        restZ = sx * (m.ears === 'rose' ? -0.6 : 0.45);
        restX = m.ears === 'rose' ? -0.5 : 0.2;
        break;
      }
      case 'fluffy': {
        // Bichón: orejas de algodón.
        for (let i = 0; i < 4; i++) add(ear, sphere(H.w * 0.15, 10, 8), furMat, sx * 0.04, -0.06 - i * 0.07, (rnd() - 0.5) * 0.04);
        restZ = sx * 0.15;
        break;
      }
      default: { // floppy (San Bernardo)
        const g = rbox(H.w * 0.24, H.h * 0.62, 0.08, 0.05);
        const mesh = add(ear, g, mats.shade, sx * 0.04, -H.h * 0.28, 0);
        mesh.rotation.z = sx * 0.15;
        restZ = sx * 0.2;
      }
    }
    ear.rotation.z = restZ;
    ear.rotation.x = restX;
    ear.userData.restZ = restZ;
    ear.userData.restX = restX;
    ears.push(ear);
  }

  // Pompón de pelo rizado (Rufus) sobre la cabeza y el hocico.
  if (m.fluffy) {
    const puffs = [];
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const e = rnd() * Math.PI * 0.55;
      const r = H.w * 0.5;
      const g = new THREE.IcosahedronGeometry(H.w * (0.13 + rnd() * 0.06), 1);
      g.translate(Math.cos(a) * Math.sin(e) * r, Math.cos(e) * r * 0.85 + 0.02, Math.sin(a) * Math.sin(e) * r * 0.8 - 0.04);
      puffs.push(g);
    }
    for (let i = 0; i < 8; i++) {
      const g = new THREE.IcosahedronGeometry(S.w * 0.24, 1);
      g.translate((rnd() - 0.5) * S.w, -H.h * 0.2 + (rnd() - 0.5) * S.h * 0.5, snoutZ - S.l * 0.1 + rnd() * S.l * 0.3);
      puffs.push(g);
    }
    add(head, mergeGeometries(puffs), furMat, 0, 0, 0);
    // Rizos por el cuerpo.
    const body = [];
    for (let i = 0; i < 46; i++) {
      const g = new THREE.IcosahedronGeometry(0.1 + rnd() * 0.06, 1);
      const a = rnd() * Math.PI * 2;
      g.translate(Math.cos(a) * B.w * 0.48, Math.sin(a) * B.h * 0.48, torsoZ + (rnd() - 0.5) * B.l * 0.95);
      body.push(g);
    }
    add(pelvis, mergeGeometries(body), furMat, 0, 0, 0);
  }

  // Collar.
  if (m.collar || mk.collarRing) {
    const collarColor = m.collar ? m.collar.color : C.white;
    const collarMat = new THREE.MeshStandardMaterial({ color: collarColor, roughness: 0.5 });
    mats.collar = collarMat;
    const ring = add(chest, new THREE.TorusGeometry(H.w * 0.42, mk.collarRing ? 0.09 : 0.045, 8, 20), collarMat, 0, B.h * 0.45, 0.1);
    ring.rotation.x = Math.PI / 2 - 0.45;
    if (m.collar?.spikes) {
      const spikeMat = new THREE.MeshStandardMaterial({ color: m.collar.spikes, metalness: 0.9, roughness: 0.25 });
      mats.spikes = spikeMat;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 6), spikeMat);
        sp.position.set(Math.cos(a) * H.w * 0.46, 0, Math.sin(a) * H.w * 0.46);
        sp.rotation.z = -Math.PI / 2;
        sp.rotation.y = -a;
        ring.add(sp);
      }
    }
    if (m.collar?.tag) {
      const tag = add(chest, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), new THREE.MeshStandardMaterial({ color: m.collar.tag, metalness: 0.9, roughness: 0.25 }), 0, B.h * 0.18, 0.3);
      tag.rotation.x = Math.PI / 2;
    }
  }

  // --- Patas ---
  const legs = {};
  const legGeo = rbox(m.legW, legLen + 0.06, m.legW * 1.05, m.legW * 0.4);
  const pawGeo = sphere(m.legW * 0.62, 10, 8);
  const makeLeg = (parent, x, y, z) => {
    const leg = new THREE.Group();
    leg.position.set(x, y, z);
    parent.add(leg);
    const mesh = add(leg, legGeo, m.fluffy ? furMat : mats.base, 0, -legLen / 2 + 0.02, 0);
    if (m.fluffy) add(leg, sphere(m.legW * 0.75, 10, 8), furMat, 0, -legLen * 0.45, 0, 1, 1.4, 1);
    const pawMat = mk.dirtyPaws ? mats.dirt : mk.paws ? mats.white : m.fluffy ? furMat : mats.base;
    add(leg, pawGeo, pawMat, 0, -legLen + 0.03, 0.03, 1, 0.7, 1.25);
    if (mk.paws && !mk.dirtyPaws) mesh.material = mats.base;
    return leg;
  };
  const legX = B.w * 0.32;
  const frontY = -(hipY - legLen) + 0.02; // relativo al pecho
  legs.fl = makeLeg(chest, -legX, frontY + 0.02, -0.05);
  legs.fr = makeLeg(chest, legX, frontY + 0.02, -0.05);
  legs.bl = makeLeg(pelvis, -legX, -(hipY - legLen), 0.02);
  legs.br = makeLeg(pelvis, legX, -(hipY - legLen), 0.02);

  // --- Cola ---
  const tail = new THREE.Group();
  tail.position.set(0, B.h * 0.28, -0.14);
  pelvis.add(tail);
  buildTail(tail, m, mats, furMat, rnd);

  // Sombra de contacto barata (siempre visible, incluso sin shadow maps).
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(B.w, B.l) * 0.62, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }),
  );
  blob.position.y = 0.03;
  blob.renderOrder = 1;
  root.add(blob);

  root.scale.setScalar(breed.stats.scale);

  return {
    root, rig, pelvis, chest, head, jaw, tongue, ears, legs, tail, blob, skull, snout,
    hipY, legLen, mats, furMat,
    // Punto de la boca (para efectos de aliento/ladrido).
    mouthOffset: new THREE.Vector3(0, -H.h * 0.18, H.d / 2 + S.l),
    height: (hipY + B.h * 0.5 + H.h) * breed.stats.scale,
  };
}

function buildTail(tail, m, mats, furMat, rnd) {
  const C = m.colors;
  switch (m.tail) {
    case 'plume': { // Bichón: penacho rizado sobre el lomo
      const parts = [];
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const g = new THREE.IcosahedronGeometry(0.09 + t * 0.05, 1);
        g.translate(0, 0.08 + Math.sin(t * 2.4) * 0.28, -0.05 + Math.cos(t * 2.4) * 0.1 + t * 0.18);
        parts.push(g);
      }
      tail.add(new THREE.Mesh(mergeGeometries(parts), furMat));
      tail.userData.restX = 0;
      break;
    }
    case 'thin': case 'long': case 'feather': {
      const len = m.tail === 'thin' ? 0.62 : m.tail === 'long' ? 0.7 : 0.6;
      const segs = 5;
      let parent = tail;
      for (let i = 0; i < segs; i++) {
        const seg = new THREE.Group();
        seg.position.set(0, i === 0 ? 0 : len / segs, 0);
        const w = m.tail === 'thin' ? 0.035 - i * 0.004 : m.tail === 'feather' ? 0.06 + i * 0.01 : 0.075 - i * 0.006;
        const g = new THREE.CylinderGeometry(w * 0.8, w, len / segs + 0.02, 8);
        g.translate(0, len / segs / 2, 0);
        const isTip = i === segs - 1 && (m.tail === 'feather' || m.tail === 'long');
        const mesh = new THREE.Mesh(g, isTip ? mats.white : mats.base);
        mesh.castShadow = true;
        seg.add(mesh);
        if (m.tail === 'feather') {
          const plume = new THREE.Mesh(new THREE.SphereGeometry(w * 1.6, 8, 6), isTip ? mats.white : mats.base);
          plume.scale.set(0.7, 1.4, 1);
          plume.position.set(0, len / segs / 2, -w * 0.5);
          seg.add(plume);
        }
        seg.rotation.x = i === 0 ? -2.3 : 0.18;
        parent.add(seg);
        parent = seg;
      }
      tail.userData.restX = 0;
      break;
    }
    case 'curlBushy': { // Husky: cola poblada enroscada sobre el lomo
      const parts = [];
      for (let i = 0; i < 8; i++) {
        const t = i / 7;
        const g = new THREE.SphereGeometry(0.1 + Math.sin(t * Math.PI) * 0.05, 10, 8);
        g.translate(0, 0.05 + Math.sin(t * 2.6) * 0.32, -0.04 + Math.cos(t * 2.6) * 0.14 + t * 0.12);
        parts.push(g);
      }
      tail.add(new THREE.Mesh(mergeGeometries(parts), mats.base));
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mats.white);
      tip.position.set(0, 0.2, 0.16);
      tail.add(tip);
      break;
    }
    case 'fluffStub': { // Corgi: culete esponjoso
      const fluff = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mats.white);
      fluff.scale.set(1.2, 0.9, 0.7);
      fluff.position.set(0, -0.05, -0.02);
      tail.add(fluff);
      const stub = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mats.base);
      stub.position.set(0, 0.06, -0.06);
      tail.add(stub);
      break;
    }
    default: { // stub (Bulldog)
      const stub = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mats.base);
      stub.scale.set(1, 1.2, 1);
      stub.position.set(0, 0.02, -0.04);
      tail.add(stub);
    }
  }
  tail.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  void C; void rnd;
}

export function disposeDogModel(model) {
  for (const k of Object.keys(model.mats)) model.mats[k].dispose();
  if (model.furMat !== model.mats.base) model.furMat.dispose();
  model.blob.material.dispose();
  model.blob.geometry.dispose();
}
