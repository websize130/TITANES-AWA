import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/**
 * Carga centralizada de recursos con caché.
 * - GLB/glTF (con compresión DRACO, decodificador local)
 * - Texturas e HDRI
 * - Clonado seguro de personajes con esqueleto (SkeletonUtils)
 */
export class AssetLoader {
  constructor(renderer) {
    this.manager = new THREE.LoadingManager();
    // Desde three r18x el decodificador DRACO viene incluido en el paquete y
    // Vite lo empaqueta automáticamente: funciona sin CDN y sin conexión.
    // Se descarga solo la primera vez que se carga un modelo comprimido.
    this.draco = new DRACOLoader(this.manager);

    this.gltf = new GLTFLoader(this.manager);
    this.gltf.setDRACOLoader(this.draco);
    this.texture = new THREE.TextureLoader(this.manager);
    this.hdr = new HDRLoader(this.manager);
    this.renderer = renderer;
    this.cache = new Map();
  }

  /** Carga un GLB una vez; las siguientes llamadas devuelven la misma promesa. */
  loadGLTF(url) {
    if (!this.cache.has(url)) this.cache.set(url, this.gltf.loadAsync(url));
    return this.cache.get(url);
  }

  /**
   * Instancia un personaje animado. Con esqueleto hay que usar
   * SkeletonUtils.clone (Object3D.clone rompe los huesos).
   */
  async instantiateCharacter(url) {
    const gltf = await this.loadGLTF(url);
    const root = SkeletonUtils.clone(gltf.scene);
    root.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    const mixer = new THREE.AnimationMixer(root);
    return { root, mixer, animations: gltf.animations };
  }

  async loadTexture(url, { srgb = true, repeat = 1 } = {}) {
    const tex = await this.texture.loadAsync(url);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.anisotropy = this.renderer.maxAnisotropy;
    return tex;
  }

  /** HDRI .hdr (p. ej. de Poly Haven, usar 1k o 2k en móvil). */
  async loadHDR(url) {
    const tex = await this.hdr.loadAsync(url);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  dispose() {
    this.draco.dispose();
    this.cache.clear();
  }
}
