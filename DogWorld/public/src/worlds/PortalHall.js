// Plaza de los Portales delante del castillo: 6 portales temáticos (como en la
// ilustración de referencia), custodiados por Isabel, la bruja guía.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLDS, PORTAL_PLAZA, isUnlocked } from './WorldData.js';
import { makePortalMaterial, makeTitleSprite, StatusSprite, archShape } from './PortalFX.js';
import { Isabel } from './Isabel.js';
import { mergeStatic } from '../world/mergeStatic.js';
import { terrainHeight } from '../world/Terrain.js';
import { getMaterials, shadow } from '../world/Materials.js';
import { mulberry32, glowTexture, drawPaw } from '../world/Textures.js';

const OPEN_W = 3.2;
const OPEN_H = 4.6;
const TRIGGER_DIST = 1.9;
const TRIGGER_R = 1.7;

export class PortalHall {
  constructor(scene, collision, fx) {
    this.fx = fx;
    this.group = new THREE.Group();
    this.group.name = 'PortalHall';
    scene.add(this.group);
    this.portals = [];
    this.rnd = mulberry32(2024);

    this.buildPlaza(collision);
    for (const w of WORLDS) this.portals.push(this.buildPortal(w, collision));

    // Isabel junto al pedestal central.
    this.isabel = new Isabel();
    const ix = PORTAL_PLAZA.x + 3.4;
    const iz = PORTAL_PLAZA.z + 0.8;
    this.isabel.root.position.set(ix, this.plazaTop, iz);
    this.group.add(this.isabel.root);
    collision.addCylinder(ix, iz, 0.6, this.plazaTop, this.plazaTop + 2.4);
    this.isabelPos = new THREE.Vector3(ix, this.plazaTop, iz);
    this.isabelLabel = new StatusSprite(2.8);
    this.isabelLabel.set('Isabel ✨', 'rgba(91,42,158,0.85)');
    this.isabelLabel.sprite.position.set(ix, this.plazaTop + 3.1, iz);
    this.group.add(this.isabelLabel.sprite);
    this.time = 0;
  }

  // ------------------------------------------------------------- plaza
  buildPlaza(collision) {
    const M = getMaterials();
    const { x, z } = PORTAL_PLAZA;
    const y0 = terrainHeight(x, z);
    const top = y0 + 0.18;
    this.plazaTop = top;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 10.8, 0.6, 48), M.stoneRough);
    floor.position.set(x, top - 0.3, z);
    floor.receiveShadow = true;
    this.group.add(floor);
    collision.addCylinder(x, z, 10.5, y0 - 1, top);
    // Alfombra circular morada con aro dorado (como en la ilustración).
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#6b33b8', roughness: 0.9 }));
    rug.position.set(x, top + 0.02, z);
    rug.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.5, 3.75, 48).rotateX(-Math.PI / 2), M.gold);
    ring.position.set(x, top + 0.03, z);
    this.group.add(rug, ring);
    // Pedestal central con bola de cristal.
    const ped = new THREE.Group();
    ped.position.set(x, top, z);
    for (const [w, h, yy] of [[1.4, 0.3, 0], [1.0, 0.9, 0.3], [1.3, 0.25, 1.2]]) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, w, 2, 0.06), M.stoneRough);
      b.position.y = yy + h / 2;
      ped.add(shadow(b));
    }
    this.orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), new THREE.MeshPhysicalMaterial({
      color: '#d9c2ff', emissive: '#7a3cc8', emissiveIntensity: 0.9, roughness: 0.05, transmission: 0.4, transparent: true, opacity: 0.85,
    }));
    this.orb.position.y = 1.9;
    ped.add(this.orb);
    this.group.add(ped);
    collision.addCylinder(x, z, 0.8, top, top + 1.45);
    // Halo mágico (sprite) en lugar de una luz puntual: mucho más barato en móviles.
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: '#b47cff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.setScalar(3.2);
    halo.position.set(x, top + 1.9, z);
    this.group.add(halo);
  }

  // ------------------------------------------------------------ portales
  buildPortal(world, collision) {
    const { x, z, yaw } = world.portal;
    const y = terrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    this.group.add(g);

    const rounded = world.id !== 'factory' && world.id !== 'desert';
    const mat = makePortalMaterial(world.id, world.glow[0], world.glow[1]);
    const opening = new THREE.Mesh(archShape(OPEN_W, OPEN_H, rounded), mat);
    opening.position.set(0, 0.35, 0);
    // Marco temático en un subgrupo que se fusiona por material (pocas draw calls).
    const frame = new THREE.Group();
    g.add(frame);
    FRAMES[world.id](frame, this.rnd);
    mergeStatic(frame);
    g.add(opening);

    // Brillo en el suelo delante del portal (zona de activación).
    const pad = new THREE.Mesh(new THREE.CircleGeometry(TRIGGER_R, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
      color: world.glow[0], transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    pad.position.set(0, 0.42, TRIGGER_DIST);
    g.add(pad);

    const title = makeTitleSprite(world.name, `Portal de ${world.title}`, world.color);
    title.position.set(0, 7.0, 0.4);
    g.add(title);
    const status = new StatusSprite(3.2);
    status.sprite.position.set(0, 5.95, 0.6);
    g.add(status.sprite);

    // Colisión de los postes laterales.
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    for (const sx of [-1, 1]) {
      const lx = sx * (OPEN_W / 2 + 0.55);
      collision.addCylinder(x + lx * cos, z - lx * sin, 0.6, y - 1, y + OPEN_H + 1);
    }
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    return {
      world, group: g, mat, pad, status, locked: true,
      trigger: new THREE.Vector3(x + fwd.x * TRIGGER_DIST, y, z + fwd.z * TRIGGER_DIST),
      center: new THREE.Vector3(x, y + 2.4, z),
    };
  }

  setProgress(progress) {
    for (const p of this.portals) {
      p.locked = !isUnlocked(p.world.id, progress);
      p.mat.uniforms.locked.value = p.locked ? 1 : 0;
      p.pad.visible = !p.locked;
      if (p.locked) p.status.set('🔒 Sellado');
      else if (progress.has(p.world.id)) p.status.set('★ Completado', 'rgba(170,120,10,0.85)');
      else p.status.set(null);
    }
  }

  /** Texto de estado sobre un portal (p. ej. cuenta atrás compartida). */
  setStatus(worldId, text, progress) {
    const p = this.portals.find((q) => q.world.id === worldId);
    if (!p) return;
    if (text) p.status.set(text, 'rgba(30,14,58,0.85)');
    else this.setProgress(progress);
  }

  /** Portal en cuya zona de activación está el jugador (o null). */
  portalAt(pos) {
    for (const p of this.portals) {
      if (Math.hypot(pos.x - p.trigger.x, pos.z - p.trigger.z) < TRIGGER_R && Math.abs(pos.y - p.trigger.y) < 2.5) return p;
    }
    return null;
  }

  nearIsabel(pos) {
    return Math.hypot(pos.x - this.isabelPos.x, pos.z - this.isabelPos.z) < 3.4;
  }

  update(dt, playerPos, chargingId) {
    this.time += dt;
    this.orb.rotation.y += dt * 0.6;
    this.isabel.update(dt, playerPos && this.isabelPos.distanceTo(playerPos) < 14 ? playerPos : null, this.fx);
    for (const p of this.portals) {
      const target = p.world.id === chargingId ? 1 : 0;
      p.mat.uniforms.charge.value += (target - p.mat.uniforms.charge.value) * Math.min(1, dt * 4);
      if (!p.locked) p.pad.material.opacity = 0.25 + Math.sin(this.time * 3 + p.center.x) * 0.1 + target * 0.3;
    }
    // Chispas del portal que se está cargando.
    if (chargingId && this.fx) {
      const p = this.portals.find((q) => q.world.id === chargingId);
      this._sparkT = (this._sparkT ?? 0) - dt;
      if (p && this._sparkT <= 0) {
        this._sparkT = 0.08;
        this.fx.emit('sparkle', p.center.x, p.center.y, p.center.z, null, 0.3);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Marcos de portal por tema (coordenadas locales: abertura centrada, mirando +z)
// ---------------------------------------------------------------------------
const R = OPEN_W / 2;
const archCenterY = OPEN_H - R + 0.35;

function steps(g, mat, n = 2, w = 4.6) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new RoundedBoxGeometry(w - i * 0.5, 0.2, 1.6 - i * 0.4, 2, 0.05), mat);
    s.position.set(0, 0.1 + i * 0.2, 0.2 + (n - i) * 0.15);
    g.add(shadow(s));
  }
}

function arcPoints(radius, n, extraLegs = true) {
  const pts = [];
  if (extraLegs) for (let i = 0; i <= 4; i++) pts.push([-radius, 0.35 + (i / 4) * (archCenterY - 0.35)]);
  for (let i = 1; i < n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push([Math.cos(a) * radius, archCenterY + Math.sin(a) * radius]);
  }
  if (extraLegs) for (let i = 4; i >= 0; i--) pts.push([radius, 0.35 + (i / 4) * (archCenterY - 0.35)]);
  return pts;
}

const FRAMES = {
  park(g, rnd) {
    const M = getMaterials();
    const stone = new THREE.MeshStandardMaterial({ color: '#b9b4c2', roughness: 0.9, bumpMap: M.rock.bumpMap, bumpScale: 1 });
    const blocks = [];
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const b = new RoundedBoxGeometry(1.0 + rnd() * 0.15, 0.82, 1.0, 2, 0.08);
        b.translate(sx * (R + 0.5), 0.35 + 0.42 + i * 0.84, 0);
        blocks.push(b);
      }
    }
    for (let i = 0; i < 9; i++) {
      const a = Math.PI - ((i + 0.5) / 9) * Math.PI;
      const b = new RoundedBoxGeometry(0.75, 1.0, 1.0, 2, 0.08);
      b.rotateZ(a - Math.PI / 2);
      b.translate(Math.cos(a) * (R + 0.5), archCenterY + Math.sin(a) * (R + 0.5), 0);
      blocks.push(b);
    }
    g.add(shadow(new THREE.Mesh(mergeGeometries(blocks), stone)));
    // Clave del arco con huella dorada.
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b9b4c2'; ctx.fillRect(0, 0, 128, 128);
    drawPaw(ctx, 64, 60, 0.85, '#d9a52b');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const key = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.1, 1.0, 2, 0.08), stone);
    key.position.set(0, archCenterY + R + 0.55, 0.02);
    g.add(shadow(key));
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    decal.position.set(0, archCenterY + R + 0.55, 0.53);
    g.add(decal);
    steps(g, stone);
  },

  forest(g, rnd) {
    const bark = new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.95 });
    const leaf = new THREE.MeshStandardMaterial({ color: '#4caf3a', roughness: 0.8 });
    const base = arcPoints(R + 0.35, 14);
    for (let s = 0; s < 3; s++) {
      const pts = base.map(([px, py], i) => new THREE.Vector3(
        px + Math.sin(i * 1.3 + s * 2.1) * 0.28, py + Math.cos(i * 0.9 + s) * 0.12, Math.sin(i * 1.7 + s * 1.4) * 0.3));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.2 - s * 0.03, 8), bark);
      g.add(shadow(tube));
    }
    // Raíces en la base y hojas.
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const root = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.6, 6), bark);
        root.position.set(sx * (R + 0.5 + i * 0.35), 0.5, (rnd() - 0.5) * 0.8);
        root.rotation.z = sx * (1.1 + i * 0.2);
        g.add(shadow(root));
      }
    }
    for (let i = 0; i < 18; i++) {
      const p = base[Math.floor(rnd() * base.length)];
      const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25 + rnd() * 0.2, 0), leaf);
      l.position.set(p[0] * 1.1, p[1] + 0.2, (rnd() - 0.5) * 0.6);
      g.add(l);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#7dff6a', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(6, 7, 1);
    glow.position.set(0, 2.6, -0.2);
    g.add(glow);
  },

  ice(g, rnd) {
    const ice = new THREE.MeshPhysicalMaterial({
      color: '#cfefff', emissive: '#4fb8ff', emissiveIntensity: 0.35, roughness: 0.1, transparent: true, opacity: 0.85, clearcoat: 1,
    });
    const shards = [];
    for (const [px, py] of arcPoints(R + 0.45, 12)) {
      for (let k = 0; k < 2; k++) {
        const h = 0.9 + rnd() * 1.4;
        const geo = new THREE.ConeGeometry(0.25 + rnd() * 0.25, h, 5);
        const out = Math.atan2(py - archCenterY * 0.6, px);
        geo.rotateZ(out - Math.PI / 2 + (rnd() - 0.5) * 0.6);
        geo.translate(px + (rnd() - 0.5) * 0.3, py, (rnd() - 0.5) * 0.6);
        shards.push(geo);
      }
    }
    // Bloques de hielo en la base.
    for (const sx of [-1, 1]) {
      const geo = new THREE.OctahedronGeometry(0.9, 0);
      geo.scale(0.8, 1.5, 0.8);
      geo.translate(sx * (R + 0.8), 0.8, 0.2);
      shards.push(geo);
    }
    g.add(shadow(new THREE.Mesh(mergeGeometries(shards.map((s) => s.index ? s.toNonIndexed() : s)), ice)));
    steps(g, new THREE.MeshStandardMaterial({ color: '#e8f6ff', roughness: 0.5 }), 1);
  },

  factory(g) {
    const metal = new THREE.MeshStandardMaterial({ color: '#4a4e57', metalness: 0.7, roughness: 0.45 });
    const rivet = new THREE.MeshStandardMaterial({ color: '#9aa0aa', metalness: 0.9, roughness: 0.3 });
    const parts = [];
    const add = (w, h, d, x, y) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, 0); parts.push(b); };
    add(0.8, OPEN_H + 1.0, 1.0, -(R + 0.4), (OPEN_H + 1.0) / 2);
    add(0.8, OPEN_H + 1.0, 1.0, R + 0.4, (OPEN_H + 1.0) / 2);
    add(OPEN_W + 1.6, 0.8, 1.0, 0, OPEN_H + 0.75);
    add(OPEN_W + 1.8, 0.4, 1.4, 0, 0.2);
    g.add(shadow(new THREE.Mesh(mergeGeometries(parts), metal)));
    const rv = [];
    for (let i = 0; i < 7; i++) {
      for (const sx of [-1, 1]) {
        const s = new THREE.SphereGeometry(0.08, 8, 6);
        s.translate(sx * (R + 0.4), 0.6 + i * 0.75, 0.52);
        rv.push(s);
      }
    }
    g.add(new THREE.Mesh(mergeGeometries(rv), rivet));
    // Tubería con vapor y borde incandescente.
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3, 12), metal);
    pipe.position.set(-(R + 1.15), 1.5, 0.2);
    g.add(shadow(pipe));
    const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.18, 8, 12, Math.PI / 2), metal);
    elbow.position.set(-(R + 0.75), 3.0, 0.2);
    elbow.rotation.z = Math.PI / 2;
    g.add(elbow);
    const glowEdge = new THREE.Mesh(new THREE.BoxGeometry(OPEN_W + 0.1, OPEN_H + 0.1, 0.05), new THREE.MeshBasicMaterial({ color: '#ff8a1f', transparent: true, opacity: 0.6 }));
    glowEdge.position.set(0, 0.35 + OPEN_H / 2, -0.05);
    g.add(glowEdge);
    const steam = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#e6e6e6', transparent: true, opacity: 0.5, depthWrite: false }));
    steam.scale.setScalar(1.6);
    steam.position.set(-(R + 1.3), 3.4, 0.4);
    g.add(steam);
  },

  desert(g) {
    const sand = new THREE.MeshStandardMaterial({ color: '#d9b06a', roughness: 0.9 });
    const sandDark = new THREE.MeshStandardMaterial({ color: '#b98a44', roughness: 0.9 });
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new RoundedBoxGeometry(0.95, OPEN_H + 0.6, 0.95, 2, 0.06), sand);
      post.position.set(sx * (R + 0.48), (OPEN_H + 0.6) / 2 + 0.25, 0);
      g.add(shadow(post));
      for (let i = 0; i < 3; i++) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.0), sandDark);
        band.position.set(sx * (R + 0.48), 1.0 + i * 1.4, 0);
        g.add(band);
      }
    }
    const lintel = new THREE.Mesh(new RoundedBoxGeometry(OPEN_W + 2.4, 0.9, 1.2, 2, 0.06), sand);
    lintel.position.set(0, OPEN_H + 0.95, 0);
    g.add(shadow(lintel));
    const scarab = new THREE.Mesh(new THREE.CircleGeometry(0.32, 6), getMaterials().gold);
    scarab.position.set(0, OPEN_H + 0.95, 0.61);
    g.add(scarab);
    steps(g, sand, 3, 5.2);
  },

  fortress(g, rnd) {
    const dark = new THREE.MeshStandardMaterial({ color: '#3a3346', roughness: 0.85 });
    const parts = [];
    for (const sx of [-1, 1]) {
      const p = new RoundedBoxGeometry(1.0, archCenterY + 0.2, 1.1, 2, 0.06);
      p.translate(sx * (R + 0.5), (archCenterY + 0.2) / 2, 0);
      parts.push(p);
    }
    const arch = new THREE.TorusGeometry(R + 0.5, 0.5, 8, 24, Math.PI);
    arch.translate(0, archCenterY, 0);
    parts.push(arch);
    g.add(shadow(new THREE.Mesh(mergeGeometries(parts.map((q) => (q.index ? q.toNonIndexed() : q))), dark)));
    const spikes = [];
    for (const [px, py] of arcPoints(R + 1.0, 10)) {
      const c = new THREE.ConeGeometry(0.18, 0.8 + rnd() * 0.5, 6);
      c.rotateZ(Math.atan2(py - archCenterY * 0.55, px) - Math.PI / 2);
      c.translate(px, py, 0);
      spikes.push(c);
    }
    g.add(shadow(new THREE.Mesh(mergeGeometries(spikes), dark)));
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), getMaterials().crystal);
    crystal.scale.set(0.8, 1.5, 0.8);
    crystal.position.set(0, archCenterY + R + 1.3, 0.2);
    g.add(crystal);
    steps(g, dark, 2);
  },
};
