import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PROFILES, saveProfile } from './GraphicsProfiles.js';

/**
 * Envoltorio del WebGLRenderer (WebGL 2): perfiles, resolución dinámica,
 * tamaño de pantalla y pérdida de contexto (frecuente en Android).
 */
export class Renderer {
  constructor(container, profileName, caps) {
    this.container = container;
    this.caps = caps;
    this.profileName = profileName;
    this.profile = PROFILES[profileName];
    this.pixelRatio = this.#targetPixelRatio();
    this.onContextLost = null;
    this.onContextRestored = null;

    // Antialias MSAA solo si el perfil lo pide y el hardware lo soporta.
    const antialias = this.profile.antialias && caps.maxSamples > 0;

    this.renderer = new THREE.WebGLRenderer({
      antialias,
      powerPreference: caps.isMobile ? 'default' : 'high-performance',
      stencil: false,
      preserveDrawingBuffer: false,
    });
    // three r163+ solo soporta WebGL 2: si esto falla, no hay WebGL 2.
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); // permite que el navegador lo restaure
      this.onContextLost?.();
    });
    canvas.addEventListener('webglcontextrestored', () => this.onContextRestored?.());

    this.#pmrem = new THREE.PMREMGenerator(this.renderer);
    this.applyProfile(profileName, false); // el perfil autodetectado no se guarda
    this.resize();
  }

  #pmrem;
  #envTexture = null;

  get domElement() { return this.renderer.domElement; }

  /** Cambia de perfil en caliente. Devuelve true si hace falta recargar (antialias). */
  applyProfile(name, persist = true) {
    const needsReload = PROFILES[name].antialias !== this.profile.antialias;
    this.profileName = name;
    this.profile = PROFILES[name];
    if (persist) saveProfile(name);

    this.renderer.shadowMap.enabled = this.profile.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.pixelRatio = this.#targetPixelRatio();
    this.resize();
    return needsReload;
  }

  /** Mapa de entorno procedural (sin descargas) para reflejos PBR. */
  createEnvironment(scene) {
    if (this.#envTexture) { this.#envTexture.dispose(); this.#envTexture = null; }
    if (!this.profile.envMap) { scene.environment = null; return; }
    const room = new RoomEnvironment();
    this.#envTexture = this.#pmrem.fromScene(room, 0.04).texture;
    room.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    scene.environment = this.#envTexture;
    scene.environmentIntensity = 0.6;
  }

  /** Carga un HDRI equirectangular ya cargado (p. ej. de Poly Haven) como entorno. */
  setEnvironmentFromEquirect(scene, texture) {
    if (this.#envTexture) this.#envTexture.dispose();
    this.#envTexture = this.#pmrem.fromEquirectangular(texture).texture;
    texture.dispose();
    scene.environment = this.#envTexture;
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    return { width: w, height: h };
  }

  /** Resolución dinámica: baja/sube el pixelRatio dentro de los límites del perfil. */
  adaptResolution(fps) {
    const { minPixelRatio } = this.profile;
    const max = this.#targetPixelRatio();
    const target = this.profile.maxFps;
    let next = this.pixelRatio;
    if (fps < target * 0.8) next = Math.max(minPixelRatio, this.pixelRatio - 0.1);
    else if (fps > target * 0.95) next = Math.min(max, this.pixelRatio + 0.05);
    if (Math.abs(next - this.pixelRatio) > 0.01) {
      this.pixelRatio = next;
      this.resize();
    }
  }

  render(scene, camera) { this.renderer.render(scene, camera); }

  get maxAnisotropy() {
    return Math.min(this.profile.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
  }

  stats() {
    const info = this.renderer.info;
    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
    };
  }

  dispose() {
    this.#envTexture?.dispose();
    this.#pmrem.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  #targetPixelRatio() {
    return Math.min(this.caps.devicePixelRatio, this.profile.maxPixelRatio);
  }
}
