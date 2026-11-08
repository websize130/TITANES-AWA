// Accesorios 3D para los perros. Cada pieza se diseña en un marco normalizado
// (1 unidad = ancho de la cabeza o del lomo) y se ancla al hueso adecuado del
// modelo de la raza, así encaja igual en Rufus que en Goliath.
import * as THREE from 'three';
import { COSMETIC_BY_ID } from './CosmeticData.js';
import { glowTexture } from '../world/Textures.js';

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
const GOLD = () => M('#ffcf4a', { metalness: 0.85, roughness: 0.25, emissive: '#5a3200', emissiveIntensity: 0.3 });

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** Construye la pieza en su marco normalizado. */
export function buildCosmetic(id) {
  const item = COSMETIC_BY_ID[id];
  const g = new THREE.Group();
  g.name = `cos-${id}`;
  if (!item) return g;
  const c = item.color;
  switch (id) {
    // ------------------------------------------------------------ cabeza
    case 'party_hat': {
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const ctx = cv.getContext('2d');
      const cols = ['#ff8fc8', '#ffd84a', '#6fd3ff', '#7be07b'];
      for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(0, i * 8, 64, 8); }
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const hat = mesh(new THREE.ConeGeometry(0.28, 0.7, 20), new THREE.MeshStandardMaterial({ map: tex }), 0, 0.33, 0);
      hat.rotation.z = -0.15;
      g.add(hat);
      g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), M('#ffffff'), -0.05, 0.7, 0));
      break;
    }
    case 'bow':
      for (const sx of [-1, 1]) {
        const lobe = mesh(new THREE.SphereGeometry(0.16, 12, 10), M(c), sx * 0.17 + 0.18, 0.02, 0);
        lobe.scale.set(1.2, 0.8, 0.5);
        lobe.rotation.z = sx * 0.4;
        g.add(lobe);
      }
      g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), M('#ffffff'), 0.18, 0.02, 0.02));
      break;
    case 'flower_crown': {
      const ring = mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 28), M('#4caf3a'), 0, 0.02, 0);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      const cols = ['#ffd84a', '#ff8fc8', '#ffffff', '#b47cff'];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), M(cols[i % 4]), Math.cos(a) * 0.4, 0.06, Math.sin(a) * 0.4));
      }
      break;
    }
    case 'straw_hat': {
      const straw = M('#c9933f', { roughness: 0.9, side: THREE.DoubleSide });
      g.add(mesh(new THREE.ConeGeometry(0.85, 0.38, 24, 1, true), straw, 0, 0.17, 0));
      g.add(mesh(new THREE.ConeGeometry(0.06, 0.08, 10), M('#1a1410'), 0, 0.38, 0));
      break;
    }
    case 'witch_hat': {
      const hm = M(c);
      g.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.03, 28), hm, 0, 0.02, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.1, 20), M('#2a1a14'), 0, 0.08, 0));
      g.add(mesh(new THREE.ConeGeometry(0.3, 0.6, 20), hm, 0, 0.38, 0));
      const tip = mesh(new THREE.ConeGeometry(0.14, 0.36, 14), hm, 0.1, 0.76, 0);
      tip.rotation.z = -0.8;
      g.add(tip);
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.11, 0.03), GOLD(), 0, 0.08, 0.3));
      break;
    }
    case 'crown': {
      const gold = GOLD();
      g.add(mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.16, 20, 1, true), gold, 0, 0.08, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(mesh(new THREE.ConeGeometry(0.07, 0.2, 6), gold, Math.cos(a) * 0.3, 0.25, Math.sin(a) * 0.3));
        g.add(mesh(new THREE.OctahedronGeometry(0.045, 0), M(i % 2 ? '#ff2a5a' : '#2a7aff', { emissive: i % 2 ? '#ff2a5a' : '#2a7aff', emissiveIntensity: 0.6 }), Math.cos(a) * 0.32, 0.08, Math.sin(a) * 0.32));
      }
      break;
    }
    // ------------------------------------------------------------- gafas
    case 'sunglasses': case 'round_glasses': case 'heart_glasses': case 'pixel_glasses': {
      const frame = M(id === 'heart_glasses' ? '#ff4f9a' : '#1a1410', { metalness: 0.3, roughness: 0.3 });
      for (const sx of [-1, 1]) {
        let lens;
        if (id === 'round_glasses') {
          lens = mesh(new THREE.TorusGeometry(0.11, 0.018, 6, 20), frame, sx * 0.24, 0, 0.02);
          g.add(mesh(new THREE.CircleGeometry(0.1, 20), M('#cfefff', { transparent: true, opacity: 0.35 }), sx * 0.24, 0, 0.02));
        } else if (id === 'heart_glasses') {
          const shape = new THREE.Shape();
          shape.moveTo(0, -0.1);
          shape.bezierCurveTo(-0.18, 0.02, -0.08, 0.14, 0, 0.05);
          shape.bezierCurveTo(0.08, 0.14, 0.18, 0.02, 0, -0.1);
          lens = mesh(new THREE.ShapeGeometry(shape), M('#ff6fb5', { emissive: '#ff2a8a', emissiveIntensity: 0.4, side: THREE.DoubleSide }), sx * 0.24, 0, 0.03);
          lens.scale.setScalar(1.2);
        } else if (id === 'pixel_glasses') {
          lens = mesh(new THREE.BoxGeometry(0.26, 0.1, 0.03), M('#111111'), sx * 0.22, 0, 0.03);
        } else {
          lens = mesh(new THREE.CircleGeometry(0.12, 18), M('#1a1008', { metalness: 0.6, roughness: 0.1 }), sx * 0.24, 0, 0.03);
        }
        g.add(lens);
        // Patillas hacia atrás.
        const arm = mesh(new THREE.BoxGeometry(0.02, 0.02, 0.5), frame, sx * 0.36, 0.02, -0.24);
        g.add(arm);
      }
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.025, 0.025), frame, 0, 0.03, 0.03));
      break;
    }
    // ------------------------------------------------------------ cuello
    case 'bandana': {
      const ring = mesh(new THREE.TorusGeometry(0.44, 0.05, 8, 24), M(c), 0, 0, 0);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      const tri = mesh(new THREE.ConeGeometry(0.22, 0.32, 3), M(c), 0, -0.14, 0.4);
      tri.rotation.set(0.25, 0, Math.PI);
      tri.scale.z = 0.25;
      g.add(tri);
      break;
    }
    case 'bowtie': {
      for (const sx of [-1, 1]) {
        const w = mesh(new THREE.ConeGeometry(0.11, 0.2, 4), M(c), sx * 0.1, 0, 0.44);
        w.rotation.z = sx * Math.PI / 2;
        w.scale.z = 0.4;
        g.add(w);
      }
      g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), M(c), 0, 0, 0.45));
      break;
    }
    case 'scarf': {
      const ring = mesh(new THREE.TorusGeometry(0.44, 0.1, 10, 24), M(c), 0, 0, 0);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      const end = mesh(new THREE.BoxGeometry(0.16, 0.42, 0.06), M('#ffffff'), 0.22, -0.2, 0.42);
      end.rotation.z = 0.2;
      g.add(end);
      break;
    }
    case 'medal': {
      const ribbon = mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 24), M('#3a5ae0'), 0, 0, 0);
      ribbon.rotation.x = Math.PI / 2;
      g.add(ribbon);
      const disc = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 20), GOLD(), 0, -0.16, 0.46);
      disc.rotation.x = Math.PI / 2;
      g.add(disc);
      g.add(mesh(new THREE.OctahedronGeometry(0.05, 0), M('#ff2a5a', { emissive: '#ff2a5a', emissiveIntensity: 0.5 }), 0, -0.16, 0.49));
      break;
    }
    // ------------------------------------------------------------ espalda
    case 'backpack': {
      g.add(mesh(new THREE.BoxGeometry(0.6, 0.45, 0.55), M(c), 0, 0.22, 0));
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.2, 0.08), M('#e07a1a'), 0, 0.15, 0.3));
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 10).rotateZ(Math.PI / 2), M('#6fbf3e'), 0, 0.5, -0.1));
      break;
    }
    case 'moon_cape': case 'lion_cape': {
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 96;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = c; ctx.fillRect(0, 0, 64, 96);
      ctx.fillStyle = '#ffcf4a';
      if (id === 'moon_cape') {
        ctx.beginPath(); ctx.arc(32, 40, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(38, 36, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        for (const [x, y] of [[12, 70], [50, 78], [20, 20]]) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
      } else {
        ctx.beginPath(); ctx.arc(32, 42, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(32, 44, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcf4a'; ctx.fillRect(28, 58, 8, 22);
        ctx.fillRect(0, 90, 64, 6);
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const geo = new THREE.PlaneGeometry(1.1, 1.4, 4, 6);
      geo.rotateX(-Math.PI / 2 + 0.25);
      geo.translate(0, 0.02, -0.65);
      const cape = mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 }));
      g.add(cape);
      g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), GOLD(), 0, 0.05, 0.05));
      g.userData.cape = cape;
      break;
    }
    case 'fairy_wings': case 'golden_wings': {
      const wm = id === 'golden_wings' ? GOLD() : M(c, { transparent: true, opacity: 0.7, emissive: '#7fd8ff', emissiveIntensity: 0.4, side: THREE.DoubleSide });
      const wings = [];
      for (const sx of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(sx * 0.12, 0.15, 0);
        const up = mesh(new THREE.CircleGeometry(0.42, 18), wm, sx * 0.38, 0.22, 0);
        up.scale.set(1, 0.6, 1);
        up.rotation.y = Math.PI / 2;
        const low = mesh(new THREE.CircleGeometry(0.28, 16), wm, sx * 0.3, -0.08, 0);
        low.scale.set(1, 0.6, 1);
        low.rotation.y = Math.PI / 2;
        // Alas de mariposa: planos verticales abiertos hacia los lados.
        up.rotation.set(0, 0, sx * 0.35);
        low.rotation.set(0, 0, -sx * 0.3);
        wing.add(up, low);
        g.add(wing);
        wings.push(wing);
      }
      if (id === 'golden_wings') {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffd84a', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.scale.setScalar(1.8);
        glow.position.y = 0.3;
        g.add(glow);
      }
      g.userData.wings = wings;
      break;
    }
    default: break;
  }
  return g;
}

/**
 * Coloca los accesorios equipados en el modelo del perro.
 * Devuelve la lista de grupos creados (para quitarlos o animarlos).
 */
export function attachCosmetics(model, breed, equipped) {
  const H = breed.model.head;
  const B = breed.model.body;
  const out = [];
  for (const [slot, id] of Object.entries(equipped || {})) {
    if (!id || !COSMETIC_BY_ID[id]) continue;
    const g = buildCosmetic(id);
    const holder = new THREE.Group();
    holder.add(g);
    if (slot === 'head') {
      holder.position.set(0, H.h * 0.46, -0.02);
      holder.scale.setScalar(H.w * (breed.model.fluffy ? 1.25 : 1));
      model.head.add(holder);
    } else if (slot === 'eyes') {
      holder.position.set(0, H.h * 0.1, H.d / 2 + 0.03);
      holder.scale.setScalar(H.w);
      model.head.add(holder);
    } else if (slot === 'neck') {
      holder.position.set(0, B.h * 0.45, 0.1);
      holder.rotation.x = -0.45;
      holder.scale.setScalar(H.w * (breed.model.ruff || breed.model.fluffy ? 1.15 : 1));
      model.chest.add(holder);
    } else if (slot === 'back') {
      holder.position.set(0, B.h * 0.5, B.l / 2 - 0.12);
      holder.scale.setScalar(Math.max(B.w, 0.5));
      model.pelvis.add(holder);
    }
    holder.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    out.push(holder);
  }
  return out;
}

/** Animación ligera (alas que aletean, capa que ondea). */
export function animateCosmetics(list, t, speed01) {
  for (const holder of list) {
    const g = holder.children[0];
    const wings = g?.userData.wings;
    if (wings) {
      const flap = Math.sin(t * (6 + speed01 * 10)) * 0.35;
      wings[0].rotation.y = flap;
      wings[1].rotation.y = -flap;
    }
    if (g?.userData.cape) g.userData.cape.rotation.x = Math.sin(t * 3) * 0.05 + speed01 * 0.25;
  }
}
