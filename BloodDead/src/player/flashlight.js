import * as THREE from 'three';
import { damp, rand } from '../core/utils.js';
import { CONFIG } from '../data/config.js';
import { TextureFactory } from '../render/textures.js';

/* =====================================================================
   LINTERNA: foco con sombras dinámicas, patrón (cookie), haz volumétrico
   ===================================================================== */
export const BEAM_VS = `
uniform float uLen; varying float vZ; varying vec3 vN; varying vec3 vV;
void main(){ vZ = position.z / uLen; vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
export const BEAM_FS = `
uniform float uIntensity; uniform vec3 uColor; uniform float uTime; varying float vZ; varying vec3 vN; varying vec3 vV;
void main(){
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
  float fall = pow(1.0 - clamp(vZ, 0.0, 1.0), 1.7) * smoothstep(0.0, 0.05, vZ);
  float n = 0.85 + 0.15 * sin(vZ * 24.0 - uTime * 1.3);
  float a = edge * fall * n * uIntensity;
  gl_FragColor = vec4(uColor * a, a);
}`;

export class Flashlight {
  constructor(game, { shadow = true } = {}) {
    const F = CONFIG.flashlight, q = game.quality;
    this.game = game; this.on = true; this.battery = 100; this.flickerT = 0; this.nextFlicker = rand(15, 40); this.level = 1; this.first = true; this.enabled = true;
    const l = (this.light = new THREE.SpotLight(F.color, F.intensity, F.distance, F.angle, F.penumbra, 2));
    l.castShadow = shadow; // la del jugador 2 no proyecta sombras (dos mapas de sombra por vista costarían el doble)
    if (shadow) {
      l.shadow.mapSize.set(q.spotMapSize, q.spotMapSize);
      l.shadow.camera.near = 0.15; l.shadow.camera.far = F.distance; l.shadow.bias = -0.0004; l.shadow.normalBias = 0.035;
      l.shadow.camera.layers.enable(1); // la linterna sí proyecta la sombra de los infectados
    }
    l.map = TextureFactory.cookie;
    game.scene.add(l, l.target);
    const len = F.beamLength, g = new THREE.ConeGeometry(Math.tan(F.angle) * len, len, 40, 1, true);
    g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2);
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: { uLen: { value: len }, uIntensity: { value: F.beamOpacity }, uColor: { value: new THREE.Color(F.color) }, uTime: { value: 0 } },
      vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this.beam = new THREE.Mesh(g, this.beamMat); this.beam.frustumCulled = false; this.beam.renderOrder = 2; game.scene.add(this.beam);
    this.origin = new THREE.Vector3(); this.aim = new THREE.Vector3(); this.dir = new THREE.Vector3(0, 0, -1); this._v = new THREE.Vector3();
  }
  toggle() { this.on = !this.on; this.game.events.emit('flashlight:toggle', this.on); }
  addBattery(a) { this.battery = Math.min(100, this.battery + a); }
  // ¿Ilumina este punto? (el Acometedor de Sombras queda al descubierto bajo el haz)
  lights(p, maxD) {
    if (!this.enabled || this.level < 0.3) return false;
    const dx = p.x - this.origin.x, dy = p.y - this.origin.y, dz = p.z - this.origin.z, d = Math.hypot(dx, dy, dz);
    return d < maxD && (dx * this.dir.x + dy * this.dir.y + dz * this.dir.z) / Math.max(d, 1e-3) > Math.cos(CONFIG.flashlight.angle * 1.15);
  }
  setEnabled(v) { this.enabled = v; this.light.visible = v; this.beam.visible = v; if (!v) this.light.intensity = 0; } // luz oculta = fuera del cálculo de iluminación
  update(dt, rig, player) {
    if (!this.enabled) return;
    const F = CONFIG.flashlight, w = this.game.world, cam = rig.camera, p = player.position;
    const fx = -Math.sin(rig.yaw), fz = -Math.cos(rig.yaw), side = 0.1 * rig.sideBlend;
    this.origin.set(p.x + fx * 0.34 + rig.right.x * side, p.y + 1.32 - rig.drop * 0.8, p.z + fz * 0.34 + rig.right.z * side);
    const hit = w.raycast(cam.position, rig.fwd, 40);
    this._v.copy(cam.position).addScaledVector(rig.fwd, hit === Infinity ? 30 : Math.max(1.5, hit));
    if (this.first) { this.aim.copy(this._v); this.first = false; } else this.aim.lerp(this._v, 1 - Math.exp(-16 * dt));
    this.light.position.copy(this.origin); this.light.target.position.copy(this.aim); this.light.target.updateMatrixWorld();
    if (this.on) this.battery = Math.max(0, this.battery - F.drain * dt);
    this.nextFlicker -= dt;
    if (this.nextFlicker <= 0) { this.flickerT = rand(0.25, 0.7); this.nextFlicker = this.battery < 20 ? rand(4, 10) : rand(18, 50); this.game.events.emit('flashlight:flicker'); }
    let mult = 1;
    if (this.flickerT > 0) { this.flickerT -= dt; mult = Math.random() < 0.45 ? rand(0.05, 0.35) : 1; }
    const batt = this.battery <= 0 ? 0.22 : this.battery < 15 ? 0.6 + this.battery / 37.5 : 1;
    const target = this.on ? mult * batt : 0;
    this.level = target < this.level ? target : damp(this.level, target, 20, dt);
    this.light.intensity = F.intensity * this.level;
    this.dir.subVectors(this.aim, this.origin).normalize();
    const bh = w.raycast(this.origin, this.dir, F.beamLength), len = bh === Infinity ? F.beamLength : Math.max(0.4, bh);
    this.beam.position.copy(this.origin); this.beam.lookAt(this.aim); this.beam.scale.setScalar(len / F.beamLength);
    this.beamMat.uniforms.uIntensity.value = F.beamOpacity * this.level; this.beamMat.uniforms.uTime.value += dt;
  }
  dispose() { this.light.removeFromParent(); this.light.target.removeFromParent(); this.light.dispose(); this.beam.removeFromParent(); this.beam.geometry.dispose(); this.beamMat.dispose(); }
}
