import * as THREE from 'three';
import { TAU, damp, lerp, rand } from '../core/utils.js';
import { TextureFactory, uvBox, uvScale } from '../render/textures.js';
import { CharacterFactory } from '../characters/characterFactory.js';

/* =====================================================================
   ESCENARIO DEL MENÚ (personaje en 3D bajo un foco)
   ===================================================================== */
export class MenuStage {
  constructor(game) {
    this.game = game;
    const sc = (this.scene = new THREE.Scene());
    sc.background = new THREE.Color(0x060404);
    sc.fog = new THREE.FogExp2(0x060404, 0.09);
    sc.environment = game.envMap;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    this.geos = []; this.mats = [];
    const T = TextureFactory.sets;
    const gm = new THREE.MeshStandardMaterial({ map: T.ground.map, normalMap: T.ground.normalMap, roughnessMap: T.ground.roughnessMap, roughness: 1 });
    const sm = new THREE.MeshStandardMaterial({ map: T.stone.map, normalMap: T.stone.normalMap, roughnessMap: T.stone.roughnessMap, roughness: 1 });
    this.mats.push(gm, sm);
    const gg = new THREE.CircleGeometry(14, 48); gg.rotateX(-Math.PI / 2); uvScale(gg, 7, 7); this.geos.push(gg);
    const ground = new THREE.Mesh(gg, gm); ground.receiveShadow = true; sc.add(ground);
    const wall = (x, z, w, h, ry) => {
      const g = new THREE.BoxGeometry(w, h, 0.42); uvBox(g, w, h, 0.42, 2.2); this.geos.push(g);
      const m = new THREE.Mesh(g, sm); m.position.set(x, h / 2, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; sc.add(m);
    };
    wall(-2.7, -2.8, 2.6, 3.4, 0.25); wall(-0.6, -3.4, 1.6, 2.2, 0.08); wall(1.7, -3.1, 2.2, 3.0, -0.12); wall(3.5, -2.3, 1.4, 1.4, -0.4); wall(-1.5, -3.3, 0.5, 4.3, 0);
    const rg = new THREE.DodecahedronGeometry(1, 0); this.geos.push(rg);
    for (let i = 0; i < 14; i++) {
      const r = rand(0.08, 0.32), m = new THREE.Mesh(rg, sm), a = rand(0, TAU), d = rand(1.2, 3.6);
      m.position.set(Math.cos(a) * d, r * 0.4, Math.sin(a) * d - 0.6); m.scale.set(r, r * rand(0.6, 1), r * rand(0.8, 1.3)); m.rotation.set(rand(0, 3), rand(0, 3), 0);
      m.castShadow = m.receiveShadow = true; sc.add(m);
    }
    // Iluminación de cine: clave cenital estrecha y cálida, relleno frío y bajo para el rostro, recorte rojo sangre y contraluz de acero
    const key = (this.key = new THREE.SpotLight(0xffe6d2, 70, 22, 0.3, 0.7, 2));
    key.position.set(1.6, 4.8, 3.2); key.target.position.set(0, 1.1, 0);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.map = TextureFactory.cookie;
    sc.add(key, key.target);
    const face = (this.faceLight = new THREE.SpotLight(0xc9d4e2, 7, 6, 0.22, 0.9, 2)); // relleno focal del rostro (sin sombras)
    face.position.set(-1.1, 1.45, 2.4); face.target.position.set(0, 1.62, 0); sc.add(face, face.target);
    const rim = new THREE.DirectionalLight(0xb01414, 2.6); rim.position.set(-2.6, 2.8, -3.6); sc.add(rim);   // recorte rojo sangre
    const rim2 = new THREE.DirectionalLight(0xa9b4c2, 1.1); rim2.position.set(2.8, 2.4, -3.2); sc.add(rim2); // contraluz de acero
    const bounce = new THREE.PointLight(0x5a0a0a, 2.2, 5, 2); bounce.position.set(0, 0.25, 1.2); sc.add(bounce); // rebote rojizo del suelo
    // Ceniza flotando
    const n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = rand(-4, 4); pos[i * 3 + 1] = rand(0, 4.5); pos[i * 3 + 2] = rand(-3, 3); }
    const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.geos.push(ag);
    const am = new THREE.PointsMaterial({ size: 0.035, map: TextureFactory.dot, color: 0xbab4ac, transparent: true, opacity: 0.55, depthWrite: false }); this.mats.push(am);
    this.ash = new THREE.Points(ag, am); sc.add(this.ash);
    this.holder = new THREE.Group(); sc.add(this.holder);
    this.model = null; this.spin = 0.35; this.spinVel = 0; this.flick = 0; this.t = 0; this.faceMode = false; this.rect = null;
  }
  // Muestra el procedural al instante; si el personaje tiene .glb, lo sustituye al terminar de cargar
  setCharacter(def) {
    const token = (this.token = (this.token || 0) + 1);
    if (this.model) this.model.dispose();
    this.model = CharacterFactory.create(def);
    this.holder.add(this.model.root);
    this.flick = 0.55;
    this.layout(this.rect);
    if (def.look.model && def.look.model.url) {
      this.game.events.emit('model:loading', { def });
      CharacterFactory.createGLTF(def).then((m) => {
        if (token !== this.token) { m.dispose(); return; }
        this.model.dispose(); this.model = m; this.holder.add(m.root); this.layout(this.rect);
        this.game.events.emit('model:loaded', { def });
      }).catch((err) => { console.warn('[BLOOD DEAD] Modelo GLB no válido', err); if (token === this.token) this.game.events.emit('model:error', { def, err }); });
    }
  }
  setFaceMode(on) { this.faceMode = on; this.layout(this.rect); }
  drag(dx) { this.spinVel = dx * 0.012; this.spin += dx * 0.012; }
  // Encaja el cuerpo entero (o un primer plano del rostro) dentro del hueco del escenario en pantalla
  layout(rect) {
    this.rect = rect;
    const W = this.game.engine.width, H = this.game.engine.height;
    this.camera.aspect = W / H;
    if (!rect || rect.width < 10 || rect.height < 10) rect = { left: 0, top: 0, width: W, height: H };
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), face = !!this.faceMode;
    const span = face ? 0.4 : 1.85, centerY = face ? (this.model ? this.model.faceY : 1.69) : 0.92;
    const targetPx = face ? Math.max(140, Math.min(rect.height * 0.9, rect.width * 1.2)) : Math.max(140, Math.min(rect.height * 0.86, rect.width * 1.8));
    const D = (span * H) / (2 * tan * targetPx);
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height * 0.5;
    const ox = ((cx / W) * 2 - 1) * D * tan * this.camera.aspect, oy = (1 - (cy / H) * 2) * D * tan;
    this.camGoal = [-ox, centerY - oy + (face ? 0.015 : 0.12), D, -ox, centerY - oy, 0];
    if (!this.camNow) this.camNow = this.camGoal.slice();
    this.camera.updateProjectionMatrix();
    this.applyCamera();
  }
  applyCamera() { const c = this.camNow; this.camera.position.set(c[0], c[1], c[2]); this.camera.lookAt(c[3], c[4], c[5]); }
  update(dt) {
    this.t += dt;
    if (this.camGoal) { for (let i = 0; i < 6; i++) this.camNow[i] = damp(this.camNow[i], this.camGoal[i], 6, dt); this.applyCamera(); }
    // En primer plano la clave se cierra sobre el rostro y el relleno sube: modela pómulos, mandíbula y ojos
    const fy = this.model ? this.model.faceY : 1.68, fm = this.faceMode ? 1 : 0;
    this.key.target.position.y = damp(this.key.target.position.y, lerp(1.1, fy, fm), 5, dt); this.key.angle = damp(this.key.angle, lerp(0.3, 0.17, fm), 5, dt);
    this.faceLight.target.position.y = fy; this.faceLight.intensity = damp(this.faceLight.intensity, lerp(7, 16, fm), 5, dt);
    this.spinVel = damp(this.spinVel, 0, 3, dt);
    this.spin += this.spinVel * dt * 10 + Math.sin(this.t * 0.35) * 0.0015;
    this.holder.rotation.y = this.spin;
    if (this.model) this.model.animate(dt, { speed: 0, idleLook: true });
    if (this.flick > 0) { this.flick -= dt; this.key.intensity = 70 * (Math.random() < 0.5 ? 0.15 : 1); } // parpadeo al cambiar de personaje
    else this.key.intensity = 70 * (0.97 + Math.sin(this.t * 9) * 0.015);
    const p = this.ash.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - dt * 0.12; if (y < 0) y = 4.5;
      p.setXYZ(i, p.getX(i) + Math.sin(this.t * 0.6 + i) * dt * 0.06, y, p.getZ(i));
    }
    p.needsUpdate = true;
  }
  dispose() { if (this.model) this.model.dispose(); this.geos.forEach((g) => g.dispose()); this.mats.forEach((m) => m.dispose()); this.key.dispose(); this.faceLight.dispose(); }
}
