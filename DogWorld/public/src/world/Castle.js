// Castillo de fondo: torres con tejados cónicos morados, murallas almenadas,
// estandartes con huella, portón iluminado, puente de piedra y cascadas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterials, scaleBoxUVs, scaleUVs, shadow } from './Materials.js';
import { applyClothWind } from './Wind.js';
import { waterfallTexture, glowTexture } from './Textures.js';
import { CASTLE_ISLAND, BRIDGE, bridgeHeight, terrainHeight } from './Terrain.js';

const BASE_Y = CASTLE_ISLAND.height;

export function buildCastle(collision, quality) {
  const M = getMaterials();
  const group = new THREE.Group();
  group.name = 'Castle';
  const animated = []; // { update(t) }

  const bannerMat = applyClothWind(M.banner.clone(), { mode: 'banner', amplitude: 0.12 });
  const flagMat = applyClothWind(M.flag.clone(), { mode: 'flag', amplitude: 0.35 });

  // ---------------- Torres ----------------
  const tower = (x, z, r, h, roofH, opts = {}) => {
    const t = new THREE.Group();
    t.position.set(x, BASE_Y, z);

    const bodyGeo = scaleUVs(new THREE.CylinderGeometry(r * 0.96, r * 1.04, h, 24, 1, true), (2 * Math.PI * r) / 4, h / 4);
    t.add(shadow(new THREE.Mesh(bodyGeo, M.stone)));
    t.children[0].position.y = h / 2;

    // Cornisa + almenas.
    const corbel = new THREE.Mesh(scaleUVs(new THREE.CylinderGeometry(r * 1.18, r * 0.98, 1.2, 24), 6, 0.3), M.stone);
    corbel.position.y = h + 0.4;
    t.add(shadow(corbel));
    const merlonCount = Math.max(8, Math.round(r * 3));
    const merlons = [];
    for (let i = 0; i < merlonCount; i++) {
      const a = (i / merlonCount) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.7, 0.9, 0.5);
      g.rotateY(-a);
      g.translate(Math.cos(a) * r * 1.1, h + 1.45, Math.sin(a) * r * 1.1);
      merlons.push(g);
    }
    t.add(shadow(new THREE.Mesh(mergeGeometries(merlons), M.stone)));

    // Tejado cónico con remate dorado.
    if (roofH > 0) {
      const roof = new THREE.Mesh(scaleUVs(new THREE.ConeGeometry(r * 1.3, roofH, 24, 4), 3, 3), M.roof);
      roof.position.y = h + 1.0 + roofH / 2;
      t.add(shadow(roof));
      const trim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.28, 0.16, 6, 28), M.gold);
      trim.rotation.x = Math.PI / 2;
      trim.position.y = h + 1.05;
      t.add(trim);
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.6, 8), M.gold);
      finial.position.y = h + 1 + roofH + 0.7;
      t.add(finial);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), M.gold);
      orb.position.y = h + 1 + roofH + 0.05;
      t.add(orb);

      if (opts.flag !== false) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), M.gold);
        pole.position.y = h + 1 + roofH + 2.3;
        t.add(pole);
        const flagGeo = new THREE.PlaneGeometry(2.6, 1.2, 10, 3);
        flagGeo.translate(1.3, 0, 0);
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.y = h + 1 + roofH + 3.2;
        flag.rotation.y = opts.flagDir ?? 0.3;
        t.add(flag);
      }
    }

    // Ventanas iluminadas.
    const winCount = opts.windows ?? 3;
    for (let i = 0; i < winCount; i++) {
      const a = Math.PI / 2 + (i - (winCount - 1) / 2) * 0.55;
      const wy = h * (0.45 + 0.4 * ((i % 2) * 0.5 + 0.5));
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.3), i === 1 && opts.blue ? M.windowBlue : M.window);
      win.position.set(Math.cos(a) * r * 1.0, wy, Math.sin(a) * r * 1.0);
      win.lookAt(win.position.x * 2, wy, win.position.z * 2);
      t.add(win);
    }

    // Estandarte colgando hacia el jugador (+z).
    if (opts.banner) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.95, r * 1.9, 4, 8), bannerMat);
      b.position.set(0, h * 0.62, r * 1.02 + 0.05);
      t.add(b);
    }

    group.add(t);
    collision.addCylinder(x, z, r * 1.05, BASE_Y - 2, BASE_Y + h);
    return t;
  };

  // ---------------- Muros ----------------
  const wall = (cx, cz, w, h, d, rotY = 0) => {
    const g = scaleBoxUVs(new THREE.BoxGeometry(w, h, d), w, h, d);
    const m = shadow(new THREE.Mesh(g, M.stone));
    m.position.set(cx, BASE_Y + h / 2, cz);
    m.rotation.y = rotY;
    group.add(m);
    // Almenas.
    const merlons = [];
    const n = Math.floor(w / 1.6);
    for (let i = 0; i < n; i++) {
      const mg = new THREE.BoxGeometry(0.9, 0.9, d + 0.1);
      mg.translate(-w / 2 + 0.8 + i * 1.6, h / 2 + 0.45, 0);
      merlons.push(mg);
    }
    if (merlons.length) {
      const mm = shadow(new THREE.Mesh(mergeGeometries(merlons), M.stone));
      m.add(mm);
    }
    if (rotY === 0) collision.addBoxCentered(cx, BASE_Y - 2, cz, w, h + 2, d);
    else collision.addBoxCentered(cx, BASE_Y - 2, cz, d, h + 2, w);
    return m;
  };

  const frontZ = -104;
  // Muralla frontal en dos tramos + portón.
  wall(-15.5, frontZ, 17, 9, 3);
  wall(15.5, frontZ, 17, 9, 3);
  // Muros laterales.
  wall(-28, -114, 20, 8, 3, Math.PI / 2);
  wall(28, -114, 20, 8, 3, Math.PI / 2);
  // Torreón principal (keep).
  wall(0, -124, 26, 18, 14);

  // Portón: arco de piedra + puerta de madera iluminada por detrás.
  const gate = new THREE.Group();
  gate.position.set(0, BASE_Y, frontZ + 1.6);
  const archGeo = new THREE.TorusGeometry(3.2, 0.7, 10, 24, Math.PI);
  const arch = shadow(new THREE.Mesh(archGeo, M.stone));
  arch.position.y = 5;
  gate.add(arch);
  for (const sx of [-1, 1]) {
    const jamb = shadow(new THREE.Mesh(scaleBoxUVs(new THREE.BoxGeometry(1.4, 5, 1.6), 1.4, 5, 1.6), M.stone));
    jamb.position.set(sx * 3.2, 2.5, 0);
    gate.add(jamb);
  }
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-2.6, 0);
  doorShape.lineTo(2.6, 0);
  doorShape.lineTo(2.6, 5);
  doorShape.absarc(0, 5, 2.6, 0, Math.PI, false);
  doorShape.lineTo(-2.6, 0);
  const doorGeo = new THREE.ShapeGeometry(doorShape, 12);
  const door = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({
    map: M.wood.map, color: '#a06a3a', emissive: '#ff8a1f', emissiveIntensity: 0.35, roughness: 0.7,
  }));
  door.position.z = -0.3;
  gate.add(door);
  // Rejas doradas.
  const bars = [];
  for (let i = -2; i <= 2; i++) {
    const bg = new THREE.BoxGeometry(0.12, 7.2, 0.12);
    bg.translate(i * 1.0, 3.6, -0.15);
    bars.push(bg);
  }
  for (let j = 1; j <= 3; j++) {
    const bg = new THREE.BoxGeometry(5.2, 0.12, 0.12);
    bg.translate(0, j * 1.8, -0.15);
    bars.push(bg);
  }
  const barsMesh = new THREE.Mesh(mergeGeometries(bars), M.gold);
  gate.add(barsMesh);
  // Escudo sobre el arco.
  const crest = new THREE.Mesh(new THREE.CircleGeometry(0.9, 6), M.gold);
  crest.position.set(0, 9.2, 0.75);
  gate.add(crest);
  group.add(gate);
  // Portón cerrado: se abre cuando el equipo recupera la Corona (el castillo "despierta").
  const gateCollider = collision.addBoxCentered(0, BASE_Y - 2, frontZ, 6, 11, 3);
  let gateOpen = false;

  const gateLight = new THREE.PointLight('#ffa040', 30, 18, 2);
  gateLight.position.set(0, BASE_Y + 3, frontZ + 4);
  group.add(gateLight);

  // Torres.
  tower(-7.5, frontZ + 0.5, 3, 15, 8, { banner: true, flagDir: 0.4 });
  tower(7.5, frontZ + 0.5, 3, 15, 8, { banner: true, flagDir: -0.4 });
  tower(-26, frontZ, 4, 13, 9, { banner: true });
  tower(26, frontZ, 4, 13, 9, { banner: true, flagDir: 2.6 });
  tower(-28, -124, 3.4, 18, 9);
  tower(28, -124, 3.4, 18, 9, { flagDir: 2.8 });
  tower(-12, -117, 3.6, 24, 11, { banner: true, blue: true });
  tower(12, -117, 3.6, 24, 11, { banner: true, blue: true, flagDir: 2.9 });
  tower(0, -128, 5, 30, 14, { windows: 5, blue: true, banner: true });
  tower(-19, -138, 3, 22, 9);
  tower(19, -138, 3, 22, 9);
  tower(-6, -140, 2.6, 34, 10, { windows: 2 });
  tower(7, -141, 2.4, 28, 9, { windows: 2 });

  // Estandartes en la muralla frontal.
  for (const x of [-18, -12, 12, 18]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.4, 4, 8), bannerMat);
    b.position.set(x, BASE_Y + 5.2, frontZ + 1.56);
    group.add(b);
  }
  // Estandartes grandes en el torreón.
  for (const x of [-7, 7]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 6.4, 4, 8), bannerMat);
    b.position.set(x, BASE_Y + 11, -116.9);
    group.add(b);
  }
  const keepGlow = new THREE.Mesh(new THREE.PlaneGeometry(4, 6), M.windowBlue);
  keepGlow.position.set(0, BASE_Y + 12, -116.95);
  group.add(keepGlow);

  // ---------------- Puente de piedra ----------------
  buildBridge(group, collision, M);

  // ---------------- Cascadas ----------------
  const water = buildWaterfalls(group, quality);
  animated.push(water);

  return {
    group,
    update(t) {
      for (let i = 0; i < animated.length; i++) animated[i].update(t);
      if (gateOpen && barsMesh.position.y < 7) barsMesh.position.y += 0.05;
    },
    /** El castillo despierta: rejas arriba, puerta abierta y luz dorada. */
    openGate() {
      if (gateOpen) return;
      gateOpen = true;
      door.visible = false;
      gateCollider.maxY = -1000;
      gateCollider.minY = -1001;
      gateLight.color.set('#ffd84a');
      gateLight.intensity = 60;
    },
  };
}

function buildBridge(group, collision, M) {
  const segLen = 2;
  const deckParts = [];
  const parapetParts = [];
  const zStart = BRIDGE.rampStartZ + 2;
  const zEnd = BRIDGE.endZ;
  const width = BRIDGE.maxX - BRIDGE.minX;

  for (let z = zStart; z > zEnd; z -= segLen) {
    const z0 = z;
    const z1 = z - segLen;
    const h0 = bridgeHeight(0, z0);
    const h1 = bridgeHeight(0, z1);
    const len = Math.hypot(segLen, h1 - h0);
    const angle = Math.atan2(h1 - h0, segLen);
    const cz = (z0 + z1) / 2;
    const cy = (h0 + h1) / 2;

    const deck = scaleBoxUVs(new THREE.BoxGeometry(width, 0.8, len + 0.05), width, 0.8, len, 3);
    deck.rotateX(angle);
    deck.translate(0, cy - 0.4, cz);
    deckParts.push(deck);

    for (const sx of [-1, 1]) {
      const p = scaleBoxUVs(new THREE.BoxGeometry(0.6, 1.0, len + 0.05), 0.6, 1, len, 3);
      p.rotateX(angle);
      p.translate(sx * (width / 2 + 0.3), cy + 0.5, cz);
      parapetParts.push(p);
      collision.addBox(sx * (width / 2) - (sx < 0 ? 0.6 : 0), Math.min(h0, h1) - 1, z1, sx * (width / 2) + (sx > 0 ? 0.6 : 0), Math.max(h0, h1) + 1, z0);
    }
  }
  group.add(shadow(new THREE.Mesh(mergeGeometries(deckParts), M.stone)));
  group.add(shadow(new THREE.Mesh(mergeGeometries(parapetParts), M.stone)));

  // Arco inferior y pilares hacia el abismo.
  const archZ = (BRIDGE.rampStartZ + BRIDGE.rampEndZ) / 2 - 4;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(5, 1.2, 10, 24, Math.PI), M.stone);
  arch.rotation.y = Math.PI / 2;
  arch.position.set(0, bridgeHeight(0, archZ) - 5.5, archZ);
  arch.scale.set(1, 1.2, 1);
  group.add(shadow(arch));
  for (const z of [archZ - 5, archZ + 5]) {
    const pillar = new THREE.Mesh(scaleUVs(new THREE.CylinderGeometry(1.2, 0.6, 14, 10), 2, 3), M.stone);
    pillar.position.set(0, bridgeHeight(0, z) - 12, z);
    group.add(shadow(pillar));
  }

  collision.addSurface(BRIDGE.minX, BRIDGE.maxX, BRIDGE.endZ, BRIDGE.rampStartZ + 2, bridgeHeight);
}

function buildWaterfalls(group, quality) {
  const tex = waterfallTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, opacity: 0.9, emissive: '#bfe8ff', emissiveIntensity: 0.35,
    roughness: 0.2, depthWrite: false, side: THREE.DoubleSide,
  });
  const mistMat = new THREE.SpriteMaterial({ map: glowTexture(), color: '#e8f8ff', transparent: true, opacity: 0.55, depthWrite: false });

  const falls = [
    { x: -13, w: 4.5, h: 40 },
    { x: 15, w: 3.5, h: 34 },
    { x: -32, w: 3, h: 30 },
  ];
  for (const f of falls) {
    // Buscar el borde frontal de la meseta del castillo para esta x.
    let edgeZ = -76;
    for (let z = -70; z > -110; z -= 0.25) {
      if (terrainHeight(f.x, z) > -Infinity) { edgeZ = z; break; }
    }
    const geo = new THREE.PlaneGeometry(f.w, f.h, 1, 12);
    // Curvar ligeramente hacia fuera en la parte superior.
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = (pos.getY(i) + f.h / 2) / f.h; // 0 abajo, 1 arriba
      pos.setZ(i, Math.pow(v, 6) * 1.5 + (1 - v) * 1.2);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(f.x, CASTLE_ISLAND.height - f.h / 2 + 0.2, edgeZ + 0.6);
    group.add(mesh);

    if (quality.particles) {
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Sprite(mistMat);
        s.position.set(f.x + (i - 1) * 1.2, CASTLE_ISLAND.height - f.h * (0.55 + i * 0.15), edgeZ + 2);
        s.scale.setScalar(f.w * 2.2);
        group.add(s);
      }
    }
    // Brillo de agua en lo alto.
    const top = new THREE.Sprite(mistMat);
    top.position.set(f.x, CASTLE_ISLAND.height + 0.3, edgeZ + 1);
    top.scale.set(f.w * 1.6, 1.4, 1);
    group.add(top);
  }

  return {
    update(t) {
      tex.offset.y = (t * 0.9) % 1;
    },
  };
}
