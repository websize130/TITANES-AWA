// Perros con formas orgánicas y pelaje real (shell fur).
//  · El cuerpo se modela con elipsoides que se funden (pecho, lomo, cadera) en vez
//    de cajas, así la silueta es suave como en la ilustración de referencia.
//  · Las manchas de cada raza se pintan como colores de vértice: el pelo las hereda.
//  · Atributo `furAmt` por vértice: sin pelo sobre ojos/nariz, pelo largo en orejas.
// Jerarquía (para poder ponerse a dos patas pivotando en la cadera):
//   root ─ rig ─ pelvis ─┬─ cuerpo / cola / patas traseras
//                        └─ chest ─┬─ cuello / cabeza (jaw, ears, ojos…)
//                                  └─ patas delanteras
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addFur } from '../world/Fur.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Elipsoide liso (normales correctas tras escalar). */
function ellipsoid(rx, ry, rz, ws = 30, hs = 22) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.scale(rx, ry, rz);
  return g.toNonIndexed();
}

/** Pinta colores de vértice y cantidad de pelo con una función (x, y, z) -> [color, fur]. */
function paint(geo, fn) {
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const fur = new Float32Array(pos.count);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const r = fn(pos.getX(i), pos.getY(i), pos.getZ(i), c);
    c.toArray(col, i * 3);
    fur[i] = r ?? 1;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('furAmt', new THREE.BufferAttribute(fur, 1));
  return geo;
}

/** Tubo cónico a lo largo de una curva (colas). */
function taperedTube(points, r0, r1, radial = 12, tubular = 24) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = geo.attributes.position;
  const center = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, center);
    const r = r0 + (r1 - r0) * Math.pow(t, 0.8);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.fromBufferAttribute(pos, k).sub(center).multiplyScalar(r).add(center);
      pos.setXYZ(k, p.x, p.y, p.z);
    }
  }
  geo.computeVertexNormals();
  // Cerrar la punta con una esfera pequeña.
  const tip = new THREE.SphereGeometry(Math.max(r1, 0.01), 10, 8);
  tip.translate(...points[points.length - 1].toArray());
  return mergeGeometries([geo.toNonIndexed(), tip.toNonIndexed()]);
}

/** Oreja: elipsoide aplanado, puntiagudo opcional, con pivote en la base. */
function earGeometry(w, h, t, pointy, hanging) {
  const g = new THREE.SphereGeometry(1, 18, 14);
  g.scale(w / 2, h / 2, t / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const yn = pos.getY(i) / (h / 2); // -1..1
    if (pointy) {
      const k = 1 - smooth(-0.3, 1, yn) * 0.85;
      pos.setX(i, pos.getX(i) * k);
    } else {
      // Más ancha abajo (oreja caída redondeada).
      const k = 0.75 + 0.35 * smooth(1, -0.6, yn);
      pos.setX(i, pos.getX(i) * k);
    }
  }
  g.computeVertexNormals();
  g.translate(0, hanging ? -h / 2 : h / 2, 0);
  return g.toNonIndexed();
}

/** Pata completa (muslo/brazo, caña, pata con dedos) en una sola geometría. */
function legGeometry(len, w, rear) {
  const parts = [];
  const upper = new THREE.CapsuleGeometry(w * (rear ? 0.62 : 0.52), len * 0.42, 6, 14);
  upper.translate(0, -len * 0.25, rear ? -0.02 : 0);
  parts.push(upper);
  const lower = new THREE.CapsuleGeometry(w * 0.4, len * 0.42, 6, 12);
  lower.translate(0, -len * 0.66, rear ? -0.03 : 0.01);
  parts.push(lower);
  const paw = new THREE.SphereGeometry(1, 16, 12);
  paw.scale(w * 0.62, w * 0.36, w * 0.8);
  paw.translate(0, -len + w * 0.3, w * 0.22);
  parts.push(paw);
  // Deditos.
  for (let i = -1; i <= 1; i++) {
    const toe = new THREE.SphereGeometry(w * 0.2, 8, 6);
    toe.translate(i * w * 0.26, -len + w * 0.24, w * 0.78);
    parts.push(toe);
  }
  return mergeGeometries(parts.map((g) => g.toNonIndexed()));
}

export function buildDogModel(breed) {
  const m = breed.model;
  const C = m.colors;
  const mk = m.markings || {};
  const fur = m.fur || null;
  const base = new THREE.Color(C.base);
  const white = new THREE.Color(C.white);
  const shade = new THREE.Color(C.shade);
  const dirt = new THREE.Color(C.dirt || '#6b4a2e');

  const skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  const mats = {
    skin,
    nose: new THREE.MeshPhysicalMaterial({ color: C.nose, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 }),
    eye: new THREE.MeshPhysicalMaterial({ color: C.eyes, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, emissive: C.eyes, emissiveIntensity: breed.id === 'blizzard' ? 0.5 : 0.08 }),
    pupil: new THREE.MeshPhysicalMaterial({ color: '#08060a', roughness: 0.05, clearcoat: 1 }),
    shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    tongue: new THREE.MeshStandardMaterial({ color: C.tongue, roughness: 0.45 }),
    mouth: new THREE.MeshStandardMaterial({ color: '#3a1218', roughness: 0.7 }),
    pads: new THREE.MeshStandardMaterial({ color: '#2a1a1a', roughness: 0.8 }),
  };

  const root = new THREE.Group();
  root.name = `Dog-${breed.id}`;
  const rig = new THREE.Group();
  root.add(rig);

  const B = m.body;
  const H = m.head;
  const S = m.snout;
  const legLen = m.legLen;
  const hipY = legLen + B.h * 0.35;
  const halfL = B.l / 2;
  const torsoZ = halfL - 0.12;

  const pelvis = new THREE.Group();
  pelvis.position.set(0, hipY, -halfL + 0.12);
  rig.add(pelvis);

  const furred = [];
  const part = (parent, geo, x = 0, y = 0, z = 0, furScale = 1) => {
    const mesh = new THREE.Mesh(geo, skin);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (fur && furScale > 0) furred.push([mesh, furScale]);
    return mesh;
  };

  // ------------------------------------------------------------ cuerpo
  {
    const waist = m.waist ? 0.86 : 1;
    const torso = ellipsoid(B.w * 0.5 * waist, B.h * 0.48 * (m.waist ? 0.86 : 1), halfL * 1.0);
    const chestE = ellipsoid(B.w * 0.54, B.h * (m.waist ? 0.62 : 0.55), B.l * 0.3);
    chestE.translate(0, m.waist ? -0.04 : -0.02, B.l * 0.24);
    const haunch = ellipsoid(B.w * 0.5, B.h * 0.5, B.l * 0.3);
    haunch.translate(0, 0.02, -B.l * 0.24);
    const parts = [torso, chestE, haunch];
    if (m.ruff) {
      const ruff = ellipsoid(B.w * 0.62, B.h * 0.6, B.l * 0.22);
      ruff.translate(0, B.h * 0.1, B.l * 0.38);
      parts.push(ruff);
    }
    const body = mergeGeometries(parts);
    paint(body, (x, y, z, c) => {
      const xn = x / (B.w * 0.5);
      const yn = y / (B.h * 0.5);
      const zn = z / halfL;
      c.copy(base);
      if (breed.id === 'goliath') {
        // San Bernardo: manto oscuro en el lomo, blanco abajo y delante.
        c.lerp(shade, smooth(0.25, 0.75, yn) * 0.35);
      }
      if (breed.id === 'rufus') c.lerp(shade, smooth(0.2, 1, yn) * 0.35); // tono crema en el lomo
      if (mk.belly) c.lerp(white, smooth(-0.15, -0.5, yn));
      if (mk.chest) c.lerp(white, smooth(0.25, 0.7, zn) * smooth(0.35, -0.2, yn));
      if (mk.collarRing && zn > 0.55) c.lerp(white, smooth(0.55, 0.8, zn));
      void xn;
      return 1;
    });
    part(pelvis, body, 0, 0, torsoZ, 1);
  }

  // ------------------------------------------------------------ pecho, cuello, cabeza
  const chest = new THREE.Group();
  chest.position.set(0, 0.02, torsoZ + B.l * 0.38);
  pelvis.add(chest);

  const head = new THREE.Group();
  head.position.set(0, B.h * 0.5 + H.h * 0.38, 0.12 + H.d * 0.1);
  chest.add(head);

  {
    // Cuello: cápsula del pecho a la cabeza.
    const from = new THREE.Vector3(0, B.h * 0.1, -0.05);
    const to = head.position.clone().add(new THREE.Vector3(0, -H.h * 0.25, -H.d * 0.15));
    const len = from.distanceTo(to);
    const neck = new THREE.CapsuleGeometry(H.w * (m.ruff ? 0.42 : 0.32), len, 6, 16);
    neck.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()));
    neck.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    const neckG = neck.toNonIndexed();
    paint(neckG, (x, y, z, c) => {
      c.copy(base);
      if (mk.collarRing) c.copy(white);
      if (mk.chest) c.lerp(white, smooth(0.0, 0.12, z) * smooth(0.25, 0.0, y));
      if (breed.id === 'rufus') c.lerp(shade, 0.15);
      return 1;
    });
    part(chest, neckG, 0, 0, 0, 1);
  }

  // Ojos (posición sobre la superficie del cráneo).
  const rx = H.w / 2;
  const ry = H.h / 2;
  const rz = H.d / 2;
  const eyeR = H.w * (breed.id === 'rufus' ? 0.1 : 0.088);
  const eyeX = H.w * 0.2;
  const eyeY = H.h * 0.07;
  const surfZ = (x, y) => rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (y / ry) ** 2));
  const eyeZ = surfZ(eyeX, eyeY) - eyeR * 0.5;

  {
    const cranium = ellipsoid(rx, ry, rz);
    const parts = [cranium];
    // Mejillas y frente suaves.
    for (const sx of [-1, 1]) {
      const cheek = ellipsoid(rx * 0.5, ry * 0.45, rz * 0.5);
      cheek.translate(sx * rx * 0.48, -ry * 0.35, rz * 0.3);
      parts.push(cheek);
    }
    if (m.jowls) {
      for (const sx of [-1, 1]) {
        const jowl = ellipsoid(S.w * 0.32, S.h * 0.55, S.l * 0.5);
        jowl.translate(sx * S.w * 0.32, -ry * 0.42, rz + S.l * 0.15);
        parts.push(jowl);
      }
    }
    const headG = mergeGeometries(parts);
    paint(headG, (x, y, z, c) => {
      const xn = x / rx;
      const yn = y / ry;
      const zn = z / rz;
      c.copy(base);
      if (breed.id === 'rufus') c.lerp(shade, smooth(0.3, 1, yn) * 0.2);
      if (mk.mask) {
        // Husky: cara blanca bajo los ojos y "cejas" blancas; capucha oscura.
        const face = smooth(0.1, -0.1, yn) * smooth(-0.1, 0.4, zn);
        const brows = smooth(0.32, 0.12, Math.hypot(Math.abs(xn) - 0.38, yn - 0.38)) * smooth(0.2, 0.5, zn);
        c.lerp(white, Math.max(face, brows));
      }
      if (mk.blaze) c.lerp(white, smooth(0.22, 0.08, Math.abs(xn)) * smooth(0.2, 0.6, zn));
      if (mk.muzzle) c.lerp(white, smooth(-0.05, -0.35, yn) * smooth(0.2, 0.7, zn));
      if (mk.eyeMask) c.lerp(shade, smooth(0.42, 0.2, Math.hypot(Math.abs(xn) - 0.45, yn - 0.12)) * smooth(0.2, 0.6, zn));
      // Sin pelo sobre los ojos; menos pelo en la cara.
      let amt = 1;
      const dEye = Math.hypot(Math.abs(x) - eyeX, y - eyeY);
      if (z > 0) amt = smooth(eyeR * 0.9, eyeR * 2.2, dEye);
      if (zn > 0.55) amt *= 0.4; // cara despejada: se ven los ojos y el hocico
      return amt;
    });
    part(head, headG, 0, 0, 0, 1);
  }

  // Hocico + nariz + mandíbula.
  const snoutZ = rz * 0.72 + S.l * 0.3;
  const snoutY = -ry * 0.28;
  {
    // Hocico fundido con la cabeza: elipsoide principal + "puente" hacia la frente.
    const front = ellipsoid(S.w * 0.55, S.h * 0.62, S.l * 0.66);
    const bridge = ellipsoid(S.w * 0.5, S.h * 0.58, S.l * 0.5);
    bridge.translate(0, S.h * 0.18, -S.l * 0.35);
    const sn = mergeGeometries([front, bridge]);
    paint(sn, (x, y, z, c) => {
      c.copy(mk.muzzle || mk.mask ? white : base);
      if (breed.id === 'rufus') c.copy(white);
      return smooth(S.l * 0.55, S.l * 0.1, z) * 0.9 + 0.1; // menos pelo en la punta
    });
    part(head, sn, 0, snoutY, snoutZ, 0.5);
  }
  const nose = new THREE.Mesh(ellipsoid(S.w * 0.21, S.h * 0.17, S.w * 0.15), mats.nose);
  nose.position.set(0, snoutY + S.h * 0.32, snoutZ + S.l * 0.62);
  head.add(nose);
  for (const sx of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(S.w * 0.05, 8, 6), mats.pupil);
    nostril.position.set(sx * S.w * 0.07, snoutY + S.h * 0.29, snoutZ + S.l * 0.62 + S.w * 0.125);
    head.add(nostril);
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, snoutY - S.h * 0.42, rz * 0.6);
  head.add(jaw);
  {
    const lower = ellipsoid(S.w * 0.42, S.h * 0.25, S.l * 0.55);
    paint(lower, (x, y, z, c) => { c.copy(mk.muzzle || mk.mask || breed.id === 'rufus' ? white : base); return 0.4; });
    const lm = new THREE.Mesh(lower, skin);
    lm.position.set(0, 0, S.l * 0.5);
    jaw.add(lm);
    const inside = new THREE.Mesh(ellipsoid(S.w * 0.3, S.h * 0.06, S.l * 0.4), mats.mouth);
    inside.position.set(0, S.h * 0.12, S.l * 0.5);
    jaw.add(inside);
  }
  const tongue = new THREE.Mesh(ellipsoid(S.w * 0.2, S.h * 0.06, S.l * 0.45), mats.tongue);
  tongue.position.set(0, S.h * 0.16, S.l * 0.62);
  jaw.add(tongue);

  // Ojos grandes y brillantes con doble reflejo.
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * eyeX, eyeY, eyeZ);
    eye.lookAt(sx * eyeX * 1.25, eyeY, eyeZ + 1);
    head.add(eye);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 24, 18), mats.eye);
    iris.scale.set(1, 1.08, 0.62);
    eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.68, 20, 14), mats.pupil);
    pupil.position.z = eyeR * 0.3;
    pupil.scale.set(1, 1.05, 0.5);
    eye.add(pupil);
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.24, 10, 8), mats.shine);
    s1.position.set(eyeR * 0.3, eyeR * 0.35, eyeR * 0.72);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.11, 8, 6), mats.shine);
    s2.position.set(-eyeR * 0.28, -eyeR * 0.3, eyeR * 0.74);
    eye.add(s1, s2);
    if (breed.id === 'tyson') {
      // Ceño fruncido del bulldog.
      const brow = new THREE.Mesh(ellipsoid(eyeR * 1.3, eyeR * 0.35, eyeR * 0.6), skin);
      paint(brow.geometry, (x, y, z, c) => { c.copy(shade); return 0; });
      brow.position.set(sx * eyeX, eyeY + eyeR * 1.0, eyeZ + eyeR * 0.1);
      brow.rotation.z = -sx * 0.4;
      head.add(brow);
    }
  }

  // ------------------------------------------------------------ orejas
  const ears = [];
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.userData.side = sx;
    head.add(ear);
    let geo;
    let restZ = 0;
    let restX = 0;
    let furScale = 1;
    switch (m.ears) {
      case 'upright': case 'bigUpright': case 'semi': {
        const big = m.ears === 'bigUpright';
        geo = earGeometry(H.w * (big ? 0.44 : 0.34), H.h * (big ? 0.95 : 0.7), H.w * 0.1, true, false);
        ear.position.set(sx * rx * 0.58, ry * 0.62, -rz * 0.1);
        restZ = -sx * (big ? 0.3 : 0.18);
        if (m.ears === 'semi') restX = 0.35;
        furScale = 0.6;
        paint(geo, (x, y, z, c) => {
          c.copy(base);
          // Interior claro.
          if (z > 0) c.lerp(mk.mask || big ? white : new THREE.Color('#f2c4b8'), smooth(0.2, 0.6, 1 - y / (H.h * 0.9)) * 0.85);
          if (m.ears === 'semi') c.lerp(white, smooth(0.6, 0.9, y / (H.h * 0.7)) * 0.3);
          return z > 0 ? 0.3 : 1;
        });
        break;
      }
      case 'rose': case 'fold': {
        geo = earGeometry(H.w * 0.3, H.h * 0.36, H.w * 0.07, false, true);
        ear.position.set(sx * rx * 0.62, ry * 0.55, -rz * 0.15);
        restZ = sx * (m.ears === 'rose' ? -1.2 : 0.9);
        restX = m.ears === 'rose' ? -0.6 : 0.25;
        furScale = 0.6;
        paint(geo, (x, y, z, c) => { c.copy(shade).lerp(base, 0.4); return 1; });
        break;
      }
      case 'fluffy': {
        // Bichón: orejas largas caídas cubiertas de pelo (como la referencia).
        geo = earGeometry(H.w * 0.36, H.h * 0.82, H.w * 0.16, false, true);
        ear.position.set(sx * rx * 0.86, ry * 0.42, -rz * 0.05);
        restZ = sx * 0.18;
        furScale = 1.55;
        paint(geo, (x, y, z, c) => { c.copy(white).lerp(shade, 0.35 + 0.2 * smooth(0, -H.h * 0.8, y)); return 1; });
        break;
      }
      default: { // floppy (San Bernardo)
        geo = earGeometry(H.w * 0.38, H.h * 0.68, H.w * 0.1, false, true);
        ear.position.set(sx * rx * 0.82, ry * 0.45, -rz * 0.1);
        restZ = sx * 0.22;
        furScale = 0.9;
        paint(geo, (x, y, z, c) => { c.copy(shade).lerp(base, 0.25); return 1; });
      }
    }
    const earMesh = part(ear, geo, 0, 0, 0, furScale);
    earMesh.scale.z = 1;
    ear.rotation.set(restX, 0, restZ);
    ear.userData.restZ = restZ;
    ear.userData.restX = restX;
    ears.push(ear);
  }

  // ------------------------------------------------------------ collar
  if (m.collar) {
    const collarMat = new THREE.MeshStandardMaterial({ color: m.collar.color, roughness: 0.45 });
    mats.collar = collarMat;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(H.w * (m.ruff ? 0.5 : 0.42), 0.045, 10, 28), collarMat);
    ring.position.set(0, B.h * 0.45, 0.1);
    ring.rotation.x = Math.PI / 2 - 0.45;
    chest.add(ring);
    if (m.collar.spikes) {
      const spikeMat = new THREE.MeshStandardMaterial({ color: m.collar.spikes, metalness: 0.9, roughness: 0.2 });
      mats.spikes = spikeMat;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), spikeMat);
        const r = H.w * 0.46;
        sp.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        sp.rotation.z = -Math.PI / 2;
        sp.rotation.y = -a;
        ring.add(sp);
      }
    }
    if (m.collar.tag) {
      const tagMat = new THREE.MeshStandardMaterial({ color: m.collar.tag, metalness: 0.9, roughness: 0.2 });
      mats.tag = tagMat;
      const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), tagMat);
      tag.position.set(0, B.h * 0.17, 0.32);
      tag.rotation.x = Math.PI / 2;
      chest.add(tag);
    }
  }

  // ------------------------------------------------------------ patas
  const legs = {};
  const legX = B.w * 0.3;
  const makeLeg = (parent, x, y, z, rear) => {
    const leg = new THREE.Group();
    leg.position.set(x, y, z);
    parent.add(leg);
    const geo = legGeometry(legLen + 0.06, m.legW, rear);
    paint(geo, (px, py, pz, c) => {
      const t = -py / (legLen + 0.06); // 0 arriba, 1 en el suelo
      c.copy(base);
      if (breed.id === 'rufus') c.lerp(shade, 0.15);
      if (mk.paws) c.lerp(white, smooth(0.45, 0.7, t));
      if (mk.dirtyPaws) c.lerp(dirt, smooth(0.82, 0.95, t));
      if (mk.belly && !rear) c.lerp(white, smooth(0.2, 0.0, t) * 0.5);
      return t > 0.85 ? 0.45 : 1;
    });
    part(leg, geo, 0, 0.02, 0, 0.85);
    // Almohadillas bajo la pata.
    const pad = new THREE.Mesh(new THREE.CircleGeometry(m.legW * 0.42, 14).rotateX(Math.PI / 2), mats.pads);
    pad.position.set(0, -legLen + 0.035, m.legW * 0.22);
    leg.add(pad);
    return leg;
  };
  const frontY = -(hipY - legLen) + 0.02;
  legs.fl = makeLeg(chest, -legX, frontY + 0.02, -0.05, false);
  legs.fr = makeLeg(chest, legX, frontY + 0.02, -0.05, false);
  legs.bl = makeLeg(pelvis, -legX, -(hipY - legLen), 0.04, true);
  legs.br = makeLeg(pelvis, legX, -(hipY - legLen), 0.04, true);

  // ------------------------------------------------------------ cola
  const tail = new THREE.Group();
  tail.position.set(0, B.h * 0.28, -0.12);
  pelvis.add(tail);
  {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    let geo;
    let furScale = 1;
    switch (m.tail) {
      case 'plume': // bichón: penacho que se curva hacia el lomo
        geo = taperedTube([V(0, 0, 0), V(0, 0.2, -0.08), V(0, 0.38, 0.0), V(0, 0.42, 0.16)], 0.07, 0.045);
        furScale = 2.1;
        break;
      case 'curlBushy': // husky: enroscada y poblada
        geo = taperedTube([V(0, 0, 0), V(0, 0.22, -0.12), V(0, 0.36, 0.02), V(0.04, 0.3, 0.18)], 0.09, 0.06);
        furScale = 1.8;
        break;
      case 'feather': // border collie: larga y con flecos
        geo = taperedTube([V(0, 0, 0), V(0, -0.2, -0.18), V(0, -0.42, -0.26), V(0, -0.55, -0.2)], 0.06, 0.04);
        furScale = 1.6;
        break;
      case 'long': // san bernardo
        geo = taperedTube([V(0, 0, 0), V(0, -0.22, -0.16), V(0, -0.48, -0.22), V(0, -0.62, -0.14)], 0.075, 0.045);
        furScale = 1.2;
        break;
      case 'thin': // galgo: fina y caída
        geo = taperedTube([V(0, 0, 0), V(0, -0.2, -0.16), V(0, -0.45, -0.18), V(0, -0.6, -0.08)], 0.035, 0.015);
        furScale = 0.6;
        break;
      case 'fluffStub': { // corgi: culete esponjoso
        geo = ellipsoid(0.17, 0.14, 0.12);
        geo.translate(0, -0.04, -0.03);
        furScale = 1.8;
        break;
      }
      default: // bulldog: cola corta
        geo = ellipsoid(0.07, 0.09, 0.07);
        furScale = 0.6;
    }
    paint(geo, (x, y, z, c) => {
      c.copy(base);
      if (breed.id === 'rufus') c.lerp(shade, 0.2);
      if (m.tail === 'curlBushy' || m.tail === 'feather' || m.tail === 'long') c.lerp(white, smooth(0.3, 0.55, Math.hypot(y, z)));
      if (m.tail === 'fluffStub') c.copy(white);
      return 1;
    });
    part(tail, geo, 0, 0, 0, furScale);
    tail.userData.restX = 0;
  }

  // Pelaje en todas las partes peludas.
  if (fur) for (const [mesh, k] of furred) addFur(mesh, fur, k);

  // Sombra de contacto (siempre visible, incluso sin shadow maps).
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(B.w, B.l) * 0.62, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }),
  );
  blob.position.y = 0.03;
  blob.renderOrder = 1;
  root.add(blob);

  root.scale.setScalar(breed.stats.scale);

  return {
    root, rig, pelvis, chest, head, jaw, tongue, ears, legs, tail, blob,
    hipY, legLen, mats, furMat: skin,
    mouthOffset: new THREE.Vector3(0, snoutY, snoutZ + S.l * 0.62),
    height: (hipY + B.h * 0.5 + H.h) * breed.stats.scale,
  };
}

export function disposeDogModel(model) {
  for (const k of Object.keys(model.mats)) model.mats[k].dispose();
  model.root.traverse((o) => {
    if (o.isMesh && o.geometry && !o.userData.isFur) o.geometry.dispose();
  });
  model.blob.material.dispose();
}
