// Constructor procedural de personajes humanoides estilizados (proporciones "chibi":
// cabeza grande, cuerpo compacto). Un único modelo paramétrico cubre a todos los NPCs:
// peinados, sombreros, gafas, barbas, vestidos/túnicas/armadura, capas, objetos y poses.
// `voxel: true` construye la versión pixelada (bloques) para PixelHugo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glowTexture, drawPaw } from '../world/Textures.js';

const _v = new THREE.Vector3();

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
}

export class NpcCharacter {
  constructor(def) {
    this.def = def;
    const a = def.look;
    this.voxel = Boolean(a.voxel);
    this.root = new THREE.Group();
    this.root.name = `NPC-${def.id}`;
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.time = Math.random() * 10;
    this.waveT = 0;
    this.mats = [];
    this.build(a);
    this.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    // Sombra de contacto.
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.65, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.position.y = 0.02;
    this.root.add(shadow);
  }

  m(color, extra) {
    const material = mat(color, this.voxel ? { flatShading: true, roughness: 0.9, ...extra } : extra);
    this.mats.push(material);
    return material;
  }

  add(parent, geo, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  /** Caja (vóxel) o forma redondeada según el estilo. */
  part(parent, w, h, d, material, x, y, z, round = 0.08) {
    const geo = this.voxel ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, Math.min(round, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    return this.add(parent, geo, material, x, y, z);
  }

  build(a) {
    const B = this.body;
    const skin = this.m(a.skin);
    const V = this.voxel;

    // ---------------- Piernas y botas ----------------
    const legMat = this.m(a.legs ?? '#1d1a24');
    const bootMat = this.m(a.boots ?? '#3a2418');
    for (const sx of [-1, 1]) {
      const leg = V ? this.part(B, 0.2, 0.75, 0.22, legMat, sx * 0.13, 0.5, 0) : this.add(B, new THREE.CylinderGeometry(0.09, 0.08, 0.75, 10), legMat, sx * 0.13, 0.5, 0);
      void leg;
      const boot = this.part(B, 0.22, a.tallBoots ? 0.45 : 0.22, 0.32, bootMat, sx * 0.13, a.tallBoots ? 0.24 : 0.11, 0.04, 0.06);
      if (a.bootCuff) this.part(B, 0.25, 0.08, 0.3, this.m(a.bootCuff), sx * 0.13, a.tallBoots ? 0.46 : 0.24, 0.03, 0.03);
      if (a.armor) this.part(B, 0.24, 0.3, 0.28, this.m('#9aa0aa', { metalness: 0.7, roughness: 0.35 }), sx * 0.13, 0.62, 0.02, 0.06);
      void boot;
    }

    // ---------------- Torso ----------------
    const topMat = this.m(a.top);
    const torso = V ? this.part(B, 0.62, 0.62, 0.36, topMat, 0, 1.2, 0)
      : this.add(B, new THREE.CylinderGeometry(0.26, 0.22, 0.62, 16), topMat, 0, 1.2, 0);
    torso.scale.z = V ? 1 : 0.75;
    if (a.trim) {
      const trimMat = this.m(a.trim, { metalness: 0.6, roughness: 0.35 });
      // Cordones / ribete central.
      this.part(B, 0.06, 0.55, 0.05, trimMat, 0, 1.2, V ? 0.19 : 0.2, 0.02);
    }
    if (a.armor) {
      const steel = this.m('#9aa0aa', { metalness: 0.75, roughness: 0.3 });
      const gold = this.m('#e0a92a', { metalness: 0.85, roughness: 0.3 });
      this.part(B, 0.6, 0.5, 0.42, steel, 0, 1.25, 0.02, 0.1);
      this.part(B, 0.62, 0.06, 0.44, gold, 0, 1.5, 0.02, 0.02);
      for (const sx of [-1, 1]) {
        const pad = this.part(B, 0.3, 0.16, 0.36, steel, sx * 0.38, 1.5, 0, 0.06);
        pad.rotation.z = -sx * 0.25;
        this.part(B, 0.32, 0.04, 0.38, gold, sx * 0.38, 1.43, 0, 0.02).rotation.z = -sx * 0.25;
      }
    }
    // Cinturón con hebilla / medallón.
    if (a.belt) {
      this.part(B, V ? 0.66 : 0.5, 0.09, V ? 0.4 : 0.42, this.m(a.belt), 0, 0.93, 0, 0.03);
      if (a.buckle) {
        const b = this.part(B, 0.14, 0.12, 0.05, this.m(a.buckle, { metalness: 0.85, roughness: 0.3 }), 0, 0.93, V ? 0.21 : 0.22, 0.02);
        if (a.medallion) {
          const c = document.createElement('canvas');
          c.width = c.height = 64;
          const g = c.getContext('2d');
          g.fillStyle = a.buckle; g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill();
          drawPaw(g, 32, 30, 0.42, '#7a4a10');
          const tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          const med = this.add(B, new THREE.CircleGeometry(0.11, 20), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.5, roughness: 0.4 }), 0, 0.93, 0.25);
          b.visible = false;
          void med;
        }
      }
    }

    // ---------------- Falda / túnica ----------------
    if (a.skirt) {
      const s = a.skirt;
      const len = s.length ?? 0.45;
      const flare = s.flare ?? 0.42;
      let geo;
      if (V) {
        geo = new THREE.BoxGeometry(0.7, len, 0.44);
      } else {
        geo = new THREE.CylinderGeometry(0.24, flare, len, s.jagged ? 10 : 24, 1, true);
        if (s.jagged) {
          // Bajo en picos (vestido de bruja).
          const pos = geo.attributes.position;
          for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) - (i % 2) * 0.12);
          geo.computeVertexNormals();
        }
      }
      const skirtMat = this.m(s.color, { side: THREE.DoubleSide });
      const sk = this.add(B, geo, skirtMat, 0, 0.92 - len / 2, 0);
      if (V && s.pixel) skirtMat.map = pixelTexture(s.color);
      if (s.trim && !V) {
        const hem = this.add(B, new THREE.TorusGeometry(flare, 0.025, 6, 28), this.m(s.trim, { metalness: 0.6 }), 0, 0.92 - len, 0);
        hem.rotation.x = Math.PI / 2;
      }
      void sk;
    }
    if (a.tabard) {
      this.part(B, 0.28, 0.42, 0.04, this.m(a.tabard), 0, 0.68, 0.22, 0.02);
    }

    // ---------------- Capa ----------------
    if (a.cape) {
      const capeMat = this.m(a.cape.color, { side: THREE.DoubleSide });
      if (a.cape.emblem) capeMat.map = emblemTexture(a.cape.color, a.cape.emblem, a.cape.trim);
      const capeGeo = new THREE.PlaneGeometry(0.75, a.cape.length ?? 1.35, 6, 8);
      capeGeo.translate(0, -(a.cape.length ?? 1.35) / 2, 0);
      const cape = this.add(B, capeGeo, capeMat, 0, 1.52, -0.22);
      cape.rotation.x = 0.12;
      // Leve curvatura.
      const pos = capeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, -Math.abs(pos.getX(i)) * 0.25 + pos.getY(i) * -0.1);
      capeGeo.computeVertexNormals();
      this.cape = cape;
      if (a.cape.collar) {
        const col = this.add(B, new THREE.TorusGeometry(0.27, 0.06, 8, 20, Math.PI * 1.3), this.m(a.cape.color), 0, 1.5, -0.02);
        col.rotation.set(Math.PI / 2, 0, Math.PI * 0.85);
      }
      if (a.amulet) {
        const am = this.add(B, new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: a.amulet, emissive: a.amulet, emissiveIntensity: 1.2 }), 0, 1.47, 0.24);
        am.scale.z = 0.5;
      }
    }

    // ---------------- Brazos ----------------
    const sleeveMat = this.m(a.sleeves ?? a.top);
    const makeArm = (sx) => {
      const arm = new THREE.Group();
      arm.position.set(sx * 0.33, 1.45, 0);
      B.add(arm);
      const upper = V ? this.part(arm, 0.17, 0.62, 0.17, sleeveMat, 0, -0.3, 0)
        : this.add(arm, new THREE.CylinderGeometry(0.075, a.wideSleeves ? 0.16 : 0.08, 0.62, 10), sleeveMat, 0, -0.3, 0);
      void upper;
      if (a.bracers) this.part(arm, 0.16, 0.18, 0.16, this.m(a.bracers), 0, -0.48, 0, 0.04);
      if (a.armor) this.part(arm, 0.17, 0.22, 0.17, this.m('#9aa0aa', { metalness: 0.7, roughness: 0.35 }), 0, -0.48, 0, 0.05);
      const hand = V ? this.part(arm, 0.13, 0.13, 0.13, skin, 0, -0.66, 0) : this.add(arm, new THREE.SphereGeometry(0.07, 10, 8), skin, 0, -0.66, 0);
      void hand;
      return arm;
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);

    // ---------------- Cabeza ----------------
    const head = new THREE.Group();
    head.position.set(0, 1.86, 0);
    B.add(head);
    this.head = head;
    if (V) this.part(head, 0.5, 0.52, 0.48, skin, 0, 0, 0);
    else this.add(head, new THREE.SphereGeometry(0.29, 22, 16), skin, 0, 0, 0).scale.set(0.95, 1.02, 0.95);
    // Cuello.
    this.add(B, new THREE.CylinderGeometry(0.08, 0.09, 0.14, 10), skin, 0, 1.56, 0);

    // Cara: ojos, cejas, nariz, sonrisa, colorete.
    const dark = this.m('#20140f');
    const fz = V ? 0.245 : 0.262;
    for (const sx of [-1, 1]) {
      if (V) this.part(head, 0.07, 0.07, 0.02, dark, sx * 0.1, 0.03, fz);
      else {
        this.add(head, new THREE.SphereGeometry(0.045, 12, 10), this.m('#ffffff'), sx * 0.1, 0.03, fz - 0.02).scale.z = 0.5;
        this.add(head, new THREE.SphereGeometry(0.03, 10, 8), this.m(a.eyes ?? '#4a2a14'), sx * 0.1, 0.03, fz).scale.z = 0.5;
      }
      const brow = this.part(head, 0.12, V ? 0.04 : 0.025, 0.03, this.m(a.brows ?? a.hair?.color ?? '#3a2418'), sx * 0.1, 0.12, fz, 0.01);
      brow.rotation.z = -sx * (a.browAngle ?? 0.12);
      if (!V) this.add(head, new THREE.SphereGeometry(0.035, 10, 8), this.m('#ff9aa8', { transparent: true, opacity: 0.6 }), sx * 0.16, -0.06, fz - 0.03).scale.set(1, 0.6, 0.3);
    }
    if (!V) {
      this.add(head, new THREE.SphereGeometry(0.03, 8, 6), skin, 0, -0.02, fz + 0.02);
      const smile = this.add(head, new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), this.m(a.lips ?? '#8a2a2a'), 0, -0.1, fz - 0.01);
      smile.rotation.z = Math.PI;
    } else {
      this.part(head, 0.14, 0.03, 0.02, dark, 0, -0.1, fz);
    }

    // Gafas.
    if (a.glasses) {
      const frame = this.m(a.glasses === 'sun' ? '#1a1410' : '#2a2a2a', { metalness: 0.4, roughness: 0.3 });
      for (const sx of [-1, 1]) {
        if (a.glasses === 'sun') {
          this.add(head, new THREE.CircleGeometry(0.075, 16), this.m('#2a1a10', { roughness: 0.1, metalness: 0.5 }), sx * 0.1, 0.03, fz + 0.03);
        } else {
          const lens = this.add(head, new THREE.TorusGeometry(0.06, 0.012, 4, 4), frame, sx * 0.1, 0.03, fz + 0.03);
          lens.rotation.z = Math.PI / 4;
          lens.scale.set(1.3, 0.9, 1);
        }
      }
      this.part(head, 0.06, 0.015, 0.015, frame, 0, 0.04, fz + 0.03, 0.005);
    }

    // Pelo.
    if (a.hair) this.buildHair(head, a.hair);
    // Barba / bigote.
    if (a.beard) this.buildBeard(head, a.beard, fz);
    // Pendientes.
    if (a.earrings) {
      for (const sx of [-1, 1]) {
        const e = this.add(head, new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI * 1.5), this.m(a.earrings, { emissive: a.earrings, emissiveIntensity: 0.5 }), sx * 0.29, -0.12, 0);
        e.rotation.y = Math.PI / 2;
      }
    }
    // Sombrero / capucha.
    if (a.hat) this.buildHat(head, a.hat);

    // ---------------- Objeto en la mano y pose ----------------
    this.buildProp(a);
    this.applyPose(a.pose, 0);
  }

  buildHair(head, h) {
    const hm = this.m(h.color);
    const V = this.voxel;
    if (V) {
      this.part(head, 0.54, 0.16, 0.5, hm, 0, 0.26, -0.02);
      this.part(head, 0.54, 0.4, 0.12, hm, 0, 0.06, -0.22);
      return;
    }
    switch (h.style) {
      case 'curly': case 'wavy': {
        const n = h.style === 'curly' ? 30 : 18;
        const geo = h.style === 'curly' ? new THREE.IcosahedronGeometry(0.11, 1) : new THREE.SphereGeometry(0.12, 10, 8);
        for (let i = 0; i < n; i++) {
          const t = i / n;
          const a = t * Math.PI * 2 * 2.3;
          const y = 0.22 - t * (h.length ?? 0.95);
          const r = 0.27 + t * 0.08;
          const blob = this.add(head, geo, hm, Math.sin(a) * r, y, -Math.abs(Math.cos(a)) * r * 0.8 - 0.04);
          blob.scale.setScalar(1 + t * 0.4);
        }
        this.add(head, new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm, 0, 0.04, -0.01).scale.set(1.02, 1.05, 1.02);
        break;
      }
      case 'short':
        this.add(head, new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), hm, 0, 0.05, -0.02);
        break;
      case 'bun':
        this.add(head, new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm, 0, 0.04, -0.01);
        this.add(head, new THREE.SphereGeometry(0.13, 14, 10), hm, 0, 0.3, -0.12);
        break;
      default: break; // calvo / bajo el sombrero
    }
  }

  buildBeard(head, b, fz) {
    const bm = this.m(b.color);
    if (this.voxel) {
      this.part(head, 0.5, 0.22, 0.1, bm, 0, -0.17, fz - 0.03);
      this.part(head, 0.14, 0.05, 0.04, bm, 0, -0.07, fz + 0.01);
      return;
    }
    if (b.style === 'long') {
      const g = new THREE.ConeGeometry(0.13, 0.55, 12);
      g.rotateX(Math.PI);
      this.add(head, g, bm, 0, -0.36, fz - 0.06);
      // Bigote y cejas pobladas.
      for (const sx of [-1, 1]) {
        const mo = this.add(head, new THREE.CapsuleGeometry(0.025, 0.12, 4, 8), bm, sx * 0.07, -0.06, fz + 0.01);
        mo.rotation.z = sx * 1.2;
      }
    } else {
      // Barba completa corta.
      this.add(head, new THREE.SphereGeometry(0.27, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2.4), bm, 0, -0.02, 0.02).scale.set(1.02, 1, 1.02);
      this.add(head, new THREE.CapsuleGeometry(0.025, 0.12, 4, 8), bm, 0, -0.06, fz + 0.01).rotation.z = Math.PI / 2;
    }
  }

  buildHat(head, h) {
    const hatMat = this.m(h.color);
    const hat = new THREE.Group();
    head.add(hat);
    switch (h.type) {
      case 'witch': {
        hat.position.set(0, 0.2, 0);
        hat.rotation.z = -0.08;
        this.add(hat, new THREE.CylinderGeometry(0.62, 0.62, 0.035, 32), hatMat, 0, 0, 0);
        this.add(hat, new THREE.CylinderGeometry(0.24, 0.3, 0.12, 24), this.m(h.band ?? '#1a1410'), 0, 0.07, 0);
        this.add(hat, new THREE.ConeGeometry(0.3, 0.6, 24), hatMat, 0, 0.38, 0);
        const tip = this.add(hat, new THREE.ConeGeometry(0.14, 0.38, 16), hatMat, 0.1, 0.78, 0);
        tip.rotation.z = -0.8;
        if (h.emblem === 'buckle') {
          this.part(hat, 0.16, 0.13, 0.04, this.m('#e0a92a', { metalness: 0.85, roughness: 0.3 }), 0, 0.07, 0.29, 0.02);
        } else if (h.emblem === 'moon') {
          const moon = this.add(hat, new THREE.TorusGeometry(0.08, 0.022, 8, 16, Math.PI * 1.4), this.m(h.emblemColor ?? '#d8dde4', { metalness: 0.8, roughness: 0.25 }), 0, 0.08, 0.3);
          moon.rotation.z = 0.9;
          if (h.gem) this.add(hat, new THREE.OctahedronGeometry(0.035, 0), this.m(h.gem, { emissive: h.gem, emissiveIntensity: 0.8 }), 0.02, 0.08, 0.31);
        }
        break;
      }
      case 'straw': {
        // Sombrero cónico de paja (maestro de artes marciales).
        hat.position.set(0, 0.17, 0);
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d');
        g.fillStyle = '#c9933f'; g.fillRect(0, 0, 128, 128);
        g.strokeStyle = 'rgba(110,70,20,0.6)';
        for (let i = 0; i < 128; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 2);
        const straw = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide });
        this.add(hat, new THREE.ConeGeometry(0.8, 0.42, 28, 1, true), straw, 0, 0.18, 0);
        this.add(hat, new THREE.ConeGeometry(0.06, 0.08, 10), this.m('#1a1410'), 0, 0.42, 0);
        // Cinta bajo la barbilla.
        for (const sx of [-1, 1]) this.add(hat, new THREE.CylinderGeometry(0.008, 0.008, 0.42, 4), this.m('#1a1410'), sx * 0.26, -0.2, 0.05);
        break;
      }
      case 'hood': {
        const hood = this.add(head, new THREE.SphereGeometry(0.36, 20, 14, Math.PI * 0.15, Math.PI * 1.7, 0, Math.PI * 0.75), this.m(h.color, { side: THREE.DoubleSide }), 0, 0.03, -0.02);
        hood.rotation.y = Math.PI / 2; // la abertura (phi = 0, eje -x) queda mirando hacia delante (+z)
        if (h.trim) {
          const rim = this.add(head, new THREE.TorusGeometry(0.33, 0.022, 6, 24, Math.PI * 1.5), this.m(h.trim, { metalness: 0.7, roughness: 0.3 }), 0, 0.02, 0.12);
          rim.rotation.z = -Math.PI * 0.25;
        }
        break;
      }
      case 'chef': {
        hat.position.set(0, 0.22, 0);
        const white = this.m('#ffffff');
        this.add(hat, new THREE.CylinderGeometry(0.24, 0.24, 0.18, 20), white, 0, 0.02, 0);
        for (const [x, z] of [[0, 0], [0.12, 0.06], [-0.12, 0.06], [0, -0.12]]) this.add(hat, new THREE.SphereGeometry(0.17, 14, 10), white, x, 0.2, z);
        break;
      }
      default: break;
    }
  }

  buildProp(a) {
    const p = a.prop;
    if (!p) return;
    if (p === 'broom') {
      const broom = new THREE.Group();
      broom.position.set(0, -0.66, 0.05);
      this.armL.add(broom);
      this.add(broom, new THREE.CylinderGeometry(0.035, 0.045, 1.7, 8), this.m('#7a4a26'), 0, 0.2, 0);
      const curl = this.add(broom, new THREE.TorusGeometry(0.08, 0.035, 6, 12, Math.PI * 1.2), this.m('#7a4a26'), 0.06, 1.08, 0);
      curl.rotation.z = Math.PI * 0.6;
      this.add(broom, new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), this.m('#c9a050'), 0, -0.68, 0);
      this.add(broom, new THREE.ConeGeometry(0.24, 0.55, 14), this.m('#d9b060', { roughness: 0.95 }), 0, -0.95, 0).rotation.x = Math.PI;
      this.propGlow = this.glowSprite('#c06bff', 1.2);
      this.propGlow.position.set(0, -0.8, 0);
      broom.add(this.propGlow);
    } else if (p === 'orb' || p === 'orbBook') {
      const orb = new THREE.Group();
      orb.position.set(0, -0.86, 0.12);
      this.armL.add(orb);
      this.orb = this.add(orb, new THREE.SphereGeometry(0.13, 18, 14), new THREE.MeshStandardMaterial({ color: a.orbColor ?? '#7a3cff', emissive: a.orbColor ?? '#7a3cff', emissiveIntensity: 1.6, roughness: 0.1 }));
      const ring = this.add(orb, new THREE.TorusGeometry(0.22, 0.01, 6, 32), new THREE.MeshBasicMaterial({ color: '#e0c8ff' }));
      ring.rotation.x = 1.1;
      this.orbRing = ring;
      this.propGlow = this.glowSprite(a.orbColor ?? '#9b6bff', 0.9);
      orb.add(this.propGlow);
      if (p === 'orbBook') {
        const book = new THREE.Group();
        book.position.set(0, -0.7, 0.12);
        this.armR.add(book);
        this.part(book, 0.3, 0.38, 0.08, this.m(a.bookColor ?? '#2a2a6a'), 0, 0, 0, 0.02);
        this.part(book, 0.27, 0.35, 0.085, this.m('#f2e8d0'), 0.012, 0, 0, 0.01);
        const moon = this.add(book, new THREE.TorusGeometry(0.06, 0.015, 6, 14, Math.PI * 1.4), this.m('#ffd84a', { emissive: '#ffb020', emissiveIntensity: 0.8 }), 0, 0, 0.045);
        moon.rotation.z = 0.9;
      }
    } else if (p === 'cookie') {
      const ck = new THREE.Group();
      ck.position.set(0, -0.72, 0.15);
      this.armR.add(ck);
      this.add(ck, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), this.m('#d9a05a'), 0, 0, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) this.add(ck, new THREE.SphereGeometry(0.025, 6, 4), this.m('#4a2a14'), Math.cos(i) * 0.11, Math.sin(i * 1.7) * 0.11, 0.035);
    }
  }

  glowSprite(color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(size);
    return s;
  }

  /** Pose base de cada personaje (los brazos se animan encima). */
  applyPose(pose, t) {
    const L = this.armL;
    const R = this.armR;
    const breathe = Math.sin(t * 1.8) * 0.03;
    switch (pose) {
      case 'witchTip': // mano a la ala del sombrero, escoba en la otra
        R.rotation.set(-0.4, 0, -2.5 + breathe);
        L.rotation.set(-0.35, 0, 0.35);
        break;
      case 'orb': // palma arriba con orbe, libro en la otra
        L.rotation.set(-1.15 + breathe, 0, 0.35);
        R.rotation.set(-0.7, 0, -0.25);
        break;
      case 'kungfu': // palma adelante, guardia
        R.rotation.set(-1.45 + breathe, 0, -0.2);
        L.rotation.set(-1.0, 0, 0.75 + breathe);
        this.body.position.y = -0.12 + Math.sin(t * 1.2) * 0.02;
        break;
      case 'armsCrossed': // brazos hacia delante y hacia dentro (se cruzan)
        L.rotation.set(-1.3, 0, 1.0 + breathe * 0.5);
        R.rotation.set(-1.2, 0, -1.0 - breathe * 0.5);
        break;
      case 'cookie':
        R.rotation.set(-1.1 + breathe, 0, -0.2);
        L.rotation.set(-0.2, 0, 0.25);
        break;
      default:
        L.rotation.set(0, 0, -0.15 - breathe);
        R.rotation.set(0, 0, 0.15 + breathe);
    }
  }

  wave() { this.waveT = 1.6; }

  update(dt, lookAt, fx) {
    this.time += dt;
    const t = this.time;
    const a = this.def.look;
    if (a.float) this.body.position.y = 0.2 + Math.sin(t * 1.6) * 0.07;
    this.applyPose(a.pose, t);
    if (this.waveT > 0) {
      this.waveT -= dt;
      this.armR.rotation.set(0, 0, -2.5 + Math.sin(t * 12) * 0.35);
    }
    if (lookAt) {
      const dx = lookAt.x - this.root.position.x;
      const dz = lookAt.z - this.root.position.z;
      let d = Math.atan2(dx, dz) - this.root.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.root.rotation.y += d * Math.min(1, dt * 2.5);
    }
    this.head.rotation.z = Math.sin(t * 0.7) * 0.06;
    if (this.cape) this.cape.rotation.x = 0.12 + Math.sin(t * 2.2) * 0.05;
    if (this.orb) {
      this.orb.position.y = Math.sin(t * 2) * 0.05;
      this.orbRing.rotation.z = t * 2;
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
  c.width = c.height = 16;
  const g = c.getContext('2d');
  const col = new THREE.Color(base);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const k = 0.85 + ((x * 7 + y * 13) % 5) * 0.06;
      g.fillStyle = `rgb(${Math.round(col.r * 255 * k)},${Math.round(col.g * 255 * k)},${Math.round(col.b * 255 * k)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
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
    g.fillRect(0, 246, 128, 10);
    g.fillRect(0, 0, 6, 256);
    g.fillRect(122, 0, 6, 256);
  }
  g.fillStyle = trim ?? '#ffd84a';
  if (emblem === 'lion') {
    // León rampante estilizado: melena, cabeza y cola.
    g.beginPath(); g.arc(64, 110, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = base; g.beginPath(); g.arc(64, 112, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = trim ?? '#ffd84a';
    g.beginPath(); g.arc(64, 112, 11, 0, Math.PI * 2); g.fill();
    g.fillRect(52, 138, 24, 50);
    g.fillRect(44, 182, 12, 26); g.fillRect(72, 182, 12, 26);
    g.beginPath(); g.moveTo(76, 150); g.quadraticCurveTo(110, 140, 100, 100); g.lineWidth = 6; g.strokeStyle = trim ?? '#ffd84a'; g.stroke();
  } else if (emblem === 'moons') {
    for (const [x, y] of [[30, 60], [90, 120], [40, 190], [96, 220]]) {
      g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = base; g.beginPath(); g.arc(x + 6, y - 4, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = trim ?? '#ffd84a';
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
