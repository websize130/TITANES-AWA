import * as THREE from 'three';
import { CONFIG } from '../data/config.js';

/* =====================================================================
   ILUMINACIÓN: luna con sombras en cascada (CSM) + respaldo direccional
   ===================================================================== */
export let CSMClass;
export async function loadCSM() {
  if (CSMClass !== undefined) return CSMClass;
  try { CSMClass = (await import('three/addons/csm/CSM.js')).CSM; }
  catch (e) { console.warn('CSM no disponible; se usa sombra direccional simple.', e); CSMClass = null; }
  return CSMClass;
}

export class Lighting {
  constructor(game) { this.game = game; this.csm = null; this.moon = null; this.moonDir = new THREE.Vector3(...CONFIG.lighting.moonDir).normalize(); }
  async init(q) {
    const { scene, camera } = this.game, LD = this.game.levelDef, L = { ...CONFIG.lighting, ...(LD ? { moon: LD.moon, moonColor: LD.moonColor } : {}) };
    if (q.csmCascades > 0 && !this.game.disableCSM) {
      const CSM = await loadCSM();
      if (CSM) {
        try {
          this.csm = new CSM({ maxFar: 45, cascades: q.csmCascades, mode: 'practical', parent: scene, shadowMapSize: q.csmMapSize, lightDirection: this.moonDir.clone(), camera, lightIntensity: L.moon, lightNear: 1, lightFar: 200, lightMargin: 50, shadowBias: -0.0003 });
          this.csm.fade = true;
          this.csm.lights.forEach((l) => { l.color.set(L.moonColor); l.shadow.normalBias = 0.04; });
        } catch (e) { console.warn('Error al crear CSM', e); this.csm = null; }
      }
    }
    if (!this.csm) {
      const m = (this.moon = new THREE.DirectionalLight(L.moonColor, L.moon));
      if (q.csmCascades > 0) {
        m.castShadow = true; m.shadow.mapSize.set(q.csmMapSize, q.csmMapSize);
        Object.assign(m.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
        m.shadow.camera.updateProjectionMatrix(); // la sombra direccional no la recalcula sola
        m.shadow.bias = -0.0004; m.shadow.normalBias = 0.04;
      }
      scene.add(m, m.target);
    }
  }
  update(playerPos) {
    if (!this.moon) return;
    this.moon.target.position.copy(playerPos);
    this.moon.position.copy(playerPos).addScaledVector(this.moonDir, -40);
    this.moon.target.updateMatrixWorld();
  }
  beforeRender() { if (this.csm) this.csm.update(); }
  onCameraChange() { if (this.csm) this.csm.updateFrustums(); }
  dispose() {
    if (this.csm) { try { this.csm.remove(); this.csm.dispose(); this.csm.lights.forEach((l) => l.dispose()); } catch (e) { /* ignorado */ } }
    if (this.moon) this.moon.dispose();
  }
}
