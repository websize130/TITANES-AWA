// Biblioteca de modelos 3D profesionales (GLB/glTF) con sustitución automática.
//
// Si existe /assets/models/manifest.json y un modelo para un perro o personaje,
// el juego usa ese modelo (con su esqueleto y animaciones) en lugar del modelo
// procedural. Si no hay archivo, se usa el modelo generado por código: el juego
// funciona siempre. Admite compresión Draco, Meshopt y texturas KTX2.
//
// Entrada del manifiesto (ver public/assets/models/README.md):
//   { "kind": "dog", "id": "rufus", "file": "dogs/rufus.glb", "scale": 1, "rotationY": 0, "yOffset": 0,
//     "clips": { "idle": "Idle", "run": "Run", "jump": "Jump", "emote": "Dance", "action": "Bark" },
//     "bones": { "head": "Head", "chest": "Spine2", "pelvis": "Hips" } }
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const BASE = '/assets/models/';
const entries = new Map(); // `${kind}:${id}` -> { def, gltf, height }

export const ModelLibrary = {
  loaded: false,

  /** Carga el manifiesto y los modelos listados. Nunca lanza: sin modelos, sigue el procedural. */
  async load(renderer = null) {
    if (this.loaded) return;
    this.loaded = true;
    let manifest;
    try {
      const res = await fetch(`${BASE}manifest.json`, { cache: 'no-cache' });
      if (!res.ok) return;
      manifest = await res.json();
    } catch {
      return;
    }
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('/vendor/three/examples/jsm/libs/draco/gltf/');
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    if (renderer) {
      const ktx2 = new KTX2Loader().setTranscoderPath('/vendor/three/examples/jsm/libs/basis/').detectSupport(renderer);
      loader.setKTX2Loader(ktx2);
    }
    const list = Array.isArray(manifest.models) ? manifest.models : [];
    await Promise.all(list.map(async (def) => {
      if (!def?.kind || !def?.id || !def?.file) return;
      try {
        const gltf = await loader.loadAsync(BASE + def.file);
        gltf.scene.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material?.map) o.material.map.anisotropy = 4;
          }
        });
        const box = new THREE.Box3().setFromObject(gltf.scene);
        entries.set(`${def.kind}:${def.id}`, { def, gltf, height: (box.max.y - box.min.y) * (def.scale ?? 1) });
        console.info(`[ModelLibrary] ${def.kind}:${def.id} cargado (${def.file})`);
      } catch (err) {
        console.warn(`[ModelLibrary] No se pudo cargar ${def.file}: ${err?.message ?? err}`);
      }
    }));
  },

  has(kind, id) {
    return entries.has(`${kind}:${id}`);
  },

  /**
   * Instancia independiente (esqueleto propio) lista para animar:
   * { root, mixer, actions, play(name, fade), bone(name), height, def }
   */
  instantiate(kind, id) {
    const e = entries.get(`${kind}:${id}`);
    if (!e) return null;
    const { def, gltf } = e;
    const holder = new THREE.Group();
    holder.name = `GLB-${kind}-${id}`;
    const scene = cloneSkinned(gltf.scene);
    scene.scale.setScalar(def.scale ?? 1);
    scene.rotation.y = def.rotationY ?? 0;
    scene.position.y = def.yOffset ?? 0;
    holder.add(scene);
    const mixer = new THREE.AnimationMixer(scene);
    const clipsByName = new Map(gltf.animations.map((c) => [c.name, c]));
    const actions = {};
    for (const [logical, clipName] of Object.entries(def.clips ?? {})) {
      const clip = clipsByName.get(clipName);
      if (clip) actions[logical] = mixer.clipAction(clip);
    }
    // Si el manifiesto no mapea clips, se intenta por nombre habitual.
    for (const clip of gltf.animations) {
      const n = clip.name.toLowerCase();
      for (const logical of ['idle', 'run', 'walk', 'jump', 'fall', 'emote', 'action', 'wave', 'dance']) {
        if (!actions[logical] && n.includes(logical)) actions[logical] = mixer.clipAction(clip);
      }
    }
    if (!actions.run && actions.walk) actions.run = actions.walk;
    if (!actions.emote && actions.dance) actions.emote = actions.dance;
    let current = null;
    const inst = {
      def,
      root: holder,
      mixer,
      actions,
      height: e.height,
      bone(name) {
        const wanted = def.bones?.[name];
        let found = null;
        scene.traverse((o) => {
          if (found) return;
          if (wanted ? o.name === wanted : o.isBone && o.name.toLowerCase().includes(name)) found = o;
        });
        return found;
      },
      /** Cambia de animación con fundido. Devuelve false si no existe. */
      play(name, fade = 0.2, once = false) {
        const next = actions[name];
        if (!next) return false;
        if (next === current) return true;
        next.reset();
        next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
        next.clampWhenFinished = once;
        next.fadeIn(fade).play();
        if (current) current.fadeOut(fade);
        current = next;
        return true;
      },
    };
    inst.play('idle', 0);
    return inst;
  },
};
