import * as THREE from 'three';
import { TextureFactory } from './textures.js';

/* Biblioteca de materiales del mundo (se registran en las sombras en cascada) */
export class MaterialLibrary {
  constructor(csm) {
    const T = TextureFactory.sets;
    this.list = {};
    const std = (name, p) => { const m = new THREE.MeshStandardMaterial(p); m.name = name; if (csm) csm.setupMaterial(m); this.list[name] = m; return m; };
    const pbr = (s, extra = {}) => Object.assign({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1, metalness: 0 }, extra);
    std('stone', pbr(T.stone, { normalScale: new THREE.Vector2(1.3, 1.3) }));
    std('rock', pbr(T.stone, { color: 0x8a857c, normalScale: new THREE.Vector2(1.6, 1.6) }));
    std('plaster', pbr(T.plaster));
    std('ground', pbr(T.ground, { vertexColors: true, normalScale: new THREE.Vector2(1.2, 1.2) }));
    std('wood', pbr(T.wood));
    std('woodDark', pbr(T.wood, { color: 0x6e6050 }));
    std('bark', pbr(T.wood, { color: 0x4c4239, normalScale: new THREE.Vector2(1.8, 1.8) }));
    std('charred', pbr(T.wood, { color: 0x2a221d }));
    std('roof', pbr(T.roof));
    std('metal', { color: 0x2b2d2f, roughness: 0.42, metalness: 0.85 });
    std('void', { color: 0x020303, roughness: 1, metalness: 0 });
    std('ash', { color: 0x1d1b19, roughness: 1, metalness: 0 });
    std('puddle', { color: 0x07090a, roughness: 0.04, metalness: 0, envMapIntensity: 1.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    // Escenarios nuevos: laboratorio, ciudad, silos, catacumbas y núcleo
    const V2 = (s) => new THREE.Vector2(s, s);
    std('concrete', pbr(T.concrete));
    std('concreteFloor', pbr(T.concrete, { vertexColors: true, color: 0x9a9894 }));
    std('asphalt', pbr(T.concrete, { vertexColors: true, color: 0x4c4d50, normalScale: V2(1.4) }));
    std('tile', pbr(T.tiles));
    std('tileFloor', pbr(T.tiles, { vertexColors: true }));
    std('stoneFloor', pbr(T.stone, { vertexColors: true, color: 0x8a8278 }));
    std('brick', pbr(T.stone, { color: 0xa8604a }));
    std('rust', pbr(T.rust, { metalness: 0.5 }));
    std('paintRed', pbr(T.rust, { color: 0xa04848, metalness: 0.35 }));
    std('paintGrey', pbr(T.rust, { color: 0x9aa0a6, metalness: 0.35 }));
    std('bone', pbr(T.plaster, { color: 0xc8bca0 }));
    std('glass', { color: 0x8fa6b8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false, envMapIntensity: 2.2 });
    std('fluid', { color: 0x1a0303, emissive: 0x5a0606, emissiveIntensity: 1.3, roughness: 0.1, transparent: true, opacity: 0.6, depthWrite: false });
    std('lamp', { color: 0x111111, emissive: 0xffe2b8, emissiveIntensity: 2.2, roughness: 0.5 });
    std('lampRed', { color: 0x110000, emissive: 0xff1a1a, emissiveIntensity: 2.4, roughness: 0.5 });
    std('screen', { color: 0x050607, emissive: 0x5d7a92, emissiveIntensity: 0.8, roughness: 0.25 });
    std('rubber', { color: 0x141414, roughness: 0.92 });
    std('carPaint', { color: 0x3c4046, roughness: 0.36, metalness: 0.7 });
    std('carRed', { color: 0x4e1414, roughness: 0.4, metalness: 0.6 });
    std('fungus', { color: 0x9a7650, emissive: 0x4a2208, emissiveIntensity: 0.9, roughness: 0.55, normalMap: (T.flesh || T.leather).normalMap });
    std('hazard', { color: 0x8a6a12, roughness: 0.6, metalness: 0.2 });
    this.texScale = { stone: 2.2, rock: 1.5, plaster: 3.0, wood: 2.0, woodDark: 2.0, bark: 1.2, charred: 1.0, roof: 2.5, metal: 1, void: 1, ash: 1, concrete: 3, tile: 2.4, rust: 2.5, paintRed: 2.5, paintGrey: 2.5, brick: 2.2, bone: 2 };
  }
  get(n) { return this.list[n]; }
  dispose() { Object.values(this.list).forEach((m) => m.dispose()); }
}
