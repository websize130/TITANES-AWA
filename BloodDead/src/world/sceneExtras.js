import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp, damp, rand } from '../core/utils.js';
import { ISLAND, islandR } from './island.js';

/* =====================================================================
   EXTRAS DE ESCENA (niveles de día · la isla)
   · Cielo: degradado físico aproximado, sol con halo y nubes procedurales que se desplazan
   · Océano: oleaje Gerstner, color según profundidad real del fondo (aguas turquesa → azul profundo),
     reflejo del cielo (Fresnel), brillo del sol y espuma en la orilla
   · Fauna: gaviotas en vuelo, cangrejos que huyen del jugador y peces que saltan
   Todo instanciado (pocas llamadas de dibujo) y actualizado sin crear objetos por fotograma.
   ===================================================================== */
const SKY_VS = /* glsl */`
varying vec3 vDir;
void main() { vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }`;
const SKY_FS = /* glsl */`
uniform vec3 uSun; uniform float uTime;
varying vec3 vDir;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir); float y = max(d.y, -0.05);
  vec3 zen = vec3(0.045, 0.19, 0.62), hor = vec3(0.42, 0.62, 0.88);
  vec3 col = mix(hor, zen, pow(max(y, 0.0), 0.55));
  float sd = max(dot(d, uSun), 0.0);
  col += vec3(1.0, 0.85, 0.6) * (pow(sd, 6.0) * 0.35 + pow(sd, 64.0) * 0.9) + vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9997, sd) * 30.0;
  if (d.y > 0.0) { // nubes: capa plana proyectada, más finas cerca del horizonte
    vec2 uv = d.xz / (d.y + 0.08) * 0.55 + vec2(uTime * 0.004, uTime * 0.0015);
    float c = smoothstep(0.52, 0.82, fbm(uv * 1.3)) * smoothstep(0.0, 0.25, d.y);
    vec3 cc = mix(vec3(0.82, 0.86, 0.92), vec3(1.0, 0.98, 0.95), pow(sd, 3.0)) * (0.85 + 0.25 * fbm(uv * 3.1));
    col = mix(col, cc, c * 0.85);
  }
  col = mix(col, vec3(0.52, 0.68, 0.86), smoothstep(0.06, -0.04, d.y)); // bruma del horizonte (coincide con la niebla)
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const WATER_VS = /* glsl */`
uniform float uTime; uniform sampler2D uDepth; uniform vec4 uDepthRect;
varying vec3 vWorld; varying vec3 vNormal; varying float vDepth; varying float vCrest;
#include <fog_pars_vertex>
vec3 gerstner(vec2 p, vec2 dir, float amp, float len, float spd, inout vec3 tan, inout vec3 bit) {
  float k = 6.2831 / len, f = k * (dot(dir, p) - spd * uTime), a = amp;
  tan += vec3(-dir.x * dir.x * (a * k) * sin(f), dir.x * (a * k) * cos(f), -dir.x * dir.y * (a * k) * sin(f));
  bit += vec3(-dir.x * dir.y * (a * k) * sin(f), dir.y * (a * k) * cos(f), -dir.y * dir.y * (a * k) * sin(f));
  return vec3(dir.x * a * cos(f), a * sin(f), dir.y * a * cos(f));
}
void main() {
  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
  vec2 duv = (p.xz - uDepthRect.xy) / uDepthRect.zw;
  float depth = (duv.x < 0.0 || duv.y < 0.0 || duv.x > 1.0 || duv.y > 1.0) ? 12.0 : texture2D(uDepth, duv).r * 12.0;
  float damp = smoothstep(0.0, 2.5, depth); // las olas se calman al llegar a la arena
  vec3 tan = vec3(1, 0, 0), bit = vec3(0, 0, 1), o = vec3(0.0);
  o += gerstner(p.xz, normalize(vec2(0.6, 0.8)), 0.09 * damp + 0.02, 11.0, 2.2, tan, bit);
  o += gerstner(p.xz, normalize(vec2(-0.7, 0.55)), 0.05 * damp + 0.012, 6.5, 1.7, tan, bit);
  o += gerstner(p.xz, normalize(vec2(0.2, -0.95)), 0.025 * damp + 0.006, 3.3, 1.2, tan, bit);
  p += o; vCrest = o.y;
  vWorld = p; vDepth = depth; vNormal = normalize(cross(bit, tan));
  vec4 mvPosition = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WATER_FS = /* glsl */`
uniform float uTime; uniform vec3 uSun; uniform vec3 uCam;
varying vec3 vWorld; varying vec3 vNormal; varying float vDepth; varying float vCrest;
#include <fog_pars_fragment>
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
vec2 ripple(vec2 p) { // microolas: gradiente de ruido animado en dos direcciones
  float e = 0.08, t = uTime;
  vec2 a = p * 0.9 + vec2(t * 0.35, t * 0.22), b = p * 2.1 - vec2(t * 0.28, -t * 0.4);
  float n0 = vn(a) + 0.5 * vn(b);
  return vec2(vn(a + vec2(e, 0)) + 0.5 * vn(b + vec2(e, 0)) - n0, vn(a + vec2(0, e)) + 0.5 * vn(b + vec2(0, e)) - n0) / e;
}
void main() {
  vec2 r = ripple(vWorld.xz) * 0.11;
  vec3 n = normalize(vNormal + vec3(r.x, 0.0, r.y));
  vec3 v = normalize(uCam - vWorld), l = normalize(uSun);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 R = reflect(-v, n); float ry = max(R.y, 0.0);
  vec3 sky = mix(vec3(0.42, 0.62, 0.88), vec3(0.045, 0.19, 0.62), pow(ry, 0.6));
  float d = vDepth;
  vec3 shallow = vec3(0.10, 0.62, 0.62), mid = vec3(0.02, 0.32, 0.45), deep = vec3(0.01, 0.10, 0.22);
  vec3 body = mix(shallow, mid, smoothstep(0.2, 2.2, d)); body = mix(body, deep, smoothstep(2.0, 9.0, d));
  body *= 0.55 + 0.45 * max(dot(n, l), 0.0);
  vec3 col = mix(body, sky, fres * 0.9);
  float spec = pow(max(dot(R, l), 0.0), 380.0) * 7.0 + pow(max(dot(R, l), 0.0), 40.0) * 0.25;
  col += vec3(1.0, 0.93, 0.8) * spec;
  // Espuma: franjas que avanzan hacia la orilla y crestas de las olas grandes
  float shore = smoothstep(0.9, 0.0, d), bands = smoothstep(0.55, 0.95, sin(d * 9.0 - uTime * 2.2 + vn(vWorld.xz * 0.7) * 4.0) * 0.5 + 0.5);
  float foam = clamp(shore * (0.45 + 0.55 * bands) + smoothstep(0.08, 0.13, vCrest) * 0.3, 0.0, 1.0) * (0.6 + 0.4 * vn(vWorld.xz * 3.0 + uTime));
  col = mix(col, vec3(0.95, 0.97, 0.98), foam);
  float alpha = mix(0.55, 0.96, smoothstep(0.0, 1.4, d)); alpha = max(alpha, foam);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class SceneExtras {
  constructor(game, L = {}, q = {}) {
    this.game = game; this.objs = []; this.disp = []; this.t = 0; this.on = !!L.day;
    const W = game.world; this.floaters = W.floaters || [];
    if (!this.on) return;
    const sun = new THREE.Vector3(...(L.lightDir || [-0.5, -1, -0.3])).normalize().negate();
    this.sun = sun;
    // Cielo: cúpula que sigue a la cámara (se dibuja al fondo)
    const skyMat = new THREE.ShaderMaterial({ uniforms: { uSun: { value: sun }, uTime: { value: 0 } }, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false });
    this.sky = this.track(new THREE.Mesh(new THREE.SphereGeometry(390, 48, 24), skyMat)); this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    game.scene.background = null;
    if (W.ocean) this.buildOcean(W, q);
    if (W.fauna) this.buildFauna(W);
  }
  track(o) { this.game.scene.add(o); this.objs.push(o); return o; }
  buildOcean(W, q) {
    // Profundidad real bajo el agua (textura 256×256 sobre 170 m): da el color turquesa en la orilla y calma las olas
    const N = 256, span = 170, x0 = -span / 2, data = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = x0 + ((i + 0.5) / N) * span, z = x0 + ((j + 0.5) / N) * span, d = clamp(ISLAND.water - W.islandHeight(x, z), 0, 12) / 12, k = (j * N + i) * 4;
      data[k] = Math.round(d * 255); data[k + 1] = data[k + 2] = 0; data[k + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true; this.disp.push(tex);
    const seg = q.pixelRatio >= 2 ? 300 : 220, g = new THREE.PlaneGeometry(900, 900, seg, seg); g.rotateX(-Math.PI / 2);
    // Más resolución cerca de la isla: empuja los vértices hacia el centro (malla radial más densa en la costa)
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), k = r > 1 ? Math.pow(r / 450, 1.7) * 450 / r : 1; p.setXYZ(i, x * k, 0, z * k); }
    g.computeBoundingSphere();
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uSun: { value: this.sun }, uCam: { value: new THREE.Vector3() }, uDepth: { value: tex }, uDepthRect: { value: new THREE.Vector4(x0, x0, span, span) } }]),
      vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false, fog: true,
    });
    this.waterMat.uniforms.uDepth.value = tex;
    this.water = this.track(new THREE.Mesh(g, this.waterMat)); this.water.position.y = ISLAND.water; this.water.renderOrder = 2; this.water.frustumCulled = false;
  }
  /* ---------- Fauna ---------- */
  buildFauna(W) {
    const std = (p) => { const m = new THREE.MeshStandardMaterial(p); const csm = this.game.lighting.csm; if (csm) csm.setupMaterial(m); this.disp.push(m); return m; };
    const col = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const sph = (r, sx, sy, sz, x, y, z, hex) => col(new THREE.SphereGeometry(r, 12, 9).scale(sx, sy, sz).translate(x, y, z), hex);
    const cone = (r, h, x, y, z, rx, rz, hex) => col(new THREE.ConeGeometry(r, h, 8).rotateX(rx).rotateZ(rz).translate(x, y, z), hex);
    // Gaviotas: cuerpo blanco, lomo gris, pico amarillo con punta roja; alas grises con puntas negras
    const gullBody = mergeGeometries([sph(0.11, 1, 0.9, 2.3, 0, 0, 0, 0xf1f1ee), sph(0.075, 1, 1, 1.1, 0, 0.05, 0.25, 0xf4f4f1), cone(0.022, 0.12, 0, 0.04, 0.37, Math.PI / 2, 0, 0xe8b730), sph(0.012, 1, 1, 1, 0.034, 0.075, 0.3, 0x111111), sph(0.012, 1, 1, 1, -0.034, 0.075, 0.3, 0x111111), col(new THREE.BoxGeometry(0.16, 0.02, 0.16).translate(0, 0, -0.3), 0xbfc4c8)], false);
    const wingShape = (s) => { const sh = new THREE.Shape(); sh.moveTo(0, 0.08); sh.lineTo(0.36, 0.05); sh.lineTo(0.62, -0.02); sh.lineTo(0.3, -0.12); sh.lineTo(0, -0.1); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); if (s < 0) g.scale(-1, 1, 1);
      const p = g.attributes.position, a = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const tip = Math.abs(p.getX(i)) > 0.45 ? 0.12 : 0.72; a[i * 3] = tip; a[i * 3 + 1] = tip * 1.02; a[i * 3 + 2] = tip * 1.05; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const gm = std({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }), NG = 14;
    this.gulls = { n: NG, body: new THREE.InstancedMesh(gullBody, gm, NG), wl: new THREE.InstancedMesh(wingShape(1), gm, NG), wr: new THREE.InstancedMesh(wingShape(-1), gm, NG), list: [] };
    for (const k of ['body', 'wl', 'wr']) { const m = this.gulls[k]; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.frustumCulled = false; this.track(m); this.disp.push(m.geometry); }
    for (let i = 0; i < NG; i++) this.gulls.list.push({ cx: rand(-40, 40), cz: rand(-40, 40), r: rand(8, 22), h: rand(9, 22), a: rand(0, TAU), w: rand(0.18, 0.32) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, TAU), glide: 0 });
    // Cangrejos: caparazón rojo anaranjado, ocho patas, dos pinzas
    const legs = []; for (const s of [1, -1]) for (let k = 0; k < 4; k++) legs.push(col(new THREE.CylinderGeometry(0.008, 0.012, 0.12, 5).rotateZ(s * 1.1).translate(s * 0.085, -0.015, -0.04 + k * 0.03), 0xb4421c));
    const crabG = mergeGeometries([sph(0.07, 1.25, 0.5, 1, 0, 0.03, 0, 0xc24a1e), ...legs, sph(0.028, 1.4, 0.8, 1, 0.075, 0.03, 0.08, 0xd2562a), sph(0.028, 1.4, 0.8, 1, -0.075, 0.03, 0.08, 0xd2562a), sph(0.009, 1, 1, 1, 0.02, 0.07, 0.05, 0x111111), sph(0.009, 1, 1, 1, -0.02, 0.07, 0.05, 0x111111)], false);
    const NC = 12; this.crabs = { n: NC, mesh: new THREE.InstancedMesh(crabG, std({ vertexColors: true, roughness: 0.35, metalness: 0.05 }), NC), list: [] };
    this.crabs.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.crabs.mesh.castShadow = true; this.crabs.mesh.frustumCulled = false; this.track(this.crabs.mesh); this.disp.push(crabG);
    for (let i = 0; i < NC; i++) { const a = rand(0, TAU), k = rand(0.84, 0.895); this.crabs.list.push({ a, k, x: Math.cos(a) * ISLAND.A * k, z: Math.sin(a) * ISLAND.B * k, dir: 1, t: rand(0, 3), hide: 0, yaw: a + Math.PI / 2, y: 0 }); }
    // Peces que saltan fuera del agua (con salpicadura)
    const fishG = mergeGeometries([sph(0.1, 0.45, 0.6, 2.0, 0, 0, 0, 0xa9b8c2), col(new THREE.ConeGeometry(0.07, 0.14, 4).rotateX(-Math.PI / 2).scale(0.3, 1, 1).translate(0, 0, -0.24), 0x8f9fa9)], false);
    const NF = 4; this.fish = { n: NF, mesh: new THREE.InstancedMesh(fishG, std({ vertexColors: true, roughness: 0.25, metalness: 0.6 }), NF), list: [] };
    this.fish.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.fish.mesh.frustumCulled = false; this.track(this.fish.mesh); this.disp.push(fishG);
    const splashM = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, map: null }); this.disp.push(splashM);
    for (let i = 0; i < NF; i++) { const s = this.track(new THREE.Sprite(splashM.clone())); this.disp.push(s.material); s.visible = false; this.fish.list.push({ t: rand(1, 8), dur: 0, x: 0, z: 0, yaw: 0, splash: s, st: 0 }); }
    this.off = [new THREE.Matrix4().makeTranslation(0.05, 0.02, 0.05), new THREE.Matrix4().makeTranslation(-0.05, 0.02, 0.05)];
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(0, 0, 0, 'YXZ'); this.p = new THREE.Vector3(); this.s = new THREE.Vector3(1, 1, 1); this.w4 = new THREE.Matrix4();
  }
  update(dt, time) {
    for (const f of this.floaters) { // Zona Cero: restos y edificios que flotan, giran y laten
      f.ph += dt * f.sp; f.m.position.y = f.y + Math.sin(f.ph) * f.amp; f.m.rotation.y += f.spin * dt;
      if (f.pulse) f.m.scale.setScalar(f.s0 * (1 + Math.max(0, Math.sin(f.ph * 4)) ** 6 * f.pulse));
    }
    if (!this.on) return;
    this.t += dt; const cam = this.game.camera;
    if (cam) this.sky.position.copy(cam.position);
    this.sky.material.uniforms.uTime.value = this.t;
    if (this.water) { const U = this.waterMat.uniforms; U.uTime.value = this.t; if (cam) U.uCam.value.copy(cam.position); }
    if (this.gulls) this.updateFauna(dt);
  }
  updateFauna(dt) {
    const G = this.gulls, M = this.m4, e = this.e, q = this.q, p = this.p, s = this.s;
    for (let i = 0; i < G.n; i++) { // vuelo en círculos amplios, batidas y planeos
      const g = G.list[i]; g.a += g.w * dt; g.glide -= dt; if (g.glide < -3) g.glide = rand(1.5, 4);
      const x = g.cx + Math.cos(g.a) * g.r, z = g.cz + Math.sin(g.a) * g.r, y = g.h + Math.sin(g.a * 2.3 + g.ph) * 0.8;
      const sg = Math.sign(g.w), yaw = Math.atan2(-Math.sin(g.a) * sg, Math.cos(g.a) * sg); // rumbo = tangente del círculo
      e.set(0, yaw, -sg * 0.32); q.setFromEuler(e); // inclinado hacia dentro del giro
      M.compose(p.set(x, y, z), q, s); G.body.setMatrixAt(i, M);
      g.ph += dt * (g.glide > 0 ? 1.5 : 9); const flap = g.glide > 0 ? 0.12 + Math.sin(g.ph) * 0.05 : Math.sin(g.ph) * 0.65;
      for (let k = 0; k < 2; k++) { const sd = k ? -1 : 1; this.w4.makeRotationZ(sd * flap); this.w4.premultiply(this.off[k]); this.w4.premultiply(M); (k ? G.wr : G.wl).setMatrixAt(i, this.w4); }
    }
    G.body.instanceMatrix.needsUpdate = G.wl.instanceMatrix.needsUpdate = G.wr.instanceMatrix.needsUpdate = true;
    // Cangrejos: corretean de lado por la orilla; si te acercas, huyen y se entierran
    const C = this.crabs, ps = this.game.activePlayers;
    for (let i = 0; i < C.n; i++) {
      const c = C.list[i]; let near = 99; for (const P of ps) near = Math.min(near, Math.hypot(P.position.x - c.x, P.position.z - c.z));
      c.t -= dt; if (c.t <= 0) { c.t = rand(0.6, 2.4); c.dir = Math.random() < 0.5 ? -1 : 1; }
      const flee = near < 4 ? 1 : 0, sp = (flee ? 2.4 : Math.random() < 0.02 ? 0 : 0.45) * c.dir;
      c.hide = damp(c.hide, near < 2.5 ? 1 : 0, near < 2.5 ? 3 : 0.6, dt); // se entierra en la arena
      c.a += (sp * dt) / (ISLAND.A * c.k); c.x = Math.cos(c.a) * ISLAND.A * c.k; c.z = Math.sin(c.a) * ISLAND.B * c.k;
      const r = islandR(c.x, c.z); c.y = -0.08 * clamp((r - 0.86) / 0.04, 0, 1) - c.hide * 0.12;
      e.set(0, -c.a, Math.sin(this.t * 22 + i) * 0.06 * Math.abs(sp)); q.setFromEuler(e);
      M.compose(p.set(c.x, c.y + 0.02, c.z), q, s); C.mesh.setMatrixAt(i, M);
    }
    C.mesh.instanceMatrix.needsUpdate = true;
    // Peces: un salto en arco cada pocos segundos, cerca de la costa, con salpicadura al entrar y salir
    const F = this.fish;
    for (let i = 0; i < F.n; i++) {
      const f = F.list[i]; f.t -= dt;
      if (f.t <= 0 && f.dur <= 0) { const a = rand(0, TAU), k = rand(1.02, 1.25); f.x = Math.cos(a) * ISLAND.A * k; f.z = Math.sin(a) * ISLAND.B * k; f.yaw = rand(0, TAU); f.dur = 0.85; f.el = 0; this.splash(f); }
      if (f.dur > 0) {
        f.el += dt; const k = f.el / f.dur, y = ISLAND.water + Math.sin(k * Math.PI) * 0.9, fx = f.x + Math.sin(f.yaw) * k * 2.2, fz = f.z + Math.cos(f.yaw) * k * 2.2;
        e.set(-Math.cos(k * Math.PI) * 0.9, f.yaw, Math.sin(this.t * 30) * 0.15); q.setFromEuler(e); M.compose(p.set(fx, y, fz), q, s);
        if (f.el >= f.dur) { f.dur = 0; f.t = rand(4, 11); f.x = fx; f.z = fz; this.splash(f); M.makeScale(0, 0, 0); }
      } else M.makeScale(0, 0, 0);
      F.mesh.setMatrixAt(i, M);
      if (f.st > 0) { f.st -= dt; const k = 1 - f.st / 0.6; f.splash.scale.set(0.4 + k * 1.6, 0.25 + k * 0.7, 1); f.splash.material.opacity = (1 - k) * 0.7; if (f.st <= 0) f.splash.visible = false; }
    }
    F.mesh.instanceMatrix.needsUpdate = true;
  }
  splash(f) { f.st = 0.6; f.splash.visible = true; f.splash.position.set(f.x, ISLAND.water + 0.15, f.z); }
  dispose() {
    for (const o of this.objs) { o.removeFromParent(); if (o.isMesh && !o.isInstancedMesh) { o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); } }
    for (const d of this.disp) if (d && d.dispose) d.dispose();
    this.objs = []; this.disp = [];
  }
}
