import * as THREE from 'three';
import { TAU, damp, rand } from '../core/utils.js';
import { CONFIG } from '../data/config.js';
import { TextureFactory } from './textures.js';

/* =====================================================================
   EFECTOS: hoguera, brasas, humo, polvo en el haz y niebla baja
   ===================================================================== */
export const FIRE_VS = `
uniform float uTime; uniform float uSize; uniform float uPR; uniform float uRise; uniform float uRate; uniform float uSpread;
attribute float aSeed; varying float vLife;
void main(){
  float life = fract(uTime * uRate * (0.8 + aSeed * 0.5) + aSeed * 7.31);
  vec3 p = position;
  p.xz *= mix(1.0, 0.25, life * (1.0 - uSpread));
  p.y += life * uRise * (0.7 + aSeed * 0.6);
  float wob = 0.08 * life * (1.0 + uSpread * 6.0);
  p.x += sin(uTime * 2.7 + aSeed * 40.0) * wob; p.z += cos(uTime * 2.3 + aSeed * 23.0) * wob;
  vLife = life;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * mix(1.0, 0.35, life) * uPR / max(0.1, -mv.z);
}`;
export const FIRE_FS = `
uniform vec3 uColA; uniform vec3 uColB; uniform float uGain; varying float vLife;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.0, 0.5, d)) * smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.55, 1.0, vLife));
  vec3 col = mix(uColA, uColB, smoothstep(0.05, 0.7, vLife));
  gl_FragColor = vec4(col * a * uGain, a);
}`;
export const DUST_VS = `
uniform float uTime; uniform vec3 uCam; uniform vec3 uLightPos; uniform vec3 uLightDir; uniform float uCosOuter; uniform float uCosInner;
uniform float uLight; uniform float uBox; uniform float uSize; uniform float uPR;
attribute float aSeed; varying float vA;
void main(){
  vec3 p = position + vec3(sin(uTime * 0.13 + aSeed * 6.0) * 0.6, -uTime * 0.05 * (0.5 + aSeed), cos(uTime * 0.11 + aSeed * 4.0) * 0.6);
  vec3 wp = uCam + mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 tp = wp - uLightPos; float d = length(tp);
  float cone = smoothstep(uCosOuter, uCosInner, dot(tp / max(d, 1e-3), uLightDir));
  vA = cone * uLight * (0.35 + 0.65 * fract(aSeed * 13.7)) / (1.0 + d * d * 0.06) + 0.035;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPR / max(0.2, -mv.z);
}`;
export const DUST_FS = `
varying float vA;
void main(){ float r = length(gl_PointCoord - 0.5); float a = (1.0 - smoothstep(0.0, 0.5, r)) * vA; if (a < 0.003) discard; gl_FragColor = vec4(vec3(1.0, 0.93, 0.82) * a, a); }`;

export class Effects {
  constructor(game) { this.game = game; this.objs = []; this.smoke = []; this.fog = []; }
  track(o) { this.objs.push(o); this.game.scene.add(o); return o; }
  points(n, fill, mat) {
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { fill(pos, i); seed[i] = Math.random(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const p = new THREE.Points(g, mat); p.frustumCulled = false; return p;
  }
  fireMat(o) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSize: { value: o.size }, uPR: { value: this.game.engine.renderer.getPixelRatio() }, uRise: { value: o.rise }, uRate: { value: o.rate }, uSpread: { value: o.spread }, uColA: { value: new THREE.Vector3(...o.a) }, uColB: { value: new THREE.Vector3(...o.b) }, uGain: { value: o.gain } },
      vertexShader: FIRE_VS, fragmentShader: FIRE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
  }
  build(q) {
    const W = this.game.world;
    this.fires = W.fires.map((f) => this.addFire(f));
    const box = 14, dg = this.points(q.dust, (pos, i) => { pos[i * 3] = rand(-box / 2, box / 2); pos[i * 3 + 1] = rand(-box / 2, box / 2); pos[i * 3 + 2] = rand(-box / 2, box / 2); },
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uLightPos: { value: new THREE.Vector3() }, uLightDir: { value: new THREE.Vector3(0, 0, -1) }, uCosOuter: { value: Math.cos(CONFIG.flashlight.angle) }, uCosInner: { value: Math.cos(CONFIG.flashlight.angle * 0.55) }, uLight: { value: 1 }, uBox: { value: box }, uSize: { value: 7 }, uPR: { value: this.game.engine.renderer.getPixelRatio() } },
        vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
    this.dust = this.track(dg);
    const b = (this.bounds = W.bounds);
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TextureFactory.cloud, color: 0x4a565e, transparent: true, opacity: rand(0.05, 0.1), depthWrite: false }));
      const sc2 = rand(6, 10); s.position.set(rand(b.x0, b.x1), rand(0.4, 1.1), rand(b.z0, b.z1)); s.scale.set(sc2, sc2 * 0.45, 1); s.userData.v = rand(0.08, 0.25);
      this.fog.push(this.track(s));
    }
  }
  // Fuego (hoguera o brasero): llamas y brasas en partículas, luz parpadeante (creada siempre: encenderla no recompila shaders) y humo opcional
  addFire(f) {
    const s = f.s, o = { f, lv: f.lit ? 1 : 0, smoke: [] };
    const disc = (r, y) => (pos, i) => { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r; pos[i * 3] = Math.cos(a) * d; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * d; };
    o.light = new THREE.PointLight(0xff8a3c, f.lit ? CONFIG.lighting.fire * s : 0, 18 * Math.sqrt(s), 2); o.light.position.set(f.x, f.y + 1.0 * s, f.z); this.track(o.light);
    o.flames = this.track(this.points(Math.round(60 * s) + 12, disc(0.38 * s, 0.15 * s), this.fireMat({ size: 240 * s, rise: 1.15 * s, rate: 1.0, spread: 0, a: [1, 0.85, 0.45], b: [1, 0.22, 0.04], gain: 1.6 })));
    o.embers = this.track(this.points(Math.round(36 * s) + 6, disc(0.3 * s, 0.3 * s), this.fireMat({ size: 22, rise: 4.5 * s, rate: 0.22, spread: 1, a: [1, 0.72, 0.32], b: [1, 0.3, 0.05], gain: 2.4 })));
    o.flames.position.set(f.x, f.y, f.z); o.embers.position.set(f.x, f.y, f.z);
    if (f.smoke) for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TextureFactory.cloud, color: 0x2b2e31, transparent: true, opacity: 0, depthWrite: false }));
      sp.userData.life = i / 9; o.smoke.push(this.track(sp));
    }
    return o;
  }
  update(dt, t, flashlight, camera) {
    const L = CONFIG.lighting.fire;
    for (const o of this.fires) {
      const f = o.f; o.lv = damp(o.lv, f.lit ? 1 : 0, 2.5, dt);
      o.flames.visible = o.embers.visible = o.lv > 0.02;
      o.light.intensity = L * f.s * o.lv * (0.78 + Math.sin(t * 13.1 + f.x) * 0.07 + Math.sin(t * 7.3 + 1.7) * 0.06 + Math.random() * 0.09);
      o.light.position.x = f.x + Math.sin(t * 5.1) * 0.05;
      o.flames.material.uniforms.uTime.value = t; o.embers.material.uniforms.uTime.value = t;
      for (const s of o.smoke) {
        const Lf = (s.userData.life = (s.userData.life + dt * 0.12) % 1);
        s.position.set(f.x + Math.sin(Lf * 5 + t * 0.3) * 0.4 * Lf, 1.2 + Lf * 6, f.z + Math.cos(Lf * 4) * 0.3 * Lf);
        const k = 1 + Lf * 3.5; s.scale.set(k, k, 1); s.material.opacity = Math.sin(Lf * Math.PI) * 0.22; s.material.rotation = Lf * 1.5;
      }
    }
    const u = this.dust.material.uniforms;
    u.uTime.value = t; u.uCam.value.copy(camera.position); u.uLightPos.value.copy(flashlight.origin); u.uLightDir.value.copy(flashlight.dir); u.uLight.value = flashlight.level;
    const b = this.bounds;
    for (const s of this.fog) { s.position.x += s.userData.v * dt; if (s.position.x > b.x1 + 4) s.position.x = b.x0 - 4; s.material.rotation += dt * 0.02; }
  }
  dispose() {
    this.objs.forEach((o) => { o.removeFromParent(); if (o.isLight) { o.dispose(); return; } if (o.geometry && !o.isSprite) o.geometry.dispose(); o.material.dispose(); });
  }
}
