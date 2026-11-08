// Mundo temático: islas flotantes del recorrido, decorado del tema, objetivos
// cooperativos (muros, agua, montículos, critters, caminos ocultos, interruptores
// y placas), reliquia final y portal de vuelta al Hub.
//
// El estado de las misiones lo decide el servidor (o el propio cliente en modo
// local); aquí solo se representa, se colisiona y se detectan las acciones.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CollisionWorld } from '../world/CollisionWorld.js';
import { Interactables } from '../world/Interactables.js';
import { buildIslandUnderside } from '../world/Terrain.js';
import { makeSkyDome } from '../world/Sky.js';
import { windUniforms } from '../world/Wind.js';
import { getMaterials, shadow } from '../world/Materials.js';
import { mulberry32, glowTexture, woodTexture, drawPaw } from '../world/Textures.js';
import { DogAvatar } from '../player/DogAvatar.js';
import { THEMES, DECORATE, buildCatStatue } from './WorldThemes.js';
import { makePortalMaterial, StatusSprite } from './PortalFX.js';
import {
  ABILITY_FOR_TYPE, BREED_FOR_TYPE, OBJECTIVE_RANGE, EXIT_PORTAL, WORLD_FALL_Y, worldSpawn,
} from './WorldData.js';
import { getBreed } from '../breeds/BreedData.js';
import { mergeStatic } from '../world/mergeStatic.js';
import { buildFlowerPatches, Butterflies } from '../world/Life.js';

const PLATE_WINDOW = 1.3;
const HIDDEN = -1000;

export class ThemedWorld {
  constructor(def, quality, fx) {
    this.def = def;
    this.id = def.id;
    this.theme = THEMES[def.id];
    this.fx = fx;
    this.quality = quality;
    this.time = 0;
    this.complete = false;
    this.bridge = null; // { act(k, v), solveLocal(k), completeLocal(), exit(), isOnline() }

    const T = this.theme;
    const scene = new THREE.Scene();
    this.scene = scene;
    scene.fog = new THREE.Fog(T.fog[0], T.fog[1], T.fog[2]);
    this.sky = makeSkyDome(T.sky[0], T.sky[1]);
    scene.add(this.sky);
    scene.add(new THREE.HemisphereLight(T.hemi[0], T.hemi[1], 1.2));
    const sun = new THREE.DirectionalLight(T.sun, 2.4);
    sun.position.set(-30, 50, 30);
    sun.castShadow = quality.shadows;
    if (sun.castShadow) {
      sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
      Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 150 });
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.04;
    }
    scene.add(sun, sun.target);
    this.sun = sun;

    this.collision = new CollisionWorld(() => -Infinity);
    this.fallLimitY = WORLD_FALL_Y;
    const sp = worldSpawn(def.id);
    this.spawnPoint = new THREE.Vector3(sp.x, this.padTop(sp.x, sp.z) + 0.1, sp.z);

    this.group = new THREE.Group();
    scene.add(this.group);
    const rnd = mulberry32(def.id.length * 131 + def.id.charCodeAt(0));
    this.buildPads(rnd);
    const decor = new THREE.Group();
    this.group.add(decor);
    DECORATE[def.id]({ group: decor, pads: def.pads, rnd, collision: this.collision });
    // Los engranajes giran: se quedan fuera de la fusión.
    for (const g of decor.userData.gears || []) g.traverse((o) => { o.userData.dynamic = true; });
    mergeStatic(decor);
    // Vida: flores y mariposas en los mundos al aire libre.
    if (['park', 'forest', 'desert', 'ice'].includes(def.id)) {
      const big = def.pads.filter((p) => p[2] >= 8);
      const sample = (r) => {
        const [px, pz, w, d, top] = big[Math.floor(r() * big.length)];
        const side = r() < 0.5 ? -1 : 1;
        const x = px + side * (w / 2 - 1 - r() * 1.6);
        const z = pz + (r() - 0.5) * (d - 2);
        return { x, z, y: top };
      };
      if (def.id !== 'ice') this.group.add(buildFlowerPatches(sample, quality.name === 'low' ? 200 : 520, def.id.length * 7));
      if (def.id !== 'desert') {
        const homes = big.map(([px, pz, w, d, top]) => ({ x: px, z: pz, y: top }));
        this.butterflies = new Butterflies(homes, quality.name === 'low' ? 8 : 18, def.id.length);
        if (def.id === 'ice') for (let i = 0; i < 18; i++) { this.butterflies.right.setColorAt(i, new THREE.Color('#dff4ff')); this.butterflies.left.setColorAt(i, new THREE.Color('#dff4ff')); }
        this.group.add(this.butterflies.group);
      }
    }
    this.group.userData.gears = decor.userData.gears;
    this.group.userData.snow = decor.userData.snow;

    // Pedruscos de Goliath (reutiliza el sistema del Hub con otra disposición).
    this.interactables = new Interactables(scene, this.collision, fx,
      { rocks: [], digs: [], boulders: def.boulders.map(([x, z]) => ({ x, z })) },
      (x, z) => this.padTop(x, z));
    // Los mundos no tienen huesos sueltos: la recompensa son las reliquias.
    this.collectibles = { count: 0, positions: [], active: new Uint8Array(0), update() {} };

    this.objectives = def.objectives.map((o) => this.buildObjective(o));
    this.buildRelic();
    this.buildExit();
    this._v = new THREE.Vector3();
  }

  // ------------------------------------------------------------- geometría
  padTop(x, z) {
    let best = -Infinity;
    for (const [px, pz, w, d, top] of this.def.pads) {
      if (Math.abs(x - px) <= w / 2 && Math.abs(z - pz) <= d / 2 && top > best) best = top;
    }
    return Number.isFinite(best) ? best : 0;
  }

  buildPads(rnd) {
    const T = this.theme;
    const topMat = new THREE.MeshStandardMaterial({ color: T.top, roughness: 0.9 });
    const sideMat = new THREE.MeshStandardMaterial({ color: T.side, roughness: 0.9 });
    this.def.pads.forEach(([x, z, w, d, top], i) => {
      const slab = new THREE.Mesh(new RoundedBoxGeometry(w, 1.2, d, 2, 0.25), sideMat);
      slab.position.set(x, top - 0.68, z);
      slab.receiveShadow = true;
      const grass = new THREE.Mesh(new RoundedBoxGeometry(w + 0.1, 0.3, d + 0.1, 2, 0.12), topMat);
      grass.position.set(x, top - 0.13, z);
      grass.receiveShadow = true;
      this.group.add(slab, grass);
      const under = buildIslandUnderside(0, 0, () => 1, 0, 1.6, Math.floor(rnd() * 999), 20, 7, T.under);
      under.scale.set(w * 0.46, Math.max(w, d) * 0.9, d * 0.46);
      under.position.set(x, top - 1.2, z);
      this.group.add(under);
      this.collision.addBox(x - w / 2, top - 1.3, z - d / 2, x + w / 2, top, z + d / 2);
      void i;
    });
  }

  /** Puerta temática que bloquea el paso hasta resolver un objetivo. */
  makeGate(spec) {
    const T = this.theme;
    const y = this.padTop(spec.x, spec.z + 1) || 0;
    const col = this.collision.addBoxCentered(spec.x, y - 0.5, spec.z, spec.w, spec.h + 0.5, spec.d);
    const gate = { col, mesh: null, opening: 0, baseY: y };
    if (spec.invisible) return gate;
    const g = new THREE.Group();
    g.position.set(spec.x, y, spec.z);
    const frameMat = new THREE.MeshStandardMaterial({ color: T.gate.color, roughness: 0.6, metalness: 0.3 });
    const accent = new THREE.MeshStandardMaterial({ color: T.gate.accent, emissive: T.gate.accent, emissiveIntensity: 0.5 });
    const n = Math.floor(spec.w / 0.7);
    for (let i = 0; i <= n; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, spec.h, 0.14), frameMat);
      bar.position.set(-spec.w / 2 + (i / n) * spec.w, spec.h / 2, 0);
      g.add(bar);
    }
    for (const yy of [0.3, spec.h - 0.2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(spec.w, 0.25, 0.25), frameMat);
      rail.position.y = yy;
      g.add(rail);
    }
    const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 16).rotateX(Math.PI / 2), accent);
    lock.position.set(0, spec.h / 2, 0.15);
    g.add(lock);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.group.add(g);
    gate.mesh = g;
    return gate;
  }

  openGate(gate, animate) {
    if (!gate) return;
    gate.col.minY = HIDDEN - 1;
    gate.col.maxY = HIDDEN;
    if (gate.mesh) {
      if (animate) gate.opening = 1;
      else gate.mesh.visible = false;
    }
  }

  // ------------------------------------------------------------ objetivos
  buildObjective(o) {
    const T = this.theme;
    const M = getMaterials();
    const obj = {
      def: o, key: o.key, type: o.type, solved: false,
      breed: getBreed(BREED_FOR_TYPE[o.type]), ability: ABILITY_FOR_TYPE[o.type],
    };
    const y = this.padTop(o.x, o.z);

    switch (o.type) {
      case 'break': {
        const w = o.wall;
        const wy = this.padTop(w.x, w.z + 1);
        const g = new THREE.Group();
        g.position.set(w.x, wy, w.z);
        if (T.wall.logs) {
          for (let i = 0; i < 4; i++) {
            const log = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, w.w, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.95 }));
            log.position.set((i % 2) * 0.3, 0.42 + i * 0.8, 0);
            g.add(log);
          }
        } else if (T.wall.crates) {
          const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), color: '#d8a060' });
          for (let i = 0; i < Math.floor(w.w / 1.4); i++) {
            for (let j = 0; j < 3; j++) {
              if (j === 2 && i % 3 === 1) continue;
              const c = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.15, 1.3, 2, 0.06), wood);
              c.position.set(-w.w / 2 + 0.7 + i * 1.4, 0.58 + j * 1.15, (j % 2) * 0.1);
              c.rotation.y = (i + j) % 2 ? 0.08 : -0.05;
              g.add(c);
            }
          }
        } else if (T.wall.bars) {
          const iron = new THREE.MeshStandardMaterial({ color: '#2a2533', metalness: 0.7, roughness: 0.4 });
          for (let i = 0; i <= 14; i++) {
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, w.h, 8), iron);
            bar.position.set(-w.w / 2 + (i / 14) * w.w, w.h / 2, 0);
            g.add(bar);
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), iron);
            spike.position.set(bar.position.x, -0.1, 0);
            spike.rotation.x = Math.PI;
            g.add(spike);
          }
          for (const yy of [0.8, w.h - 0.6]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(w.w, 0.2, 0.2), iron);
            rail.position.y = yy;
            g.add(rail);
          }
        } else {
          const mat = new THREE.MeshStandardMaterial({ color: T.wall.color, roughness: 0.9, bumpMap: M.rock.bumpMap, bumpScale: 1.5, emissive: '#ff9a1f', emissiveIntensity: 0.08 });
          for (let i = 0; i < Math.floor(w.w / 1.2); i++) {
            for (let j = 0; j < 3; j++) {
              const b = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.1, w.d, 2, 0.08), mat);
              b.position.set(-w.w / 2 + 0.6 + i * 1.2 + (j % 2) * 0.3, 0.55 + j * 1.12, 0);
              g.add(b);
            }
          }
        }
        // Grietas brillantes: indican que se puede embestir.
        const crack = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffcf4a', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
        crack.scale.set(3, 2, 1);
        crack.position.set(0, 1.6, 0.8);
        g.add(crack);
        g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
        this.group.add(g);
        obj.wall = g;
        obj.crack = crack;
        obj.col = this.collision.addBoxCentered(w.x, wy - 0.5, w.z, w.w, w.h + 0.5, w.d);
        break;
      }

      case 'freeze': {
        const wd = o.water;
        const waterMat = new THREE.MeshStandardMaterial({
          color: T.water.color, emissive: T.water.emissive, emissiveIntensity: T.water.hot ? 1.2 : 0.4,
          roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88,
        });
        const water = new THREE.Mesh(new THREE.PlaneGeometry(wd.w + 2, wd.d, 16, 16).rotateX(-Math.PI / 2), waterMat);
        water.position.set(wd.x, -0.9, wd.z);
        this.group.add(water);
        // Cuenca (para que se vea agua y no vacío).
        const basin = new THREE.Mesh(new RoundedBoxGeometry(wd.w + 2, 1.6, wd.d + 0.6, 2, 0.2), new THREE.MeshStandardMaterial({ color: T.side, roughness: 0.9 }));
        basin.position.set(wd.x, -1.85, wd.z);
        this.group.add(basin);
        const b = o.bridge;
        const ice = new THREE.Mesh(new RoundedBoxGeometry(b.w, 0.5, b.d, 2, 0.15), new THREE.MeshPhysicalMaterial({
          color: '#c9f0ff', emissive: '#4fc3ff', emissiveIntensity: 0.35, roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1,
        }));
        ice.position.set(b.x, -0.25, b.z);
        ice.visible = false;
        ice.receiveShadow = true;
        this.group.add(ice);
        obj.water = water;
        obj.waterMat = waterMat;
        obj.ice = ice;
        obj.bridgeCol = this.collision.addBox(b.x - b.w / 2, HIDDEN - 1, b.z - b.d / 2, b.x + b.w / 2, HIDDEN, b.z + b.d / 2);
        obj.rect = wd;
        break;
      }

      case 'dig': {
        const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#7a5233', roughness: 1 }));
        mound.scale.set(1, 0.45, 1);
        mound.position.set(o.x, y - 0.05, o.z);
        const x = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.16), new THREE.MeshStandardMaterial({ color: '#f2d27a', emissive: '#c08a1a', emissiveIntensity: 0.5 }));
        x.position.set(o.x, y + 0.43, o.z);
        x.rotation.y = Math.PI / 4;
        const x2 = x.clone();
        x2.rotation.y = -Math.PI / 4;
        this.group.add(mound, x, x2);
        obj.mound = [mound, x, x2];
        // Objeto enterrado (llave dorada) que sale al excavar.
        const key = buildKey();
        key.position.set(o.x, y + 0.2, o.z);
        key.visible = false;
        this.group.add(key);
        obj.item = key;
        obj.gate = this.makeGate(o.gate);
        break;
      }

      case 'cheer': {
        const c = o.critter;
        const cy = this.padTop(c.x, c.z);
        if (c.kind === 'cat') {
          const cat = buildCatStatue(new THREE.MeshStandardMaterial({ color: '#3d2a5c', roughness: 0.7 }));
          cat.scale.setScalar(1.4);
          cat.position.set(c.x, cy, c.z);
          this.group.add(cat);
          obj.critter = { kind: 'cat', root: cat, home: cat.position.clone() };
        } else {
          const pup = new DogAvatar('scout', this.fx);
          pup.root.scale.multiplyScalar(0.55);
          pup.root.position.set(c.x, cy, c.z);
          pup.root.rotation.y = 0;
          this.group.add(pup.root);
          obj.critter = { kind: 'puppy', avatar: pup, root: pup.root, home: pup.root.position.clone() };
        }
        obj.bubble = new StatusSprite(2.2);
        obj.bubble.set(c.kind === 'cat' ? '😾 ¡Fuera!' : '😢 Tengo miedo…');
        obj.bubble.sprite.position.set(c.x, cy + 2.6, c.z);
        this.group.add(obj.bubble.sprite);
        obj.gate = this.makeGate(o.gate);
        break;
      }

      case 'sniff': {
        const stoneMat = new THREE.MeshStandardMaterial({
          color: T.stones, emissive: T.stones, emissiveIntensity: 0.35, transparent: true, opacity: 0, roughness: 0.6,
        });
        obj.stoneMat = stoneMat;
        obj.stones = o.stones.map(([sx, sz, sy]) => {
          const m = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.5, 2.2, 2, 0.15), stoneMat);
          m.position.set(sx, sy - 0.25, sz);
          m.visible = false;
          this.group.add(m);
          const col = this.collision.addBox(sx - 1.1, HIDDEN - 1, sz - 1.1, sx + 1.1, HIDDEN, sz + 1.1);
          return { mesh: m, col, top: sy, x: sx, z: sz };
        });
        // Niebla sobre el hueco.
        const gap = o.gap;
        for (let i = 0; i < 6; i++) {
          const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false }));
          mist.scale.set(8, 3, 1);
          mist.position.set(gap.x + (i % 2 ? 3 : -3), 0.5, gap.z - gap.d / 2 + (i + 0.5) * (gap.d / 6));
          this.group.add(mist);
        }
        break;
      }

      case 'switch': {
        const s = o.switch;
        const sy = this.padTop(s.x, s.z);
        const base = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.8, 1.2, 2, 0.1), M.stoneRough);
        base.position.set(s.x, sy + 0.4, s.z);
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.25, 20), new THREE.MeshStandardMaterial({ color: '#ff4d4d', emissive: '#ff2020', emissiveIntensity: 0.6 }));
        btn.position.set(s.x, sy + 0.9, s.z);
        this.group.add(shadow(base), btn);
        this.collision.addBoxCentered(s.x, sy, s.z, 1.2, 0.8, 1.2);
        obj.button = btn;
        const d = o.door;
        obj.door = this.makeGate({ x: d.x, z: d.z, w: d.w, h: d.h, d: 0.6 });
        obj.doorUntil = 0;
        obj.timer = new StatusSprite(2.4);
        obj.timer.sprite.position.set(d.x, this.padTop(d.x, d.z + 1) + d.h + 1, d.z);
        obj.timer.set('⏱ Puerta cerrada');
        this.group.add(obj.timer.sprite);
        // Línea guía desde el interruptor hasta la puerta.
        const pts = [new THREE.Vector3(s.x, sy + 0.05, s.z), new THREE.Vector3(d.x, sy + 0.05, d.z)];
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#ffd84a', dashSize: 0.6, gapSize: 0.4 }));
        line.computeLineDistances();
        this.group.add(line);
        break;
      }

      case 'plates': {
        obj.plates = o.plates.map(([px, pz]) => {
          const py = this.padTop(px, pz);
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          const ctx = c.getContext('2d');
          ctx.fillStyle = o.heavy ? '#5a4a6a' : '#8a7a5a';
          ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
          drawPaw(ctx, 64, 60, 0.8, '#ffd84a');
          const tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffd84a', emissiveIntensity: 0 });
          const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.15, 24), [new THREE.MeshStandardMaterial({ color: '#4a3a2a' }), mat, mat]);
          m.position.set(px, py + 0.07, pz);
          this.group.add(m);
          return { x: px, z: pz, y: py, mesh: m, mat, occ: -10, lastSend: 0 };
        });
        if (o.heavy) {
          const label = new StatusSprite(2.4);
          label.set('🪨 Placa pesada');
          label.sprite.position.set(o.plates[0][0], this.padTop(o.plates[0][0], o.plates[0][1]) + 1.6, o.plates[0][1]);
          this.group.add(label.sprite);
          obj.label = label;
        }
        obj.gate = this.makeGate(o.gate);
        break;
      }
      default: break;
    }
    return obj;
  }

  buildRelic() {
    const r = this.def.relic;
    const y = this.padTop(r.x, r.z);
    const g = new THREE.Group();
    g.position.set(r.x, y, r.z);
    const M = getMaterials();
    const ped = new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.1, 1.4, 2, 0.1), M.stoneRough);
    ped.position.y = 0.55;
    g.add(shadow(ped));
    // Huella dorada gigante (la reliquia).
    const paw = new THREE.Group();
    paw.position.y = 2.0;
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), M.gold);
    pad.scale.set(1, 0.85, 0.5);
    pad.position.y = -0.15;
    paw.add(pad);
    for (const [dx, dy] of [[-0.42, 0.25], [-0.15, 0.48], [0.15, 0.48], [0.42, 0.25]]) {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), M.gold);
      toe.scale.set(1, 1.2, 0.6);
      toe.position.set(dx, dy, 0);
      paw.add(toe);
    }
    g.add(paw);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.0, 14, 16, 1, true), new THREE.MeshBasicMaterial({
      color: this.def.color, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    beam.position.y = 7;
    g.add(beam);
    const label = new StatusSprite(3.4);
    label.set(`🔒 ${this.def.relicName}`);
    label.sprite.position.y = 3.4;
    g.add(label.sprite);
    this.group.add(g);
    this.collision.addCylinder(r.x, r.z, 0.75, y, y + 1.1);
    this.relic = { group: g, paw, beam, label, x: r.x, z: r.z, y, lastSend: 0 };
  }

  buildExit() {
    const e = EXIT_PORTAL;
    const y = this.padTop(e.x, e.z);
    const g = new THREE.Group();
    g.position.set(e.x, y, e.z);
    g.rotation.y = -0.5; // mirando hacia el punto de aparición
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.16, 10, 32), getMaterials().gold);
    ring.position.y = 1.5;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), makePortalMaterial('park', '#b47cff', '#ffd84a'));
    disc.position.y = 1.5;
    g.add(ring, disc);
    const label = new StatusSprite(2.6);
    label.set('🏰 Volver al castillo');
    label.sprite.position.y = 3.2;
    g.add(label.sprite);
    this.group.add(g);
    this.exit = { x: e.x, z: e.z, y, timer: 0, label };
  }

  // ----------------------------------------------------- estado de misión
  isSolved(key) {
    return this.objectives.find((o) => o.key === key)?.solved ?? false;
  }

  get allSolved() {
    return this.objectives.every((o) => o.solved);
  }

  /** Estado completo recibido al entrar (o reinicio en modo local). */
  applyState(state) {
    const solved = new Set(state?.solved || []);
    for (const o of this.objectives) if (solved.has(o.key) && !o.solved) this.applySolved(o.key, false);
    if (state?.doors) for (const [k, ms] of Object.entries(state.doors)) this.openDoor(k, ms);
    if (state?.boulders) this.interactables.applyState({ boulders: state.boulders });
    this.complete = Boolean(state?.complete);
    this.updateRelicLabel();
  }

  applySolved(key, animate = true) {
    const o = this.objectives.find((q) => q.key === key);
    if (!o || o.solved) return;
    o.solved = true;
    const fx = this.fx;
    switch (o.type) {
      case 'break':
        o.wall.visible = false;
        o.col.minY = HIDDEN - 1;
        o.col.maxY = HIDDEN;
        if (animate && fx) {
          const w = o.def.wall;
          for (let i = -2; i <= 2; i++) fx.emit('rubble', w.x + i * 2.5, 1.2, w.z);
        }
        break;
      case 'freeze': {
        const b = o.def.bridge;
        o.ice.visible = true;
        o.bridgeCol.minY = -0.6;
        o.bridgeCol.maxY = 0;
        o.waterMat.color.set('#bfe8ff');
        o.waterMat.emissive.set('#4fa8d8');
        o.waterMat.emissiveIntensity = 0.3;
        if (animate && fx) for (let i = -2; i <= 2; i++) fx.emit('frost', b.x, 0, b.z + i * (b.d / 5));
        break;
      }
      case 'dig':
        o.mound.forEach((m) => { m.visible = false; });
        o.item.visible = true;
        o.itemT = animate ? 0 : 99;
        if (animate && fx) {
          fx.emit('dirt', o.def.x, 0.4, o.def.z, null, 4);
          fx.emit('gold', o.def.x, 1, o.def.z);
        }
        this.openGate(o.gate, animate);
        break;
      case 'cheer':
        o.cheerT = animate ? 0 : 99;
        o.bubble.set(o.critter.kind === 'cat' ? '😵 ¡Qué baile!' : '🥰 ¡Gracias!');
        if (animate && fx) fx.emit('confetti', o.critter.root.position.x, 1.5, o.critter.root.position.z);
        this.openGate(o.gate, animate);
        break;
      case 'sniff':
        o.stoneMat.opacity = 1;
        o.stoneMat.transparent = false;
        for (const s of o.stones) {
          s.mesh.visible = true;
          s.col.minY = s.top - 0.5;
          s.col.maxY = s.top;
          if (animate && fx) fx.emit('sparkle', s.x, s.top + 0.4, s.z);
        }
        break;
      case 'switch':
        o.button.material.color.set('#4dff7a');
        o.button.material.emissive.set('#20c040');
        o.timer.set('✔ Abierta');
        this.openGate(o.door, animate);
        break;
      case 'plates':
        for (const p of o.plates) p.mat.emissiveIntensity = 0.8;
        if (o.label) o.label.set('✔ Activada');
        this.openGate(o.gate, animate);
        break;
      default: break;
    }
    this.updateRelicLabel();
  }

  /** Interruptor pulsado: la puerta se abre durante `ms`. */
  openDoor(key, ms) {
    const o = this.objectives.find((q) => q.key === key);
    if (!o || o.solved) return;
    o.doorUntil = this.time + ms / 1000;
    o.crossSent = false;
    o.door.col.minY = HIDDEN - 1;
    o.door.col.maxY = HIDDEN;
    o.button.position.y -= 0.1;
    if (this.fx) this.fx.emit('sparkle', o.def.switch.x, 1, o.def.switch.z);
  }

  updateRelicLabel() {
    if (!this.relic) return;
    if (this.complete) this.relic.label.set(`★ ${this.def.relicName}`, 'rgba(170,120,10,0.85)');
    else if (this.allSolved) this.relic.label.set(`✨ ${this.def.relicName}`, 'rgba(91,42,158,0.85)');
    else this.relic.label.set(`🔒 ${this.def.relicName}`);
  }

  /** Objetivo sin resolver que puede activar esta habilidad desde aquí. */
  objectiveFor(abilityId, pos) {
    let best = null;
    let bd = Infinity;
    for (const o of this.objectives) {
      if (o.solved || o.ability !== abilityId) continue;
      const d = Math.hypot(pos.x - o.def.x, pos.z - o.def.z);
      if (d <= OBJECTIVE_RANGE[o.type] && d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  /** Acción contextual (tecla R / botón) para el jugador en `pos`. */
  interactAt(pos) {
    for (const o of this.objectives) {
      if (o.type !== 'switch' || o.solved) continue;
      const s = o.def.switch;
      if (Math.hypot(pos.x - s.x, pos.z - s.z) < OBJECTIVE_RANGE.switch) {
        return {
          label: 'Pulsar interruptor',
          run: () => {
            if (this.bridge.isOnline()) this.bridge.act(o.key, 'press');
            else this.openDoor(o.key, o.def.duration * 1000);
          },
        };
      }
    }
    return null;
  }

  // ---------------------------------------------------------------- bucle
  update(dt, player, sniffActive) {
    this.time += dt;
    const t = this.time;
    const pos = player.position;
    const online = this.bridge.isOnline();

    // Sombras que siguen al jugador.
    if (this.sun.castShadow) {
      this.sun.target.position.set(pos.x, 0, pos.z);
      this.sun.position.set(pos.x - 30, 50, pos.z + 30);
    }

    for (const o of this.objectives) {
      switch (o.type) {
        case 'break':
          if (!o.solved) o.crack.material.opacity = 0.35 + Math.sin(t * 3) * 0.15;
          break;
        case 'freeze': {
          if (!o.solved) o.waterMat.emissiveIntensity = (this.theme.water.hot ? 1.0 : 0.35) + Math.sin(t * 2) * 0.15;
          const r = o.rect;
          // Caer al agua (o a la pintura/baba) devuelve al último punto de control.
          if (pos.y < -0.5 && Math.abs(pos.x - r.x) < r.w / 2 + 1 && Math.abs(pos.z - r.z) < r.d / 2) {
            if (this.fx) this.fx.emit('frost', pos.x, -0.6, pos.z);
            player.respawn();
          }
          break;
        }
        case 'dig':
          if (o.solved && o.itemT < 3) {
            o.itemT += dt;
            o.item.position.y = this.padTop(o.def.x, o.def.z) + 0.3 + Math.min(1.6, o.itemT * 2);
            o.item.rotation.y = t * 3;
            if (o.itemT >= 3) o.item.visible = false;
          }
          break;
        case 'cheer': {
          const c = o.critter;
          if (!o.solved) {
            // Asustado: tiembla y mira al suelo.
            c.root.position.x = c.home.x + Math.sin(t * 30) * 0.03;
            if (c.avatar) c.avatar.update(dt, 0, 0, 0), (c.avatar.model.head.rotation.x = 0.5);
            else c.root.userData.tail.rotation.z = Math.sin(t * 4) * 0.4;
          } else if (o.cheerT < 4) {
            o.cheerT += dt;
            if (c.avatar) {
              c.avatar.setGesture('rufusDance');
              c.avatar.update(dt, -1, 0, 0);
              c.root.position.x = c.home.x + Math.min(1, o.cheerT / 2) * 2.4;
            } else {
              c.root.rotation.y += dt * 8 * Math.max(0, 1 - o.cheerT / 3);
              c.root.position.x = c.home.x + Math.max(0, o.cheerT - 1.5) * 4;
              if (o.cheerT > 3.5) c.root.visible = false;
            }
          } else if (c.avatar) {
            c.avatar.update(dt, -1, 0, 0);
          }
          break;
        }
        case 'sniff':
          // Mientras se olfatea, se intuyen las piedras (pista para todo el equipo).
          if (!o.solved) {
            const target = sniffActive ? 0.35 : 0;
            o.stoneMat.opacity += (target - o.stoneMat.opacity) * Math.min(1, dt * 4);
            for (const s of o.stones) s.mesh.visible = o.stoneMat.opacity > 0.02;
          }
          break;
        case 'switch': {
          if (o.solved) break;
          const open = o.doorUntil > t;
          const remain = Math.max(0, o.doorUntil - t);
          if (open) {
            o.timer.set(`⏱ ${remain.toFixed(1)} s`, 'rgba(170,40,40,0.85)');
            const d = o.def.door;
            if (!o.crossSent && pos.z < d.z - 0.3 && Math.abs(pos.x - d.x) < d.w / 2) {
              o.crossSent = true;
              if (online) this.bridge.act(o.key, 'cross');
              else this.bridge.solveLocal(o.key);
            }
          } else if (o.doorUntil > 0) {
            // Se cierra: vuelve la colisión y el botón.
            o.doorUntil = 0;
            const g = o.door;
            g.col.minY = g.baseY - 0.5;
            g.col.maxY = g.baseY + o.def.door.h;
            o.button.position.y += 0.1;
            o.timer.set('⏱ Puerta cerrada');
          }
          if (o.door.mesh) o.door.mesh.position.y = o.door.baseY + (open ? Math.min(o.def.door.h, (o.def.duration - remain) * 12) : 0);
          break;
        }
        case 'plates':
          if (!o.solved) this.updatePlates(o, pos, online);
          break;
        default: break;
      }
      // Animación de puertas que se abren al resolver.
      const gate = o.gate || (o.solved ? o.door : null);
      if (gate?.mesh && gate.opening > 0) {
        gate.opening -= dt;
        gate.mesh.position.y = gate.baseY - (1 - Math.max(0, gate.opening)) * (o.def.gate?.h ?? o.def.door?.h ?? 4);
        if (gate.opening <= 0) gate.mesh.visible = false;
      }
    }

    // Reliquia.
    const r = this.relic;
    r.paw.rotation.y = t * 1.2;
    r.paw.position.y = 2 + Math.sin(t * 2) * 0.12;
    r.beam.material.opacity = this.allSolved ? 0.3 + Math.sin(t * 3) * 0.08 : 0.08;
    if (this.allSolved && !this.complete && Math.hypot(pos.x - r.x, pos.z - r.z) < 1.8 && t - r.lastSend > 1.5) {
      r.lastSend = t;
      if (online) this.bridge.act('relic');
      else this.bridge.completeLocal();
    }

    // Portal de salida: quedarse dentro 1 s.
    const e = this.exit;
    if (Math.hypot(pos.x - e.x, pos.z - e.z) < EXIT_PORTAL.r && Math.abs(pos.y - e.y) < 2) {
      e.timer += dt;
      e.label.set(`🏰 Volviendo… ${Math.max(0, 1 - e.timer).toFixed(1)}`);
      if (e.timer > 1) {
        e.timer = -5;
        this.bridge.exit();
      }
    } else if (e.timer !== 0) {
      e.timer = 0;
      e.label.set('🏰 Volver al castillo');
    }

    // Decorado animado.
    this.butterflies?.update(t);
    const gears = this.group.userData.gears;
    if (gears) for (const g of gears) g.rotation.x += dt * g.userData.spin;
    const snow = this.group.userData.snow;
    if (snow) {
      const a = snow.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) - dt * 1.5;
        if (y < -2) y = 20;
        a.setY(i, y);
      }
      a.needsUpdate = true;
    }
    windUniforms.uTime.value = t;
  }

  updatePlates(o, pos, online) {
    const now = this.time;
    const inter = this.interactables;
    o.plates.forEach((p, i) => {
      const onIt = !o.def.heavy && Math.hypot(pos.x - p.x, pos.z - p.z) < 1.15 && Math.abs(pos.y - p.y) < 0.6;
      const boulder = inter.boulders.some((b) => !b.holder && Math.hypot(b.x - p.x, b.z - p.z) < 1.8);
      if (onIt || boulder) p.occ = now;
      p.mat.emissiveIntensity = now - p.occ < PLATE_WINDOW ? 0.8 : 0;
      if (onIt && online && now - p.lastSend > 0.3) {
        p.lastSend = now;
        this.bridge.act(o.key, i);
      }
    });
    if (!online && o.plates.every((p) => now - p.occ < PLATE_WINDOW)) this.bridge.solveLocal(o.key);
  }

  /** Para el panel de misión del HUD. */
  missionList() {
    return this.objectives.map((o) => ({ key: o.key, label: o.def.label, icon: o.breed.ability.icon, solved: o.solved, accent: o.breed.accent }));
  }
}

function buildKey() {
  const M = getMaterials();
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 16), M.gold);
  ring.position.y = 0.35;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), M.gold);
  shaft.position.y = -0.05;
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.06), M.gold);
  tooth.position.set(0.1, -0.28, 0);
  g.add(ring, shaft, tooth);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffd84a', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(1.5);
  g.add(glow);
  return g;
}
