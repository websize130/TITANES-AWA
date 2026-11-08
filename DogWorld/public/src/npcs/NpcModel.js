// Personajes humanoides estilizados (estilo animación 3D, ~5 cabezas de alto).
// Anatomía articulada: hombro-codo-mano, muslo-espinilla-bota, torso con cintura,
// cara expresiva (ojos con iris y brillo, pestañas, cejas, nariz, sonrisa) y
// pelo/barbas con el mismo sistema de pelaje que los perros (suave y con volumen).
// Ropa: faldas con pliegues, capas que caen, armaduras con ribetes dorados,
// sombreros de bruja con la punta doblada, sombrero de paja, capucha…
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture, drawPaw } from '../world/Textures.js';
import { addFur } from '../world/Fur.js';

const _v = new THREE.Vector3();
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function ellipsoid(rx, ry, rz, ws = 24, hs = 18) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.scale(rx, ry, rz);
  return g.toNonIndexed();
}
function capsule(r, len, ax = [0, 1, 0]) {
  const g = new THREE.CapsuleGeometry(r, len, 6, 14);
  if (ax[1] !== 1) g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...ax).normalize()));
  return g.toNonIndexed();
}
function colorize(geo, color, jitter = 0) {
  const c = new THREE.Color(color);
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (jitter ? (Math.sin(pos.getX(i) * 43 + pos.getY(i) * 71 + pos.getZ(i) * 29) * jitter) : 0);
    arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export class NpcCharacter {
  constructor(def) {
    this.def = def;
    this.root = new THREE.Group();
    this.root.name = `NPC-${def.id}`;
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.time = Math.random() * 10;
    this.waveT = 0;
    this.mats = [];
    this.build(def.look);
    this.root.traverse((o) => { if (o.isMesh && !o.userData.isFur) o.castShadow = true; });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.position.y = 0.02;
    this.root.add(shadow);
  }

  m(color, extra = {}) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
    this.mats.push(material);
    return material;
  }

  add(parent, geo, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  build(a) {
    const B = this.body;
    const skin = this.m(a.skin, { roughness: 0.55 });
    this.skin = skin;
    const metal = (c) => this.m(c, { metalness: 0.85, roughness: 0.28 });
    const gold = metal('#e7b33a');

    // ---------------- Piernas y botas ----------------
    const legMat = this.m(a.legs ?? '#1d1a24');
    const bootMat = this.m(a.boots ?? '#3a2418', { roughness: 0.5 });
    this.legs = [];
    for (const sx of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(sx * 0.1, 0.9, 0);
      B.add(leg);
      this.add(leg, capsule(0.085, 0.34), legMat, 0, -0.21, 0);
      this.add(leg, capsule(0.068, 0.32), legMat, 0, -0.6, 0);
      this.add(leg, ellipsoid(0.085, 0.075, 0.15), bootMat, 0, -0.84, 0.05);
      if (a.tallBoots) {
        this.add(leg, new THREE.CylinderGeometry(0.083, 0.078, 0.4, 16), bootMat, 0, -0.66, 0);
        if (a.bootCuff) {
          const cuff = this.add(leg, new THREE.TorusGeometry(0.088, 0.025, 8, 20), this.m(a.bootCuff), 0, -0.47, 0);
          cuff.rotation.x = Math.PI / 2;
        }
        const strap = this.add(leg, new THREE.TorusGeometry(0.083, 0.012, 6, 20), metal('#8a6a3a'), 0, -0.72, 0);
        strap.rotation.x = Math.PI / 2;
      }
      if (a.armor) {
        const steel = metal('#a7adb8');
        this.add(leg, ellipsoid(0.08, 0.17, 0.06), steel, 0, -0.62, 0.04);
        this.add(leg, ellipsoid(0.085, 0.07, 0.07), steel, 0, -0.46, 0.04);
        const rim = this.add(leg, new THREE.TorusGeometry(0.075, 0.012, 6, 16), gold, 0, -0.5, 0.02);
        rim.rotation.x = Math.PI / 2;
      }
      this.legs.push(leg);
    }

    // ---------------- Torso ----------------
    const topMat = this.m(a.top);
    if (a.pixelRobe) { topMat.map = pixelTexture(a.top); topMat.color.set('#ffffff'); } // el color va en la textura
    const torsoGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0.01, 0.86), new THREE.Vector2(0.19, 0.88), new THREE.Vector2(0.21, 0.98), new THREE.Vector2(0.175, 1.1),
      new THREE.Vector2(0.2, 1.26), new THREE.Vector2(0.225, 1.4), new THREE.Vector2(0.2, 1.5), new THREE.Vector2(0.11, 1.57), new THREE.Vector2(0.01, 1.58),
    ], 28);
    torsoGeo.scale(1, 1, 0.74);
    this.add(B, torsoGeo, topMat);
    if (a.trim) {
      const trimMat = metal(a.trim);
      // Cordones del corpiño (zigzag) y ribete del escote.
      for (let i = 0; i < 4; i++) {
        const y = 1.12 + i * 0.06;
        for (const s of [-1, 1]) {
          const lace = this.add(B, new THREE.CylinderGeometry(0.006, 0.006, 0.085, 4), trimMat, 0, y, 0.148);
          lace.rotation.z = s * 0.9;
        }
      }
      const neckline = this.add(B, new THREE.TorusGeometry(0.16, 0.012, 6, 24, Math.PI), trimMat, 0, 1.45, 0.04);
      neckline.rotation.set(-Math.PI / 2 + 0.25, 0, Math.PI);
    }
    if (a.armor) {
      const steel = metal('#a7adb8');
      const plate = new THREE.LatheGeometry([
        new THREE.Vector2(0.19, 1.02), new THREE.Vector2(0.215, 1.12), new THREE.Vector2(0.24, 1.3), new THREE.Vector2(0.23, 1.44), new THREE.Vector2(0.14, 1.53),
      ], 28);
      plate.scale(1, 1, 0.8);
      this.add(B, plate, steel);
      for (const y of [1.44, 1.02]) {
        const r = this.add(B, new THREE.TorusGeometry(y > 1.2 ? 0.2 : 0.19, 0.012, 6, 28), gold, 0, y, 0);
        r.rotation.x = Math.PI / 2;
        r.scale.y = 0.8;
      }
      this.add(B, new THREE.BoxGeometry(0.03, 0.36, 0.02), gold, 0, 1.26, 0.2);
      for (const sx of [-1, 1]) {
        const pad = this.add(B, new THREE.SphereGeometry(0.14, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), steel, sx * 0.29, 1.47, 0);
        pad.scale.set(1, 0.75, 1.05);
        pad.rotation.z = -sx * 0.35;
        const rim = this.add(B, new THREE.TorusGeometry(0.14, 0.014, 6, 24), gold, sx * 0.29, 1.47, 0);
        rim.rotation.set(Math.PI / 2, -sx * 0.35, 0);
      }
    }
    if (a.belt) {
      const belt = this.add(B, new THREE.TorusGeometry(0.185, 0.03, 8, 30), this.m(a.belt), 0, 1.0, 0);
      belt.rotation.x = Math.PI / 2;
      belt.scale.y = 0.75;
      if (a.buckle) {
        if (a.medallion) {
          const c = document.createElement('canvas');
          c.width = c.height = 64;
          const g = c.getContext('2d');
          g.fillStyle = a.buckle; g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#7a4a10'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.stroke();
          drawPaw(g, 32, 30, 0.38, '#7a4a10');
          const tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          this.add(B, new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.6, roughness: 0.35 }), 0, 1.0, 0.145);
        } else {
          const frame = this.add(B, new THREE.TorusGeometry(0.04, 0.01, 4, 4), metal(a.buckle), 0, 1.0, 0.145);
          frame.rotation.z = Math.PI / 4;
          frame.scale.set(1.3, 1, 1);
        }
      }
    }

    // ---------------- Falda / túnica con pliegues ----------------
    if (a.skirt) {
      const s = a.skirt;
      const len = s.length ?? 0.45;
      const flare = s.flare ?? 0.42;
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        pts.push(new THREE.Vector2(0.19 + (flare - 0.19) * Math.pow(t, 0.8), 1.02 - t * len));
      }
      const geo = new THREE.LatheGeometry(pts, 48);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = pos.getY(i);
        const t = (1.02 - y) / len;
        const ang = Math.atan2(z, x);
        const fold = 1 + Math.sin(ang * 11) * 0.06 * t; // pliegues de tela
        pos.setX(i, x * fold);
        pos.setZ(i, z * fold * 0.85);
        if (s.jagged && t > 0.95) pos.setY(i, y - (Math.sin(ang * 7) > 0 ? 0.1 : 0));
      }
      geo.computeVertexNormals();
      const skirtMat = this.m(s.color, { side: THREE.DoubleSide });
      if (s.pixel) { skirtMat.map = pixelTexture(s.color); skirtMat.color.set('#ffffff'); }
      this.add(B, geo, skirtMat);
      if (s.trim) {
        const hem = this.add(B, new THREE.TorusGeometry(flare, 0.016, 6, 48), metal(s.trim), 0, 1.02 - len + 0.02, 0);
        hem.rotation.x = Math.PI / 2;
        hem.scale.set(1, 0.85, 1);
      }
    }
    if (a.tabard) {
      const tab = this.add(B, new THREE.PlaneGeometry(0.22, 0.42, 1, 4), this.m(a.tabard, { side: THREE.DoubleSide }), 0, 0.8, 0.19);
      tab.rotation.x = -0.05;
    }

    // ---------------- Capa ----------------
    if (a.cape) {
      const len = a.cape.length ?? 1.35;
      const capeMat = this.m(a.cape.color, { side: THREE.DoubleSide, roughness: 0.8 });
      if (a.cape.emblem) capeMat.map = emblemTexture(a.cape.color, a.cape.emblem, a.cape.trim);
      const geo = new THREE.PlaneGeometry(0.78, len, 14, 12);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const t = (len / 2 - y) / len; // 0 arriba, 1 abajo
        const width = 0.75 + t * 0.5;
        // Se curva alrededor de la espalda y forma pliegues hacia abajo.
        const z = -Math.cos((x / 0.39) * 1.1) * 0.12 - t * 0.18 + Math.sin(x * 18) * 0.025 * t;
        pos.setXYZ(i, x * width, y - len / 2, z);
      }
      geo.computeVertexNormals();
      this.cape = this.add(B, geo, capeMat, 0, 1.52, -0.12);
      if (a.cape.collar) {
        const col = this.add(B, new THREE.TorusGeometry(0.2, 0.055, 10, 24, Math.PI * 1.25), this.m(a.cape.color), 0, 1.53, -0.02);
        col.rotation.set(Math.PI / 2, 0, Math.PI * 0.88);
      }
      if (a.amulet) {
        const am = this.add(B, new THREE.OctahedronGeometry(0.045, 0), new THREE.MeshStandardMaterial({ color: a.amulet, emissive: a.amulet, emissiveIntensity: 1.3 }), 0, 1.49, 0.17);
        am.scale.z = 0.5;
        this.add(B, new THREE.TorusGeometry(0.05, 0.01, 6, 16), gold, 0, 1.49, 0.165);
      }
    }

    // ---------------- Brazos articulados ----------------
    const sleeveMat = this.m(a.sleeves ?? a.top);
    if (a.pixelRobe) { sleeveMat.map = pixelTexture(a.top); sleeveMat.color.set('#ffffff'); }
    const makeArm = (sx) => {
      const arm = new THREE.Group();
      arm.position.set(sx * 0.27, 1.46, 0);
      B.add(arm);
      this.add(arm, new THREE.SphereGeometry(0.075, 14, 10), sleeveMat);
      this.add(arm, capsule(0.064, 0.22), sleeveMat, 0, -0.15, 0);
      const fore = new THREE.Group();
      fore.position.y = -0.3;
      fore.rotation.order = 'YXZ';
      arm.add(fore);
      if (a.wideSleeves) {
        this.add(fore, new THREE.CylinderGeometry(0.06, 0.13, 0.24, 18, 1, true), this.m(a.sleeves ?? a.top, { side: THREE.DoubleSide }), 0, -0.1, 0);
      } else {
        this.add(fore, capsule(0.055, 0.2), a.bracers ? this.m(a.bracers) : sleeveMat, 0, -0.13, 0);
      }
      if (a.armor) this.add(fore, capsule(0.064, 0.14), metal('#a7adb8'), 0, -0.15, 0.005);
      // Mano: palma, dedos juntos y pulgar.
      const hand = new THREE.Group();
      hand.position.y = -0.3;
      fore.add(hand);
      const handMat = a.armor ? metal('#a7adb8') : skin;
      this.add(hand, ellipsoid(0.045, 0.06, 0.028), handMat, 0, -0.02, 0);
      this.add(hand, ellipsoid(0.04, 0.04, 0.024), handMat, 0, -0.075, 0.004);
      const thumb = this.add(hand, capsule(0.014, 0.035), handMat, -sx * 0.042, -0.02, 0.018);
      thumb.rotation.z = sx * 0.6;
      arm.userData = { fore, hand, side: sx };
      return arm;
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);

    // ---------------- Cuello y cabeza ----------------
    this.add(B, new THREE.CylinderGeometry(0.058, 0.07, 0.16, 14), skin, 0, 1.6, 0);
    const head = new THREE.Group();
    head.position.set(0, 1.84, 0.01);
    B.add(head);
    this.head = head;
    const jawG = ellipsoid(0.17, 0.12, 0.16);
    jawG.translate(0, -0.12, 0.04);
    this.add(head, mergeGeometries([ellipsoid(0.235, 0.25, 0.23), jawG]), skin);
    for (const sx of [-1, 1]) this.add(head, ellipsoid(0.035, 0.06, 0.03), skin, sx * 0.232, -0.01, -0.01);
    this.buildFace(head, a);
    if (a.hair) this.buildHair(head, a.hair);
    if (a.beard) this.buildBeard(head, a.beard);
    if (a.glasses) this.buildGlasses(head, a.glasses);
    if (a.earrings) {
      for (const sx of [-1, 1]) {
        const e = this.add(head, new THREE.TorusGeometry(0.03, 0.009, 6, 14, Math.PI * 1.5), this.m(a.earrings, { emissive: a.earrings, emissiveIntensity: 0.6, metalness: 0.5 }), sx * 0.24, -0.09, 0);
        e.rotation.set(0, Math.PI / 2, 0.6);
      }
    }
    if (a.hat) this.buildHat(head, a.hat);
    if (a.hoodDown) {
      // Capucha caída sobre la espalda (Pablosky).
      const hm = this.m(a.hoodDown, { side: THREE.DoubleSide });
      if (a.pixelRobe) { hm.map = pixelTexture(a.hoodDown); hm.color.set('#ffffff'); }
      const hd = this.add(B, new THREE.SphereGeometry(0.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), hm, 0, 1.56, -0.17);
      hd.rotation.x = -2.2;
      hd.scale.set(1.1, 0.9, 0.9);
      const col = this.add(B, new THREE.TorusGeometry(0.17, 0.06, 10, 24), hm, 0, 1.57, -0.01);
      col.rotation.x = Math.PI / 2;
    }

    this.buildProp(a);
    this.applyPose(a.pose, 0);
  }

  // ---------------------------------------------------------------- cara
  buildFace(head, a) {
    const fz = 0.205;
    const white = this.m('#ffffff', { roughness: 0.25 });
    const iris = new THREE.MeshPhysicalMaterial({ color: a.eyes ?? '#4a2a14', roughness: 0.1, clearcoat: 1 });
    const pupil = new THREE.MeshPhysicalMaterial({ color: '#0a0608', roughness: 0.05, clearcoat: 1 });
    const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const browMat = this.m(a.brows ?? a.hair?.color ?? '#3a2418');
    const female = Boolean(a.lips);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(sx * 0.085, 0.015, fz);
      eye.rotation.y = sx * 0.18;
      head.add(eye);
      eye.scale.setScalar(1.15);
      this.add(eye, ellipsoid(0.048, 0.056, 0.03), white);
      this.add(eye, new THREE.SphereGeometry(0.034, 16, 12), iris, 0, -0.004, 0.02).scale.z = 0.5;
      this.add(eye, new THREE.SphereGeometry(0.02, 12, 10), pupil, 0, -0.004, 0.032).scale.z = 0.4;
      this.add(eye, new THREE.SphereGeometry(0.009, 8, 6), shine, 0.012, 0.014, 0.039);
      this.add(eye, new THREE.SphereGeometry(0.004, 6, 4), shine, -0.01, -0.012, 0.039);
      // Párpado superior (expresión) y pestañas.
      const lid = this.add(eye, new THREE.SphereGeometry(0.052, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), this.skin, 0, 0.004, 0.003);
      lid.scale.set(1, 1, 0.65);
      lid.rotation.x = 0.25;
      if (female) {
        const lash = this.add(eye, new THREE.TorusGeometry(0.05, 0.007, 4, 14, Math.PI), this.m('#1a1010'), 0, 0.006, 0.022);
        lash.scale.set(1, 0.85, 1);
        const flick = this.add(eye, capsule(0.005, 0.02), this.m('#1a1010'), sx * 0.05, 0.03, 0.02);
        flick.rotation.z = -sx * 0.9;
      }
      const brow = this.add(head, capsule(0.012, 0.07, [1, 0, 0]), browMat, sx * 0.09, 0.09, fz + 0.012);
      brow.rotation.z = -sx * (a.browAngle ?? 0.1);
      if (a.beard?.style === 'long') brow.scale.set(1.3, 2.2, 1.6); // cejas pobladas del maestro
      this.add(head, new THREE.SphereGeometry(0.032, 10, 8), this.m('#ff9aa8', { transparent: true, opacity: 0.45 }), sx * 0.14, -0.06, fz - 0.03).scale.set(1, 0.6, 0.3);
    }
    this.add(head, ellipsoid(0.026, 0.034, 0.028), this.skin, 0, -0.04, fz + 0.03);
    const smile = this.add(head, new THREE.TorusGeometry(0.045, 0.01, 6, 16, Math.PI), this.m(a.lips ?? '#8a3a3a'), 0, -0.1, fz + 0.005);
    smile.rotation.z = Math.PI;
    smile.scale.set(1, 0.7, 1);
    if (female) this.add(head, ellipsoid(0.03, 0.01, 0.01), this.m(a.lips), 0, -0.115, fz + 0.008);
  }

  // ---------------------------------------------------------------- pelo
  buildHair(head, h) {
    const parts = [];
    const cap = ellipsoid(0.252, 0.255, 0.248);
    // Solo arriba/atrás: la cara queda libre (flequillo bajo en la frente).
    const pos = cap.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (z > 0.1 && y < 0.1) pos.setXYZ(i, pos.getX(i) * 0.98, 0.1 + (y - 0.1) * 0.15, z * 0.85);
    }
    cap.computeVertexNormals();
    cap.translate(0, 0.03, -0.012);
    parts.push(cap);
    switch (h.style) {
      case 'curly': {
        // Melena rizada voluminosa hasta los hombros (Isabel).
        for (let i = 0; i < 26; i++) {
          const a = -Math.PI * 0.95 + ((i % 13) / 12) * Math.PI * 1.9;
          if (Math.cos(a) < -0.6) continue; // no tapar la cara
          const row = Math.floor(i / 13);
          const r = 0.25 + row * 0.04;
          const c = ellipsoid(0.085, 0.11, 0.085, 12, 10);
          c.translate(Math.sin(a) * r, -0.08 - row * 0.2 - Math.abs(Math.cos(a)) * 0.05, -Math.cos(a) * r * 0.9 - 0.02);
          parts.push(c);
        }
        break;
      }
      case 'wavy': {
        const back = ellipsoid(0.24, 0.36, 0.1);
        back.translate(0, -0.26, -0.15);
        parts.push(back);
        for (const sx of [-1, 1]) {
          const lock = capsule(0.055, 0.32);
          lock.translate(sx * 0.2, -0.3, 0.02);
          parts.push(lock);
        }
        break;
      }
      case 'bun': {
        const bun = ellipsoid(0.12, 0.1, 0.1);
        bun.translate(0, 0.2, -0.17);
        parts.push(bun);
        break;
      }
      default: break; // corto
    }
    const geo = colorize(mergeGeometries(parts), h.color, 0.08);
    const mesh = this.add(head, geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
    const curly = h.style === 'curly';
    addFur(mesh, { length: (h.style === 'short' ? 0.018 : 0.03), density: 70, droop: curly ? 0.4 : 0.7, curl: curly ? 0.9 : 0.15, rootShade: 0.7, tip: 1.15 });
  }

  buildBeard(head, b) {
    const parts = [];
    if (b.style === 'long') {
      const beard = ellipsoid(0.11, 0.24, 0.07);
      beard.translate(0, -0.3, 0.13);
      const chin = ellipsoid(0.15, 0.09, 0.1);
      chin.translate(0, -0.15, 0.12);
      parts.push(beard, chin);
      for (const sx of [-1, 1]) {
        const mo = capsule(0.018, 0.12, [sx, -0.6, 0]);
        mo.translate(sx * 0.07, -0.1, 0.21);
        parts.push(mo);
      }
    } else {
      const jaw = ellipsoid(0.19, 0.13, 0.17);
      const pos = jaw.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) * 0.25);
      jaw.computeVertexNormals();
      jaw.translate(0, -0.1, 0.05);
      const mo = capsule(0.018, 0.09, [1, 0, 0]);
      mo.translate(0, -0.075, 0.215);
      parts.push(jaw, mo);
    }
    const geo = colorize(mergeGeometries(parts), b.color, 0.06);
    const mesh = this.add(head, geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
    addFur(mesh, { length: b.style === 'long' ? 0.03 : 0.018, density: 80, droop: 0.8, curl: 0.1, rootShade: 0.75, tip: 1.15 });
  }

  buildGlasses(head, type) {
    const fz = 0.245;
    const frame = this.m(type === 'sun' ? '#1a1410' : '#2a2a2a', { metalness: 0.5, roughness: 0.3 });
    for (const sx of [-1, 1]) {
      if (type === 'sun') {
        const lens = this.add(head, ellipsoid(0.06, 0.05, 0.012), new THREE.MeshPhysicalMaterial({ color: '#2a1a10', roughness: 0.05, metalness: 0.3, clearcoat: 1 }), sx * 0.088, 0.02, fz);
        lens.rotation.y = sx * 0.18;
        const rim = this.add(head, new THREE.TorusGeometry(0.058, 0.009, 6, 20), frame, sx * 0.088, 0.02, fz);
        rim.scale.set(1.05, 0.85, 1);
        rim.rotation.y = sx * 0.18;
      } else {
        const lens = this.add(head, new THREE.TorusGeometry(0.048, 0.009, 4, 4), frame, sx * 0.088, 0.02, fz);
        lens.rotation.set(0, sx * 0.18, Math.PI / 4);
        lens.scale.set(1.35, 0.95, 1);
        this.add(head, ellipsoid(0.05, 0.035, 0.004), new THREE.MeshPhysicalMaterial({ color: '#dff4ff', transparent: true, opacity: 0.25, roughness: 0, clearcoat: 1 }), sx * 0.088, 0.02, fz);
      }
      this.add(head, new THREE.BoxGeometry(0.008, 0.008, 0.2), frame, sx * 0.235, 0.03, 0.13);
    }
    this.add(head, new THREE.BoxGeometry(0.05, 0.01, 0.01), frame, 0, 0.03, fz + 0.005);
  }

  buildHat(head, h) {
    const hat = new THREE.Group();
    head.add(hat);
    switch (h.type) {
      case 'witch': {
        const hatMat = this.m(h.color, { side: THREE.DoubleSide, roughness: 0.75 });
        hat.position.set(0, 0.17, -0.01);
        hat.rotation.set(-0.08, 0, -0.06);
        // Ala ondulada.
        const brim = new THREE.RingGeometry(0.2, 0.6, 48, 2);
        brim.rotateX(-Math.PI / 2);
        const bp = brim.attributes.position;
        for (let i = 0; i < bp.count; i++) {
          const x = bp.getX(i);
          const z = bp.getZ(i);
          const r = Math.hypot(x, z);
          bp.setY(i, Math.sin(Math.atan2(z, x) * 3) * 0.025 * (r / 0.6) - (r > 0.45 ? (r - 0.45) * 0.25 : 0));
        }
        brim.computeVertexNormals();
        this.add(hat, brim, hatMat);
        // Copa cónica con la punta doblada (segmentos encadenados).
        let parent = hat;
        let y = 0;
        [[0.25, 0.2, 0.22], [0.2, 0.14, 0.2], [0.14, 0.08, 0.18], [0.08, 0.02, 0.16]].forEach(([r0, r1, hgt], i) => {
          const seg = new THREE.Group();
          seg.position.y = y;
          seg.rotation.z = i === 0 ? 0 : -0.28 * i;
          parent.add(seg);
          this.add(seg, new THREE.CylinderGeometry(r1, r0, hgt, 24, 1, true), hatMat, 0, hgt / 2, 0);
          parent = seg;
          y = hgt;
        });
        this.add(parent, new THREE.SphereGeometry(0.022, 10, 8), hatMat, 0, y, 0);
        this.add(hat, new THREE.CylinderGeometry(0.245, 0.255, 0.06, 28, 1, true), this.m(h.band ?? '#1a1410', { side: THREE.DoubleSide }), 0, 0.035, 0);
        if (h.emblem === 'buckle') {
          const bk = this.add(hat, new THREE.TorusGeometry(0.045, 0.012, 4, 4), this.m('#e7b33a', { metalness: 0.85, roughness: 0.3 }), 0, 0.035, 0.25);
          bk.rotation.z = Math.PI / 4;
          bk.scale.set(1.2, 1, 1);
        } else if (h.emblem === 'moon') {
          const moon = this.add(hat, new THREE.TorusGeometry(0.06, 0.018, 8, 18, Math.PI * 1.4), this.m(h.emblemColor ?? '#d8dde4', { metalness: 0.8, roughness: 0.2 }), 0, 0.05, 0.255);
          moon.rotation.z = 0.9;
          if (h.gem) this.add(hat, new THREE.OctahedronGeometry(0.028, 0), this.m(h.gem, { emissive: h.gem, emissiveIntensity: 0.9 }), 0.015, 0.05, 0.27);
        }
        break;
      }
      case 'straw': {
        hat.position.set(0, 0.14, 0);
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d');
        g.fillStyle = '#d29a45'; g.fillRect(0, 0, 128, 128);
        g.strokeStyle = 'rgba(110,70,20,0.55)';
        g.lineWidth = 2;
        for (let i = 0; i < 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 3);
        const straw = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide });
        this.mats.push(straw);
        this.add(hat, new THREE.ConeGeometry(0.75, 0.36, 40, 2, true), straw, 0, 0.15, 0);
        const rim = this.add(hat, new THREE.TorusGeometry(0.75, 0.015, 6, 40), straw, 0, -0.03, 0);
        rim.rotation.x = Math.PI / 2;
        this.add(hat, new THREE.ConeGeometry(0.05, 0.07, 12), this.m('#1a1410'), 0, 0.36, 0);
        for (const sx of [-1, 1]) {
          const cord = this.add(hat, new THREE.CylinderGeometry(0.006, 0.006, 0.36, 4), this.m('#1a1410'), sx * 0.2, -0.2, 0.08);
          cord.rotation.z = sx * 0.25;
        }
        break;
      }
      case 'hood': {
        const hoodMat = this.m(h.color, { side: THREE.DoubleSide, roughness: 0.85 });
        const hood = this.add(head, new THREE.SphereGeometry(0.31, 28, 18, Math.PI * 0.2, Math.PI * 1.6, 0, Math.PI * 0.78), hoodMat, 0, 0.02, -0.03);
        hood.rotation.y = Math.PI / 2; // la abertura queda hacia delante
        hood.scale.set(1, 1.08, 1.05);
        if (h.trim) {
          const rim = this.add(head, new THREE.TorusGeometry(0.29, 0.018, 6, 30, Math.PI * 1.5), this.m(h.trim, { metalness: 0.75, roughness: 0.3 }), 0, 0.03, 0.12);
          rim.rotation.z = -Math.PI * 0.25;
          rim.scale.set(0.98, 1.1, 1);
        }
        const drape = this.add(this.body, new THREE.TorusGeometry(0.2, 0.07, 10, 24), hoodMat, 0, 1.55, -0.02);
        drape.rotation.x = Math.PI / 2;
        break;
      }
      case 'chef': {
        hat.position.set(0, 0.2, 0);
        const white = this.m('#ffffff', { roughness: 0.8 });
        this.add(hat, new THREE.CylinderGeometry(0.21, 0.22, 0.14, 24), white, 0, 0.02, 0);
        for (const [x, z, r] of [[0, 0, 0.17], [0.12, 0.05, 0.13], [-0.12, 0.05, 0.13], [0, -0.11, 0.14], [0.06, 0.1, 0.12]]) this.add(hat, new THREE.SphereGeometry(r, 16, 12), white, x, 0.2, z);
        break;
      }
      default: break;
    }
  }

  // ---------------------------------------------------------------- objetos
  buildProp(a) {
    const p = a.prop;
    if (!p) return;
    const handL = this.armL.userData.hand;
    const handR = this.armR.userData.hand;
    if (p === 'broom') {
      const broom = new THREE.Group();
      broom.position.set(0, -0.05, 0.02);
      broom.rotation.x = 0.15;
      handL.add(broom);
      const wood = this.m('#7a4a26', { roughness: 0.8 });
      const shaft = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.85, 0), new THREE.Vector3(0.02, -0.3, 0), new THREE.Vector3(-0.01, 0.3, 0), new THREE.Vector3(0.02, 0.75, 0), new THREE.Vector3(0.12, 0.88, 0), new THREE.Vector3(0.16, 0.8, 0)]);
      this.add(broom, new THREE.TubeGeometry(shaft, 40, 0.026, 8), wood);
      this.add(broom, new THREE.CylinderGeometry(0.06, 0.06, 0.08, 14), this.m('#c9a050'), 0, -0.86, 0);
      const bristles = ellipsoid(0.14, 0.3, 0.14);
      const bp = bristles.attributes.position;
      for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); const k = 0.45 + smooth(0.3, -0.3, y) * 0.7; bp.setX(i, bp.getX(i) * k); bp.setZ(i, bp.getZ(i) * k); }
      bristles.computeVertexNormals();
      colorize(bristles, '#e0b45c', 0.1);
      const br = this.add(broom, bristles, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 0, -1.12, 0);
      addFur(br, { length: 0.04, density: 90, droop: 1.2, rootShade: 0.75, tip: 1.15 });
      this.propGlow = this.glowSprite('#c06bff', 1.0);
      this.propGlow.position.set(0, -1.05, 0);
      broom.add(this.propGlow);
    } else if (p === 'orb' || p === 'orbBook') {
      const orb = new THREE.Group();
      orb.position.set(0, -0.06, 0.16);
      handL.add(orb);
      this.orb = this.add(orb, new THREE.SphereGeometry(0.11, 24, 18), new THREE.MeshPhysicalMaterial({ color: a.orbColor ?? '#7a3cff', emissive: a.orbColor ?? '#7a3cff', emissiveIntensity: 1.8, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.9 }));
      this.orbRing = this.add(orb, new THREE.TorusGeometry(0.19, 0.006, 6, 40), new THREE.MeshBasicMaterial({ color: '#f0e0ff' }));
      this.orbRing.rotation.x = 1.1;
      this.orbRing2 = this.add(orb, new THREE.TorusGeometry(0.16, 0.005, 6, 40), new THREE.MeshBasicMaterial({ color: '#c0a0ff' }));
      this.orbRing2.rotation.set(0.4, 0.8, 0);
      this.propGlow = this.glowSprite(a.orbColor ?? '#9b6bff', 0.9);
      orb.add(this.propGlow);
      if (p === 'orbBook') {
        const book = new THREE.Group();
        book.position.set(0, -0.06, 0.08);
        book.rotation.set(0.2, -0.3, 0);
        handR.add(book);
        this.add(book, new THREE.BoxGeometry(0.24, 0.3, 0.06), this.m(a.bookColor ?? '#2a2a6a', { roughness: 0.6 }));
        this.add(book, new THREE.BoxGeometry(0.22, 0.28, 0.065), this.m('#f2e8d0'), 0.012, 0, 0);
        const moon = this.add(book, new THREE.TorusGeometry(0.05, 0.012, 6, 14, Math.PI * 1.4), this.m('#ffd84a', { emissive: '#ffb020', emissiveIntensity: 1 }), 0, 0, 0.033);
        moon.rotation.z = 0.9;
        for (const [x, y] of [[-0.1, 0.13], [0.1, 0.13], [-0.1, -0.13], [0.1, -0.13]]) this.add(book, new THREE.BoxGeometry(0.03, 0.03, 0.065), this.m('#c9a050', { metalness: 0.7 }), x, y, 0);
      }
    } else if (p === 'cookie') {
      const ck = new THREE.Group();
      ck.position.set(0, -0.06, 0.12);
      handR.add(ck);
      this.add(ck, new THREE.CylinderGeometry(0.15, 0.15, 0.04, 24).rotateX(Math.PI / 2), this.m('#d9a05a', { roughness: 0.9 }));
      for (let i = 0; i < 7; i++) this.add(ck, new THREE.SphereGeometry(0.02, 6, 4), this.m('#4a2a14'), Math.cos(i * 2.4) * 0.09, Math.sin(i * 2.4) * 0.09, 0.022);
    }
  }

  glowSprite(color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(size);
    return s;
  }

  // ---------------------------------------------------------------- poses
  /** Hombro (x adelante, z lateral) y codo (doblez, giro hacia dentro). */
  setArm(arm, sx, sz, bend, inward = 0) {
    arm.rotation.set(sx, 0, sz);
    arm.userData.fore.rotation.set(-bend, -inward * arm.userData.side, 0);
  }

  applyPose(pose, t) {
    const L = this.armL;
    const R = this.armR;
    const b = Math.sin(t * 1.8) * 0.03;
    this.body.position.y = 0;
    for (const leg of this.legs) leg.rotation.set(0, 0, 0);
    switch (pose) {
      case 'witchTip': // se toca el ala del sombrero; escoba en la otra mano
        this.setArm(R, -0.2, -2.55 + b, 1.75, 0.1);
        this.setArm(L, -0.25, 0.22, 0.7);
        break;
      case 'orb': // palma arriba con el orbe; libro en la otra mano
        this.setArm(L, -0.55 + b, 0.3, 0.9, 0.2);
        this.setArm(R, -0.2, -0.18, 1.3, 0.5);
        break;
      case 'kungfu': // palma adelante y guardia, piernas abiertas
        this.setArm(R, -1.35 + b, -0.15, 0.2, 0.1);
        this.setArm(L, -0.7, 0.45, 1.7, 0.6);
        this.body.position.y = -0.1 + Math.sin(t * 1.2) * 0.015;
        this.legs[0].rotation.z = -0.22;
        this.legs[1].rotation.z = 0.22;
        break;
      case 'armsCrossed':
        this.setArm(L, -0.3, 0.12, 1.65, 1.15 + b);
        this.setArm(R, -0.25, -0.12, 1.55, 1.05 - b);
        break;
      case 'cookie':
        this.setArm(R, -0.6 + b, -0.15, 1.2, 0.4);
        this.setArm(L, -0.1, 0.2, 0.5);
        break;
      default:
        this.setArm(L, 0, 0.12 + b, 0.25);
        this.setArm(R, 0, -0.12 - b, 0.25);
    }
  }

  wave() { this.waveT = 1.6; }

  update(dt, lookAt, fx) {
    this.time += dt;
    const t = this.time;
    this.applyPose(this.def.look.pose, t);
    this.body.scale.y = 1 + Math.sin(t * 1.8) * 0.006; // respiración
    if (this.waveT > 0) {
      this.waveT -= dt;
      this.setArm(this.armR, -0.1, -2.6, 0.6 + Math.sin(t * 12) * 0.35);
    }
    if (lookAt) {
      const dx = lookAt.x - this.root.position.x;
      const dz = lookAt.z - this.root.position.z;
      let d = Math.atan2(dx, dz) - this.root.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.root.rotation.y += d * Math.min(1, dt * 2.5);
    }
    this.head.rotation.z = Math.sin(t * 0.7) * 0.05;
    this.head.rotation.x = Math.sin(t * 0.5) * 0.03;
    if (this.cape) this.cape.rotation.x = Math.sin(t * 2.2) * 0.04;
    if (this.orb) {
      this.orb.position.y = Math.sin(t * 2) * 0.03;
      this.orbRing.rotation.z = t * 2;
      this.orbRing2.rotation.y = t * 1.4;
    }
    if (this.propGlow) this.propGlow.material.opacity = 0.55 + Math.sin(t * 3) * 0.2;
    if (fx && this.propGlow && Math.sin(t * 2.7) > 0.98) {
      this.propGlow.getWorldPosition(_v);
      fx.emit('sparkle', _v.x, _v.y, _v.z, null, 0.3);
    }
  }
}

function pixelTexture(base) {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d');
  const col = new THREE.Color(base);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const k = 0.7 + ((x * 5 + y * 3 + x * y) % 5) * 0.12; // bloques de color bien visibles
      g.fillStyle = `rgb(${Math.round(col.r * 255 * k)},${Math.round(col.g * 255 * k)},${Math.round(col.b * 255 * k)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Capa con emblema (león dorado, lunas…). */
function emblemTexture(base, emblem, trim) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  if (trim) {
    g.fillStyle = trim;
    g.fillRect(0, 244, 128, 12);
    g.fillRect(0, 0, 6, 256);
    g.fillRect(122, 0, 6, 256);
  }
  g.fillStyle = trim ?? '#ffd84a';
  g.strokeStyle = trim ?? '#ffd84a';
  if (emblem === 'lion') {
    g.beginPath(); g.arc(64, 100, 28, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath(); g.arc(64 + Math.cos(a) * 30, 100 + Math.sin(a) * 30, 9, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = base; g.beginPath(); g.arc(64, 102, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = trim ?? '#ffd84a';
    g.beginPath(); g.arc(64, 104, 10, 0, Math.PI * 2); g.fill();
    g.fillRect(50, 132, 28, 56);
    g.fillRect(44, 182, 12, 30); g.fillRect(72, 182, 12, 30);
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(78, 160); g.quadraticCurveTo(112, 150, 104, 110); g.stroke();
  } else if (emblem === 'moons') {
    for (const [x, y] of [[30, 60], [90, 120], [40, 190], [96, 220]]) {
      g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = base; g.beginPath(); g.arc(x + 6, y - 4, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = trim ?? '#ffd84a';
    }
    for (let i = 0; i < 14; i++) { g.beginPath(); g.arc((i * 37) % 128, (i * 71) % 256, 2, 0, Math.PI * 2); g.fill(); }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
