// Elementos del Hub: ruinas con arco, pedestales con cristales, braseros, vallas,
// árboles, rocas, flores, camino de adoquines y plataformas para saltar.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterials, shadow } from './Materials.js';
import { applyClothWind } from './Wind.js';
import { mulberry32, glowTexture } from './Textures.js';
import { terrainHeight, pathX, islandSd, SPAWN } from './Terrain.js';

const tmpColor = new THREE.Color();

export function buildProps(collision, quality) {
  const M = getMaterials();
  const group = new THREE.Group();
  group.name = 'HubProps';
  const updaters = [];
  const rnd = mulberry32(1234);
  const bannerMat = applyClothWind(M.banner.clone(), { mode: 'banner', amplitude: 0.1 });
  const h = (x, z) => terrainHeight(x, z);

  // Bloque de piedra redondeado (look estilizado "chunky").
  const blockGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
  const stoneBlock = (w, hh, d, x, y, z, ry = 0, color) => {
    const m = new THREE.Mesh(blockGeo, color ? M.stoneRough.clone() : M.stoneRough);
    if (color) m.material.color.set(color);
    m.scale.set(w, hh, d);
    m.position.set(x, y + hh / 2, z);
    m.rotation.y = ry;
    return shadow(m);
  };

  // ---------------- Camino de adoquines ----------------
  {
    const stones = [];
    const base = new THREE.CylinderGeometry(1, 1, 1, 7);
    for (let z = 34; z > -54; z -= 0.75) {
      const cx = pathX(z);
      for (let i = -3; i <= 3; i++) {
        const x = cx + i * 0.95 + (rnd() - 0.5) * 0.35 + (Math.abs(z * 10) % 2 ? 0.45 : 0);
        if (Math.abs(x - cx) > 3.3) continue;
        const zz = z + (rnd() - 0.5) * 0.3;
        stones.push({ x, z: zz, r: 0.38 + rnd() * 0.12, ry: rnd() * Math.PI, shade: 0.75 + rnd() * 0.35 });
      }
    }
    const inst = new THREE.InstancedMesh(base, new THREE.MeshStandardMaterial({
      color: '#ffffff', roughness: 0.85, bumpMap: M.rock.bumpMap, bumpScale: 0.8,
    }), stones.length);
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    const stoneColor = new THREE.Color('#d9b48a');
    stones.forEach((st, i) => {
      p.set(st.x, h(st.x, st.z) + 0.04, st.z);
      e.set(0, st.ry, 0);
      q.setFromEuler(e);
      s.set(st.r, 0.14, st.r * 0.9);
      inst.setMatrixAt(i, mtx.compose(p, q, s));
      tmpColor.copy(stoneColor).multiplyScalar(st.shade);
      inst.setColorAt(i, tmpColor);
    });
    inst.receiveShadow = true;
    group.add(inst);
  }

  // ---------------- Ruinas con arco (primer plano izquierdo) ----------------
  {
    const ruin = new THREE.Group();
    const rx = -12, rz = 12;
    const ry = 0.5;
    const baseY = h(rx, rz) - 0.1;
    ruin.position.set(rx, baseY, rz);
    ruin.rotation.y = ry;
    const pillarX = 3.4;
    const blockH = 1.05;
    const rows = 4;
    for (const sx of [-1, 1]) {
      for (let r = 0; r < rows; r++) {
        const w = 1.5 + rnd() * 0.25;
        ruin.add(stoneBlock(w, blockH, 1.5, sx * pillarX + (rnd() - 0.5) * 0.15, r * blockH, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.08));
      }
    }
    // Dintel en arco de bloques.
    const archR = pillarX;
    const archBlocks = 9;
    for (let i = 0; i < archBlocks; i++) {
      const a = Math.PI - (i + 0.5) * (Math.PI / archBlocks);
      const b = stoneBlock(1.3, 1.0, 1.5, Math.cos(a) * archR, rows * blockH + Math.sin(a) * archR * 0.45 - 0.5, 0);
      b.rotation.z = a - Math.PI / 2;
      ruin.add(b);
    }
    // Viga superior plana (transitable).
    ruin.add(stoneBlock(8.4, 0.8, 1.7, 0, rows * blockH + archR * 0.45, 0));
    // Hiedra.
    const ivy = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rnd() * 0.3, 0), M.leaves);
      leaf.geometry.setAttribute('color', solidColorAttr(leaf.geometry, tmpColor.setHSL(0.27 + rnd() * 0.05, 0.6, 0.35 + rnd() * 0.15)));
      leaf.position.set((rnd() - 0.5) * 8, rows * blockH + archR * 0.45 + 0.85 + (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 1.6);
      ivy.add(shadow(leaf));
    }
    for (let i = 0; i < 10; i++) {
      const sx = rnd() < 0.5 ? -1 : 1;
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25 + rnd() * 0.2, 0), M.leaves);
      leaf.geometry.setAttribute('color', solidColorAttr(leaf.geometry, tmpColor.setHSL(0.28, 0.55, 0.32 + rnd() * 0.1)));
      leaf.position.set(sx * pillarX + (rnd() - 0.5) * 1.6, rnd() * rows * blockH, 0.8);
      ivy.add(leaf);
    }
    ruin.add(ivy);
    // Estandarte colgado del arco.
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.2, 4, 10), bannerMat);
    banner.position.set(-1.4, rows * blockH - 1.2, 0.2);
    ruin.add(banner);
    group.add(ruin);

    // Colisiones de los pilares y la viga (en coordenadas de mundo).
    const cos = Math.cos(ry), sin = Math.sin(ry);
    for (const sx of [-1, 1]) {
      const lx = sx * pillarX;
      collision.addCylinder(rx + lx * cos, rz - lx * sin, 0.95, baseY, baseY + rows * blockH);
    }
    const topY = baseY + rows * blockH + archR * 0.45 + 0.8;
    for (let i = -3; i <= 3; i++) {
      const lx = i * 1.2;
      collision.addBoxCentered(rx + lx * cos, topY - 0.8, rz - lx * sin, 1.4, 0.8, 1.4);
    }

    // Muros derruidos, cofres y escalones para subir a la viga.
    const steps = [
      [-22, 19, 1.0], [-23.5, 15.5, 2.0], [-21.5, 12, 3.0], [-19.5, 14.8, 4.0], [-17.9, 17.2, 5.0],
    ];
    for (const [x, z, top] of steps) {
      const by = h(x, z) - 0.3;
      const hh = baseY + top - by;
      group.add(stoneBlock(1.8, hh, 1.8, x, by, z, rnd() * 0.3));
      collision.addBoxCentered(x, by, z, 1.8, hh, 1.8);
    }
    for (const [x, z] of [[-8, 17], [-9.5, 16.2]]) {
      const chest = shadow(new THREE.Mesh(new RoundedBoxGeometry(1.4, 1, 1, 2, 0.08), M.wood));
      chest.position.set(x, h(x, z) + 0.5, z);
      chest.rotation.y = rnd();
      group.add(chest);
      collision.addCylinder(x, z, 0.7, h(x, z), h(x, z) + 1);
    }
    group.add(stoneBlock(4, 1.4, 1.2, -26, h(-26, 8) - 0.2, 8, 0));
    collision.addBoxCentered(-26, h(-26, 8) - 0.2, 8, 4, 1.4, 1.2);
  }

  // ---------------- Pedestales con cristales ----------------
  const crystalLights = [];
  const pedestal = (x, z, height, scale = 1) => {
    const y0 = h(x, z) - 0.15;
    const p = new THREE.Group();
    p.position.set(x, y0, z);
    let y = 0;
    const layers = Math.max(2, Math.round(height / 0.9));
    for (let i = 0; i < layers; i++) {
      const w = (1.9 - i * 0.12) * scale;
      p.add(stoneBlock(w, 0.88, w, (rnd() - 0.5) * 0.08, y, (rnd() - 0.5) * 0.08, rnd() * 0.2));
      y += 0.88;
    }
    // Corona dorada.
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.85 * scale, 0.6 * scale, 0.4, 12), M.gold);
    cup.position.y = y + 0.2;
    p.add(shadow(cup));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18 * scale, 0.7 * scale, 5), M.gold);
      spike.position.set(Math.cos(a) * 0.75 * scale, y + 0.65, Math.sin(a) * 0.75 * scale);
      spike.rotation.z = -Math.cos(a) * 0.35;
      spike.rotation.x = Math.sin(a) * 0.35;
      p.add(spike);
    }
    const crystal = crystalMesh(M, 1.0 * scale);
    crystal.position.y = y + 1.2 * scale;
    p.add(crystal);
    group.add(p);
    collision.addCylinder(x, z, 1.0 * scale, y0, y0 + y + 0.4);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: '#c06bff', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.scale.setScalar(4 * scale);
    glow.position.y = y + 1.2 * scale;
    p.add(glow);

    const phase = rnd() * 10;
    updaters.push((t) => {
      crystal.rotation.y = t * 0.6 + phase;
      crystal.position.y = y + 1.2 * scale + Math.sin(t * 1.6 + phase) * 0.12;
      glow.material.opacity = 0.5 + Math.sin(t * 2.2 + phase) * 0.12;
    });
    crystalLights.push(new THREE.Vector3(x, y0 + y + 1.2, z));
  };
  pedestal(11.5, 11, 2.6, 1.05);
  pedestal(-9.5, -14, 1.8, 0.8);
  pedestal(8, -30, 1.8, 0.8);

  // Cristales sueltos en el césped.
  const crystalClusters = [[-15, 22], [16, 2], [-22, -6], [21, -22], [-9, -40], [26, 14], [-30, 8]];
  for (const [x, z] of crystalClusters) {
    const c = new THREE.Group();
    c.position.set(x, h(x, z), z);
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const s = 0.4 + rnd() * 0.5;
      const m = crystalMesh(M, s);
      m.position.set((rnd() - 0.5) * 0.9, s * 0.6, (rnd() - 0.5) * 0.9);
      m.rotation.set((rnd() - 0.5) * 0.6, rnd() * 3, (rnd() - 0.5) * 0.6);
      c.add(m);
    }
    group.add(c);
  }

  // Luces de cristal (limitadas por calidad).
  for (let i = 0; i < Math.min(crystalLights.length, quality.maxPointLights); i++) {
    const l = new THREE.PointLight('#b45cff', 18, 12, 2);
    l.position.copy(crystalLights[i]);
    group.add(l);
  }

  // ---------------- Braseros ----------------
  const flameMat = new THREE.MeshBasicMaterial({
    color: '#ffb02e', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const flameCore = new THREE.MeshBasicMaterial({ color: '#fff2a8', transparent: true, opacity: 0.95, depthWrite: false });
  const bowlGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.15, 0), new THREE.Vector2(0.55, 0.1), new THREE.Vector2(0.75, 0.45), new THREE.Vector2(0.8, 0.6), new THREE.Vector2(0.7, 0.6),
  ], 16);
  const braziers = [[-4.6, 8], [4.8, 4], [pathX(-10) - 4.1, -10], [pathX(-18) + 4.1, -18], [-14, 4], [pathX(-34) - 4.1, -34]];
  let braziersLit = 0;
  for (const [x, z] of braziers) {
    const y0 = h(x, z);
    const b = new THREE.Group();
    b.position.set(x, y0, z);
    b.add(stoneBlock(1.1, 0.9, 1.1, 0, -0.05, 0));
    const bowl = shadow(new THREE.Mesh(bowlGeo, M.gold), true, false);
    bowl.position.y = 0.85;
    b.add(bowl);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 8, 1, true), flameMat);
    flame.position.y = 1.9;
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), flameCore);
    core.position.y = 1.65;
    b.add(flame, core);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: '#ff9a2e', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.scale.setScalar(3);
    glow.position.y = 1.8;
    b.add(glow);
    let light = null;
    if (braziersLit < quality.maxPointLights) {
      light = new THREE.PointLight('#ff9a3c', 14, 10, 2);
      light.position.y = 2.2;
      b.add(light);
      braziersLit++;
    }
    group.add(b);
    collision.addCylinder(x, z, 0.75, y0, y0 + 1.5);
    const ph = rnd() * 20;
    updaters.push((t) => {
      const f = Math.sin(t * 13 + ph) * 0.5 + Math.sin(t * 7.3 + ph * 2) * 0.5;
      flame.scale.set(1 + f * 0.08, 1 + f * 0.18, 1 + f * 0.08);
      flame.rotation.y = t * 2 + ph;
      if (light) light.intensity = 13 + f * 3;
    });
  }

  // ---------------- Vallas de madera junto al camino ----------------
  {
    const parts = [];
    const segments = [];
    for (let z = 2; z > -48; z -= 2.6) {
      for (const side of [-1, 1]) {
        if ((Math.floor(z) + side * 3) % 4 === 0) continue; // huecos para salir del camino
        segments.push([side, z]);
      }
    }
    for (const [side, z] of segments) {
      const x0 = pathX(z) + side * 5.2;
      const z1 = z - 2.4;
      const x1 = pathX(z1) + side * 5.2;
      const y0 = h(x0, z);
      const y1 = h(x1, z1);
      for (const [px, pz, py] of [[x0, z, y0], [x1, z1, y1]]) {
        const post = new THREE.BoxGeometry(0.22, 1.25, 0.22);
        post.translate(px, py + 0.6, pz);
        parts.push(post);
      }
      const len = Math.hypot(x1 - x0, z1 - z);
      const ang = Math.atan2(x1 - x0, z1 - z);
      for (const ry of [0.45, 0.95]) {
        const rail = new THREE.BoxGeometry(0.12, 0.16, len);
        rail.rotateX(-Math.atan2(y1 - y0, len));
        rail.rotateY(ang);
        rail.translate((x0 + x1) / 2, (y0 + y1) / 2 + ry, (z + z1) / 2);
        parts.push(rail);
      }
      collision.addBox(Math.min(x0, x1) - 0.12, Math.min(y0, y1), z1, Math.max(x0, x1) + 0.12, Math.max(y0, y1) + 1.1, z);
    }
    if (parts.length) group.add(shadow(new THREE.Mesh(mergeGeometries(parts), M.wood)));
  }

  // ---------------- Árboles estilizados ----------------
  {
    const trunkParts = [];
    const canopyParts = [];
    const treeSpots = [];
    const fixed = [[-27, 21], [17, 18], [22, 8], [-26, -14], [24, -30], [-18, -32], [30, -8], [-33, -2], [12, 26], [-10, 30]];
    for (const p of fixed) treeSpots.push(p);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 36 + rnd() * 16;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x - pathX(z)) < 8 && z < 36) continue;
      if (islandSd(x, z) > -4) continue;
      treeSpots.push([x, z]);
    }
    for (const [x, z] of treeSpots) {
      const y0 = h(x, z);
      if (!Number.isFinite(y0)) continue;
      const s = 0.8 + rnd() * 0.6;
      const th = 3.2 * s;
      const trunk = new THREE.CylinderGeometry(0.22 * s, 0.42 * s, th, 8, 3);
      bendTrunk(trunk, th, (rnd() - 0.5) * 0.6);
      trunk.translate(x, y0 + th / 2 - 0.1, z);
      trunkParts.push(trunk);
      const blobs = 4 + Math.floor(rnd() * 3);
      for (let b = 0; b < blobs; b++) {
        const r = (0.9 + rnd() * 0.7) * s;
        const g = new THREE.IcosahedronGeometry(r, 1);
        jitter(g, r * 0.12, rnd);
        const ang = (b / blobs) * Math.PI * 2;
        const off = b === 0 ? 0 : 0.9 * s;
        g.translate(x + Math.cos(ang) * off, y0 + th + (b === 0 ? 0.9 * s : rnd() * 0.6 * s), z + Math.sin(ang) * off);
        tmpColor.setHSL(0.24 + rnd() * 0.07, 0.62, 0.32 + rnd() * 0.14);
        g.setAttribute('color', gradientColorAttr(g, tmpColor, y0 + th));
        canopyParts.push(g);
      }
      collision.addCylinder(x, z, 0.45 * s, y0 - 1, y0 + th);
    }
    group.add(shadow(new THREE.Mesh(mergeGeometries(trunkParts), M.trunk)));
    group.add(shadow(new THREE.Mesh(mergeGeometries(canopyParts), M.leaves)));
  }

  // ---------------- Rocas y arbustos ----------------
  {
    const rockParts = [];
    const bushParts = [];
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 10 + rnd() * 46;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x - pathX(z)) < 6 && z < 36) continue;
      if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 9) continue;
      if (islandSd(x, z) > -1.5) continue;
      const y0 = h(x, z);
      if (rnd() < 0.45) {
        const s = 0.5 + rnd() * 1.1;
        const g = new THREE.DodecahedronGeometry(s, 1);
        jitter(g, s * 0.18, rnd);
        g.scale(1, 0.7, 1);
        g.translate(x, y0 + s * 0.3, z);
        rockParts.push(g);
        if (s > 0.9) collision.addCylinder(x, z, s * 0.9, y0 - 1, y0 + s * 0.8);
      } else {
        const s = 0.6 + rnd() * 0.6;
        for (let b = 0; b < 3; b++) {
          const g = new THREE.IcosahedronGeometry(s * (0.7 + rnd() * 0.4), 1);
          jitter(g, s * 0.1, rnd);
          g.translate(x + (rnd() - 0.5) * s * 1.5, y0 + s * 0.5, z + (rnd() - 0.5) * s * 1.5);
          tmpColor.setHSL(0.27 + rnd() * 0.05, 0.55, 0.26 + rnd() * 0.1);
          g.setAttribute('color', gradientColorAttr(g, tmpColor, y0 + s));
          bushParts.push(g);
        }
      }
    }
    if (rockParts.length) group.add(shadow(new THREE.Mesh(mergeGeometries(rockParts), M.rock)));
    if (bushParts.length) group.add(shadow(new THREE.Mesh(mergeGeometries(bushParts), M.leaves)));
  }

  // ---------------- Flores ----------------
  {
    const count = quality.flowerCount;
    const petal = new THREE.SphereGeometry(0.09, 6, 4);
    petal.scale(1, 0.45, 1);
    const inst = new THREE.InstancedMesh(petal, new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: '#222222' }), count);
    const mtx = new THREE.Matrix4();
    const palette = ['#ffffff', '#fff6c8', '#ffd23f', '#ffb347', '#f7f0ff'].map((c) => new THREE.Color(c));
    let n = 0;
    for (let tries = 0; n < count && tries < count * 4; tries++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x - pathX(z)) < 3.8 && z < 36) continue;
      if (islandSd(x, z) > -1) continue;
      const s = 0.8 + rnd() * 1.2;
      mtx.makeScale(s, s, s).setPosition(x, h(x, z) + 0.12, z);
      inst.setMatrixAt(n, mtx);
      inst.setColorAt(n, palette[Math.floor(rnd() * palette.length)]);
      n++;
    }
    inst.count = n;
    group.add(inst);
  }

  // ---------------- Plataformas flotantes (circuito de saltos) ----------------
  const platforms = buildPlatforms(group, collision, M, rnd, updaters);

  return {
    group,
    platforms,
    update(t, dt) {
      for (let i = 0; i < updaters.length; i++) updaters[i](t, dt);
    },
  };
}

function buildPlatforms(group, collision, M, rnd, updaters) {
  const grassTop = new THREE.MeshStandardMaterial({ color: '#7cc444', roughness: 0.9 });
  const list = [];
  // Espiral ascendente a la derecha del camino, con un hueso en cada tramo alto.
  const course = [
    [14, -6, 1.2, 3.2], [18, -9, 2.4, 2.8], [21.5, -13, 3.6, 2.6], [22, -18.5, 4.8, 2.4],
    [19, -22.5, 6.0, 2.4], [14.5, -24, 7.2, 2.8], [10, -21, 8.4, 3.6],
  ];
  // Pasarela de islotes sobre el borde izquierdo.
  const left = [[-24, -18, 1.6, 2.6], [-29, -22, 2.8, 2.4], [-33, -27, 4.0, 2.4], [-36, -33, 5.0, 3.4]];

  const make = ([x, z, top, size], i) => {
    const thick = 1.1;
    const base = new THREE.Group();
    base.position.set(x, top, z);
    const body = new THREE.Mesh(new RoundedBoxGeometry(size, thick, size, 2, 0.2), M.stoneRough);
    body.position.y = -thick / 2 - 0.12;
    base.add(shadow(body));
    const grass = new THREE.Mesh(new RoundedBoxGeometry(size + 0.12, 0.3, size + 0.12, 2, 0.12), grassTop);
    grass.position.y = -0.1;
    base.add(shadow(grass, false, true));
    // Raíz de roca colgante.
    const root = new THREE.Mesh(new THREE.ConeGeometry(size * 0.45, size * 0.9, 7), M.rock);
    root.rotation.x = Math.PI;
    root.position.y = -thick - size * 0.45;
    base.add(shadow(root));
    group.add(base);
    const box = collision.addBoxCentered(x, top - thick - 0.2, z, size, thick + 0.2, size);
    list.push({ x, z, top, size, mesh: base, box });
    return list[list.length - 1];
  };
  course.forEach(make);
  left.forEach(make);

  // Plataforma móvil que sube y baja.
  const mover = make([10, 0, 2.5, 2.6], 99);
  const baseTop = mover.top;
  const boxH = mover.box.maxY - mover.box.minY;
  updaters.push((t) => {
    const y = baseTop + Math.sin(t * 0.9) * 1.6;
    mover.mesh.position.y = y;
    mover.box.maxY = y;
    mover.box.minY = y - boxH;
    mover.top = y;
  });
  return list;
}

// ---------------- Utilidades ----------------
function crystalMesh(M, s) {
  const g = new THREE.OctahedronGeometry(0.6 * s, 0);
  g.scale(0.75, 1.8, 0.75);
  return new THREE.Mesh(g, M.crystal);
}

function solidColorAttr(geo, color) {
  const arr = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) color.toArray(arr, i);
  return new THREE.BufferAttribute(arr, 3);
}

/** Color con degradado vertical (más claro arriba) para copas y arbustos. */
function gradientColorAttr(geo, color, refY) {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = THREE.MathUtils.clamp((pos.getY(i) - refY) * 0.35 + 0.85, 0.55, 1.35);
    c.copy(color).multiplyScalar(k);
    c.toArray(arr, i * 3);
  }
  return new THREE.BufferAttribute(arr, 3);
}

function jitter(geo, amount, rnd) {
  // Desplaza vértices compartidos de forma coherente (por posición) para no abrir grietas.
  const pos = geo.attributes.position;
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let off = map.get(key);
    if (!off) {
      off = [(rnd() - 0.5) * amount, (rnd() - 0.5) * amount, (rnd() - 0.5) * amount];
      map.set(key, off);
    }
    pos.setXYZ(i, pos.getX(i) + off[0], pos.getY(i) + off[1], pos.getZ(i) + off[2]);
  }
  geo.computeVertexNormals();
}

function bendTrunk(geo, height, bend) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + height / 2) / height;
    pos.setX(i, pos.getX(i) + Math.sin(t * Math.PI * 0.5) * bend);
  }
  geo.computeVertexNormals();
}
