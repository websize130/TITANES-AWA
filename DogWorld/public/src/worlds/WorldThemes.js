// Estética de cada mundo: cielo, niebla, materiales de las islas, agua y decorado.
// Todo procedural (sustituible por GLB): cada tema decora los bordes de los pads
// y añade un gran elemento de fondo (rascacielos, pirámide, montaña, castillo…).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture, rockNoiseTexture } from '../world/Textures.js';
import { getMaterials } from '../world/Materials.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

export const THEMES = {
  park: {
    sky: ['#3f8fe8', '#d8f2ff'], fog: ['#cfe9ff', 60, 260], sun: '#fff1d6', hemi: ['#dcecff', '#6a8a3a'],
    top: '#6fbf3e', side: '#8a6a4a', under: ['#9a8a7a', '#4a3a3a'],
    water: { color: '#4fa8e8', emissive: '#103a6a' },
    wall: { color: '#c9a77e' }, gate: { color: '#3b3b44', accent: '#ffd84a' }, stones: '#d9c2a0',
  },
  forest: {
    sky: ['#1f5a3a', '#b8e8a0'], fog: ['#7fb88a', 25, 140], sun: '#e8ffd0', hemi: ['#b8f0c0', '#2a4a20'],
    top: '#3f8a34', side: '#5a3e26', under: ['#5a4a3a', '#20201a'],
    water: { color: '#2f6a5a', emissive: '#0a2a1a' },
    wall: { color: '#7a5233', logs: true }, gate: { color: '#2f5a26', accent: '#b8ff7a' }, stones: '#a8ff8a',
  },
  ice: {
    sky: ['#5aa8e8', '#f2fbff'], fog: ['#e6f6ff', 50, 220], sun: '#ffffff', hemi: ['#ffffff', '#8ab8d8'],
    top: '#f2f8ff', side: '#b8d8ee', under: ['#c6e2f5', '#5a7a9a'],
    water: { color: '#2f7ab8', emissive: '#0a2a4a' },
    wall: { color: '#bfe6ff' }, gate: { color: '#7fb8e0', accent: '#ffffff' }, stones: '#dff4ff',
  },
  factory: {
    sky: ['#3a3f4a', '#a8aeb8'], fog: ['#8a8f9a', 40, 200], sun: '#ffe2b8', hemi: ['#e8e8f0', '#5a4a3a'],
    top: '#7a808b', side: '#4a4e57', under: ['#5b606b', '#2a2c33'],
    water: { color: '#ff8a1f', emissive: '#ff5a00', hot: true },
    wall: { color: '#b07a40', crates: true }, gate: { color: '#4a4e57', accent: '#ffa94d' }, stones: '#ffd84a',
  },
  desert: {
    sky: ['#4aa8f0', '#ffe9b8'], fog: ['#ffe2b0', 60, 260], sun: '#fff0c8', hemi: ['#fff6e0', '#c8a060'],
    top: '#f0cf86', side: '#c89a54', under: ['#d9b06a', '#7a5a2a'],
    water: { color: '#3fc1c9', emissive: '#0a4a4a' },
    wall: { color: '#d9a85a' }, gate: { color: '#b98a44', accent: '#ffcf4a' }, stones: '#ffe7a0',
  },
  fortress: {
    sky: ['#140528', '#5a2a9a'], fog: ['#3a1a5a', 30, 180], sun: '#c9a0ff', hemi: ['#b89cff', '#1a0a2a'],
    top: '#4a4458', side: '#2a2533', under: ['#3a3346', '#120c1a'],
    water: { color: '#9b4dff', emissive: '#5a10b0', hot: true },
    wall: { color: '#4a4458', bars: true }, gate: { color: '#2a2533', accent: '#c78bff' }, stones: '#c78bff',
  },
};

/** Recorre puntos a lo largo de los bordes laterales de los pads. */
function edgeSpots(pads, spacing, cb) {
  for (const [px, pz, w, d, top] of pads) {
    if (w < 8) continue; // pasarelas estrechas sin decorado
    const n = Math.max(1, Math.floor(d / spacing));
    for (let i = 0; i < n; i++) {
      const z = pz + d / 2 - (i + 0.5) * (d / n);
      for (const side of [-1, 1]) cb(px + side * (w / 2 - 0.9), z, top, side);
    }
  }
}

/** Decorado de cada tema. ctx: { group, pads, rnd, collision } */
export const DECORATE = {
  park({ group, pads, rnd, collision }) {
    const trunk = std('#7a5233');
    const leaf = std('#4caf3a');
    const bench = std('#8a5a32');
    const iron = std('#2b2e35', { metalness: 0.6, roughness: 0.4 });
    edgeSpots(pads, 5, (x, z, y, side) => {
      const r = rnd();
      if (r < 0.45) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2, 8), trunk);
        t.position.set(x, y + 1, z);
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rnd() * 0.4, 1), leaf);
        c.position.set(x, y + 2.6, z);
        group.add(t, c);
        collision.addCylinder(x, z, 0.35, y, y + 2.2);
      } else if (r < 0.7) {
        const b = new THREE.Group();
        b.position.set(x, y, z);
        b.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.5), bench);
        seat.position.y = 0.5;
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.1), bench);
        back.position.set(0, 0.85, -0.22);
        for (const sx of [-0.8, 0.8]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.45), iron);
          leg.position.set(sx, 0.25, 0);
          b.add(leg);
        }
        b.add(seat, back);
        group.add(b);
      } else {
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 8), iron);
        lamp.position.set(x, y + 1.5, z);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff3b0' }));
        bulb.position.set(x, y + 3.1, z);
        group.add(lamp, bulb);
      }
    });
    // Rascacielos al fondo.
    const city = [];
    for (let i = 0; i < 14; i++) {
      const h = 20 + rnd() * 50;
      const b = new THREE.BoxGeometry(8 + rnd() * 6, h, 8);
      b.translate(-70 + i * 11, h / 2 - 25, -150 - rnd() * 30);
      city.push(b);
    }
    group.add(new THREE.Mesh(mergeGeometries(city), std('#9fb6d6', { roughness: 0.6 })));
  },

  forest({ group, pads, rnd, collision }) {
    const trunk = std('#4a3520');
    const pine = std('#24572a');
    const mush = new THREE.MeshStandardMaterial({ color: '#ff6fb5', emissive: '#ff3fa0', emissiveIntensity: 0.6 });
    const stem = std('#f2e8dc');
    edgeSpots(pads, 3.5, (x, z, y) => {
      if (rnd() < 0.65) {
        const s = 0.8 + rnd() * 0.6;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.35 * s, 3 * s, 8), trunk);
        t.position.set(x, y + 1.5 * s, z);
        group.add(t);
        for (let k = 0; k < 3; k++) {
          const c = new THREE.Mesh(new THREE.ConeGeometry((1.6 - k * 0.4) * s, 2.2 * s, 9), pine);
          c.position.set(x, y + (2.6 + k * 1.3) * s, z);
          c.castShadow = true;
          group.add(c);
        }
        collision.addCylinder(x, z, 0.4 * s, y, y + 3 * s);
      } else {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8), stem);
        st.position.set(x, y + 0.25, z);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mush);
        cap.position.set(x, y + 0.48, z);
        group.add(st, cap);
      }
    });
    // Árboles gigantes al fondo.
    for (let i = 0; i < 10; i++) {
      const x = -60 + i * 13 + rnd() * 4;
      const z = -40 - rnd() * 80;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(2, 3.5, 90, 10), trunk);
      t.position.set(x < 0 ? x - 20 : x + 20, 0, z);
      group.add(t);
    }
    addFireflies(group, rnd, '#c8ff7a');
  },

  ice({ group, pads, rnd, collision }) {
    const snowPine = std('#2f6a5a');
    const snow = std('#ffffff');
    const crystal = new THREE.MeshPhysicalMaterial({ color: '#cfefff', emissive: '#4fb8ff', emissiveIntensity: 0.4, roughness: 0.1, transparent: true, opacity: 0.85 });
    edgeSpots(pads, 4, (x, z, y) => {
      if (rnd() < 0.55) {
        for (let k = 0; k < 3; k++) {
          const c = new THREE.Mesh(new THREE.ConeGeometry(1.4 - k * 0.35, 1.8, 8), snowPine);
          c.position.set(x, y + 0.9 + k * 1.1, z);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9 - k * 0.25, 0.6, 8), snow);
          cap.position.set(x, y + 1.6 + k * 1.1, z);
          group.add(c, cap);
        }
        collision.addCylinder(x, z, 0.5, y, y + 3);
      } else {
        const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.6 + rnd() * 0.5, 0), crystal);
        g.scale.set(0.6, 1.6, 0.6);
        g.position.set(x, y + 0.8, z);
        g.rotation.z = (rnd() - 0.5) * 0.5;
        group.add(g);
      }
    });
    // Gran montaña nevada al fondo.
    const m = new THREE.Mesh(new THREE.ConeGeometry(90, 120, 7), std('#dfeefa'));
    m.position.set(10, 20, -230);
    const peak = new THREE.Mesh(new THREE.ConeGeometry(36, 48, 7), snow);
    peak.position.set(10, 56, -230);
    group.add(m, peak);
    addSnow(group, rnd);
  },

  factory({ group, pads, rnd, collision }) {
    const metal = std('#5b606b', { metalness: 0.6, roughness: 0.45 });
    const colors = ['#ff6b6b', '#ffd84a', '#6fd3ff', '#7be07b', '#ff8fc8', '#ffa94d'].map((c) => std(c, { roughness: 0.5 }));
    edgeSpots(pads, 4, (x, z, y) => {
      const r = rnd();
      if (r < 0.4) {
        // Engranaje.
        const gear = new THREE.Group();
        gear.position.set(x, y + 1.6, z);
        gear.rotation.y = Math.PI / 2;
        gear.add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 20), metal).rotateX(Math.PI / 2));
        for (let k = 0; k < 10; k++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.3), metal);
          const a = (k / 10) * Math.PI * 2;
          tooth.position.set(Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0);
          tooth.rotation.z = a;
          gear.add(tooth);
        }
        gear.userData.spin = 0.6 + rnd();
        group.add(gear);
        (group.userData.gears ||= []).push(gear);
      } else {
        // Bloques de juguete apilados.
        const n = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          const b = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.9, 0.9, 2, 0.1), colors[Math.floor(rnd() * colors.length)]);
          b.position.set(x + (rnd() - 0.5) * 0.3, y + 0.45 + k * 0.9, z);
          b.rotation.y = rnd();
          b.castShadow = true;
          group.add(b);
        }
        collision.addBoxCentered(x, y, z, 0.9, n * 0.9, 0.9);
      }
    });
    // Chimeneas humeantes.
    for (let i = 0; i < 6; i++) {
      const h = 40 + rnd() * 30;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, h, 12), std('#6a4a3a'));
      const x = (i % 2 ? 1 : -1) * (40 + rnd() * 30);
      c.position.set(x, h / 2 - 30, -30 - i * 25);
      group.add(c);
      const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#cfcfcf', transparent: true, opacity: 0.5, depthWrite: false }));
      smoke.scale.setScalar(14);
      smoke.position.set(x, h - 26, -30 - i * 25);
      group.add(smoke);
    }
  },

  desert({ group, pads, rnd, collision }) {
    const palmTrunk = std('#8a5a2e');
    const palmLeaf = std('#3f9a3a');
    const stone = std('#d9a85a');
    edgeSpots(pads, 4.5, (x, z, y) => {
      if (rnd() < 0.5) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 3.2, 8), palmTrunk);
        t.position.set(x, y + 1.6, z);
        t.rotation.z = (rnd() - 0.5) * 0.3;
        group.add(t);
        for (let k = 0; k < 6; k++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2, 4), palmLeaf);
          const a = (k / 6) * Math.PI * 2;
          leaf.position.set(x + Math.cos(a) * 0.8, y + 3.1, z + Math.sin(a) * 0.8);
          leaf.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
          group.add(leaf);
        }
        collision.addCylinder(x, z, 0.3, y, y + 3);
      } else {
        const h = 1.5 + rnd() * 2.5;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, h, 10), stone);
        p.position.set(x, y + h / 2, z);
        p.castShadow = true;
        group.add(p);
        collision.addCylinder(x, z, 0.5, y, y + h);
      }
    });
    // Pirámides al fondo y dunas.
    const pyr = (x, z, s) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.9, 4), std('#e8b968'));
      m.position.set(x, s * 0.45 - 20, z);
      m.rotation.y = Math.PI / 4;
      group.add(m);
    };
    pyr(-20, -200, 70);
    pyr(70, -170, 40);
    pyr(-90, -150, 30);
  },

  fortress({ group, pads, rnd, collision }) {
    const dark = std('#3a3346');
    const crystal = getMaterials().crystal;
    const torchMat = new THREE.MeshBasicMaterial({ color: '#c78bff' });
    edgeSpots(pads, 4, (x, z, y, side) => {
      const r = rnd();
      if (r < 0.35) {
        // Estatua de gato.
        const cat = buildCatStatue(dark);
        cat.position.set(x, y, z);
        cat.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(cat);
        collision.addCylinder(x, z, 0.6, y, y + 2.2);
      } else if (r < 0.7) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + rnd() * 0.4, 0), crystal);
        c.scale.set(0.7, 1.7, 0.7);
        c.position.set(x, y + 0.9, z);
        group.add(c);
      } else {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8), dark);
        post.position.set(x, y + 1.1, z);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), torchMat);
        flame.position.set(x, y + 2.5, z);
        group.add(post, flame);
      }
    });
    // Castillo de los gatos al fondo, con orejas de gato en las torres.
    const castle = new THREE.Group();
    castle.position.set(0, -20, -190);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(90, 40, 10), dark);
    wall.position.y = 20;
    castle.add(wall);
    for (const x of [-40, -14, 14, 40]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 70, 10), dark);
      tower.position.set(x, 35, 5);
      castle.add(tower);
      for (const ex of [-3.5, 3.5]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 4), std('#2a2533'));
        ear.position.set(x + ex, 74, 5);
        castle.add(ear);
      }
      const eye = new THREE.Mesh(new THREE.CircleGeometry(1.4, 12), new THREE.MeshBasicMaterial({ color: '#ffd84a' }));
      eye.position.set(x, 55, 12.1);
      castle.add(eye);
    }
    group.add(castle);
    addFireflies(group, rnd, '#c78bff');
  },
};

function addFireflies(group, rnd, color) {
  const n = 120;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rnd() - 0.5) * 40;
    pos[i * 3 + 1] = 0.5 + rnd() * 6;
    pos[i * 3 + 2] = 5 - rnd() * 110;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map: glowTexture(), color, size: 0.4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  group.add(pts);
  (group.userData.floaters ||= []).push(pts);
}

function addSnow(group, rnd) {
  const n = 400;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rnd() - 0.5) * 50;
    pos[i * 3 + 1] = rnd() * 20;
    pos[i * 3 + 2] = 5 - rnd() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTexture(), color: '#ffffff', size: 0.25, transparent: true, depthWrite: false }));
  group.add(pts);
  group.userData.snow = pts;
}

/** Gato villano: estatua o guardián (cabeza con orejas, ojos amarillos, cola). */
export function buildCatStatue(mat, eyes = '#ffd84a') {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), mat);
  body.scale.set(1, 1.2, 0.9);
  body.position.y = 0.7;
  const head = new THREE.Group();
  head.position.y = 1.65;
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), mat));
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 4), mat);
    ear.position.set(sx * 0.24, 0.38, 0);
    ear.rotation.z = -sx * 0.25;
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: eyes }));
    eye.position.set(sx * 0.15, 0.05, 0.36);
    eye.scale.set(1, 1.3, 0.5);
    head.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 6, 16, Math.PI * 1.2), mat);
  tail.position.set(0, 0.6, -0.5);
  tail.rotation.y = Math.PI / 2;
  g.add(body, head, tail);
  g.userData.head = head;
  g.userData.tail = tail;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export { rockNoiseTexture };
