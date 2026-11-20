import * as THREE from 'three';
import { TextureFactory } from './textures.js';
import { ScannedTextures } from './scannedTextures.js';

/* Biblioteca de materiales del mundo (se registran en las sombras en cascada) */
export class MaterialLibrary {
  constructor(csm) {
    const T = TextureFactory.sets;
    this.list = {};
    this.texScale = { stone: 2.2, rock: 1.5, plaster: 3.0, wood: 2.0, woodDark: 2.0, bark: 1.2, charred: 1.0, roof: 2.5, metal: 1, void: 1, ash: 1, concrete: 3, tile: 2.4, rust: 2.5, paintRed: 2.5, paintGrey: 2.5, brick: 2.2, bone: 2, ground: 4, concreteFloor: 4, asphalt: 4, tileFloor: 4, stoneFloor: 4 };
    const std = (name, p) => { const m = new THREE.MeshStandardMaterial(p); m.name = name; if (csm) csm.setupMaterial(m); this.list[name] = m; return m; };
    const pbr = (s, extra = {}) => Object.assign({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1, metalness: 0 }, extra);
    // Materiales con textura: fotoescaneada (Poly Haven, a escala real en metros) si está cargada; si no, la procedural.
    // procExtra: tinte y relieve que necesitaba la procedural · scanExtra: ajustes sobre el escaneo
    const mat = (name, scanKey, procSet, procExtra = {}, scanExtra = {}) => {
      const s = ScannedTextures.get(scanKey);
      if (!s) return std(name, pbr(procSet, procExtra));
      this.texScale[name] = s.size;
      return std(name, Object.assign({ map: s.map, normalMap: s.normalMap, roughnessMap: s.armMap, metalnessMap: s.armMap, aoMap: s.armMap, aoMapIntensity: 0.9, roughness: 1, metalness: 0 }, scanExtra));
    };
    const V2 = (s) => new THREE.Vector2(s, s), vc = { vertexColors: true };
    mat('stone', 'stone', T.stone, { normalScale: V2(1.3) });
    mat('rock', 'rockScan', T.stone, { color: 0x8a857c, normalScale: V2(1.6) });
    mat('plaster', 'plaster', T.plaster);
    mat('ground', 'ground', T.ground, { vertexColors: true, normalScale: V2(1.2) }, vc);
    mat('wood', 'wood', T.wood);
    mat('woodDark', 'wood', T.wood, { color: 0x6e6050 }, { color: 0x7d6f62 });
    mat('bark', 'bark', T.wood, { color: 0x4c4239, normalScale: V2(1.8) });
    mat('charred', 'wood', T.wood, { color: 0x2a221d }, { color: 0x2a221d });
    mat('roof', 'roof', T.roof);
    mat('straw', 'wood', T.wood, { color: 0xc9a85a }, { color: 0xe0c27a, roughness: 1 }); // heno
    // Isla (día): arena, hierba, paja, palmeras y lonas
    mat('sand', 'sand', T.ground, { color: 0xd8c39a, vertexColors: true }, vc);
    mat('grass', 'grass', T.ground, { color: 0x7c9a4a });
    mat('thatch', 'thatch', T.wood, { color: 0xb59a62 });
    mat('palmTrunk', 'bark', T.wood, { color: 0x8a7458 }, { color: 0xb59a7e });
    std('palmLeaf', { color: 0xffffff, vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide, normalMap: (T.leather || {}).normalMap || null, normalScale: V2(0.25) });
    // Historia: carne viva (Zona Cero, cuarentena) y follaje mutante del invernadero
    std('flesh', { color: 0x5e1d18, emissive: 0x260404, emissiveIntensity: 1, roughness: 0.38, metalness: 0.02, normalMap: (T.flesh || T.leather).normalMap, normalScale: V2(1.3) });
    std('vein', { color: 0x2a0303, emissive: 0xff2a1a, emissiveIntensity: 1.6, roughness: 0.3 });
    std('mutantLeaf', { color: 0xffffff, vertexColors: true, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x1a0420, emissiveIntensity: 0.6 });
    std('tent', { color: 0x6f6a4c, roughness: 0.92, normalMap: (T.canvas || {}).normalMap || null, side: THREE.DoubleSide });
    std('hullPaint', { color: 0x2f5a6e, roughness: 0.6, metalness: 0.1, map: (ScannedTextures.get('wood') || T.wood).map });
    std('metal', { color: 0x2b2d2f, roughness: 0.42, metalness: 0.85 });
    std('void', { color: 0x020303, roughness: 1, metalness: 0 });
    std('ash', { color: 0x1d1b19, roughness: 1, metalness: 0 });
    std('puddle', { color: 0x07090a, roughness: 0.04, metalness: 0, envMapIntensity: 1.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    // Escenarios nuevos: laboratorio, ciudad, silos, catacumbas y núcleo
    mat('concrete', 'concrete', T.concrete);
    mat('concreteFloor', 'concreteFloor', T.concrete, { vertexColors: true, color: 0x9a9894 }, vc);
    mat('asphalt', 'asphalt', T.concrete, { vertexColors: true, color: 0x4c4d50, normalScale: V2(1.4) }, vc);
    mat('tile', 'tiles', T.tiles);
    mat('tileFloor', 'tileFloor', T.tiles, vc, vc);
    mat('stoneFloor', 'stoneFloor', T.stone, { vertexColors: true, color: 0x8a8278 }, vc);
    mat('brick', 'brick', T.stone, { color: 0xa8604a });
    mat('rust', 'rust', T.rust, { metalness: 0.5 }, { metalness: 1 });
    mat('paintRed', 'rust', T.rust, { color: 0xa04848, metalness: 0.35 }, { color: 0xb35656, metalness: 0.7 });
    mat('paintGrey', 'rust', T.rust, { color: 0x9aa0a6, metalness: 0.35 }, { color: 0xa9afb5, metalness: 0.7 });
    mat('bone', 'plaster', T.plaster, { color: 0xc8bca0 }, { color: 0xd6cbb2 });
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
  }
  get(n) { return this.list[n]; }
  dispose() { Object.values(this.list).forEach((m) => m.dispose()); }
}
