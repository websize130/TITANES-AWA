// Ensambla el Hub World: cielo, iluminación, terreno, césped, castillo, props y coleccionables.
import * as THREE from 'three';
import { buildTerrain, terrainHeight, SPAWN, FALL_LIMIT_Y } from './Terrain.js';
import { CollisionWorld } from './CollisionWorld.js';
import { buildSky, SKY_HORIZON } from './Sky.js';
import { buildGrass } from './Grass.js';
import { buildCastle } from './Castle.js';
import { buildProps } from './Props.js';
import { Collectibles } from './Collectibles.js';
import { windUniforms } from './Wind.js';
import { buildFlowerPatches, Butterflies } from './Life.js';
import { islandSd, pathX } from './Terrain.js';

export class HubWorld {
  constructor(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    this.collision = new CollisionWorld(terrainHeight);
    this.fallLimitY = FALL_LIMIT_Y;

    // Niebla con un toque lavanda (como las ilustraciones) y más lejana: escena más nítida.
    scene.fog = new THREE.Fog(SKY_HORIZON.clone().lerp(new THREE.Color('#e2c8ff'), 0.3), 170, 620);

    this.setupLights();

    this.sky = buildSky(quality);
    scene.add(this.sky.group);

    this.terrain = buildTerrain(quality);
    scene.add(this.terrain);

    this.grass = buildGrass(quality);
    if (this.grass) scene.add(this.grass);

    this.castle = buildCastle(this.collision, quality);
    scene.add(this.castle.group);

    this.props = buildProps(this.collision, quality);

    // Vida: macizos de flores de colores y mariposas.
    const sample = (rnd) => {
      const a = rnd() * Math.PI * 2;
      const r = 6 + Math.sqrt(rnd()) * 48;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (islandSd(x, z) > -3 || (z > -70 && z < 36 && Math.abs(x - pathX(z)) < 6)) return null;
      return { x, z, yAt: terrainHeight };
    };
    const flowerCount = quality.name === 'high' ? 2600 : quality.name === 'medium' ? 1400 : 600;
    this.flowers = buildFlowerPatches(sample, flowerCount, 31);
    scene.add(this.flowers);
    const homes = [];
    for (const [x, z] of [[-8, 22], [10, 18], [-16, 4], [16, 0], [-6, -20], [12, -26], [-20, -30], [22, 24], [0, 30], [-28, 12]]) homes.push({ x, z, y: terrainHeight(x, z) });
    this.butterflies = new Butterflies(homes, quality.name === 'low' ? 14 : 32, 12);
    scene.add(this.butterflies.group);
    scene.add(this.props.group);

    this.collectibles = new Collectibles(this.props.platforms, this.collision);
    scene.add(this.collectibles.group);

    this.spawnPoint = new THREE.Vector3(SPAWN.x, terrainHeight(SPAWN.x, SPAWN.z) + 0.1, SPAWN.z);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight('#c9e6ff', '#7aa03a', 1.15);
    this.scene.add(hemi);

    // Sol dorado de tarde (como las ilustraciones), con sombras que siguen al jugador.
    const sun = new THREE.DirectionalLight('#ffe6b8', 3.1);
    sun.position.set(-40, 70, 45);
    sun.castShadow = this.quality.shadows;
    if (sun.castShadow) {
      const size = this.quality.shadowMapSize;
      sun.shadow.mapSize.set(size, size);
      const cam = sun.shadow.camera;
      cam.left = -45; cam.right = 45; cam.top = 45; cam.bottom = -45;
      cam.near = 10; cam.far = 220;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.04;
    }
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this.sunOffset = sun.position.clone();

    // Luz de relleno lavanda desde el lado opuesto.
    const fill = new THREE.DirectionalLight('#c9a8ff', 0.75);
    fill.position.set(50, 30, -40);
    this.scene.add(fill);
  }

  update(t, dt, camera, focus) {
    this.butterflies.update(t);
    windUniforms.uTime.value = t;
    this.sky.update(t, dt, camera.position);
    this.castle.update(t);
    this.props.update(t, dt);

    // La caja de sombras sigue al jugador (texel-snapping para evitar parpadeo).
    if (this.sun.castShadow && focus) {
      const step = 90 / this.quality.shadowMapSize;
      const fx = Math.round(focus.x / step) * step;
      const fz = Math.round(focus.z / step) * step;
      this.sun.target.position.set(fx, 0, fz);
      this.sun.position.set(fx + this.sunOffset.x, this.sunOffset.y, fz + this.sunOffset.z);
    }
  }
}
