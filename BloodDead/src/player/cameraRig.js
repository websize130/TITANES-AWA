import * as THREE from 'three';
import { clamp, damp, dampAngle, lerp, rand, smooth } from '../core/utils.js';
import { CONFIG } from '../data/config.js';
import { Settings } from '../core/settings.js';

/* =====================================================================
   CÁMARA AL HOMBRO con colisión contra muros (no atraviesa paredes).
   ADS ultrarrápido (0,17 s) y FOV horizontal 80 → 60 (constante en cualquier relación de aspecto,
   también con la pantalla dividida)
   ===================================================================== */
export class CameraRig {
  constructor(game, player) {
    this.game = game; this.player = player; this.camera = player.camera; this.world = game.world;
    this.yaw = game.world.spawn.yaw; this.pitch = -0.06; this.side = 1; this.sideBlend = 1; this.aimBlend = 0; this.aimEase = 0; this.drop = 0;
    this.curLen = CONFIG.camera.distance; this.lastFov = this.camera.fov; this.shakeT = 0; this.shakeAmp = 0; this.modelVisible = true;
    this.fwd = new THREE.Vector3(); this.right = new THREE.Vector3(); this.pivot = new THREE.Vector3(); this.desired = new THREE.Vector3(); this.dir = new THREE.Vector3();
    this._t = new THREE.Vector3(); this._p = new THREE.Vector3(); this._d = new THREE.Vector3(); this.assist = null; this.prevAim = false; this.lockOn = false;
    // Relleno tenue a la espalda del personaje (sin sombras) para leer su silueta en la oscuridad
    this.fill = new THREE.PointLight(0x8fa3c4, CONFIG.lighting.fill, 3, 2);
    game.scene.add(this.fill);
  }
  shake(a, t = 0.35) { this.shakeAmp = Math.max(this.shakeAmp, a); this.shakeT = t; }
  kick(a) { this.pitch = clamp(this.pitch + a, CONFIG.camera.minPitch, CONFIG.camera.maxPitch); this.yaw += rand(-a, a) * 0.35; } // retroceso
  /* Apuntado automático: al empezar a apuntar busca el infectado más cercano EN PANTALLA (y a la vista)
     y lleva la mira suavemente a su punto débil; luego lo sigue mientras se mantenga el apuntado */
  aimPoint(z, out) {
    if (z.T.core && !z.shield) return out.copy(z.coreC);
    return out.copy(z.bodyA).lerp(z.bodyB, 0.8);
  }
  pickTarget(maxNdc) {
    const zs = this.game.zombies; if (!zs) return null;
    const cam = this.camera; let best = null, bs = Infinity;
    for (const z of zs.pool) {
      if (!z.alive || z.state === 'intro') continue;
      const d = Math.hypot(z.pos.x - cam.position.x, z.pos.z - cam.position.z); if (d > 30) continue;
      z.zones(); const tp = this.aimPoint(z, this._t), v = this._p.copy(tp).project(cam);
      if (v.z > 1 || v.z < -1 || Math.abs(v.x) > maxNdc || Math.abs(v.y) > maxNdc) continue;
      this._d.subVectors(tp, cam.position); const L = this._d.length(); this._d.divideScalar(L);
      if (this.world.raycast(cam.position, this._d, L) !== Infinity) continue;
      const s = d * (1 + 0.6 * Math.hypot(v.x, v.y)) * (z.cloak !== undefined && z.cloak < 0.4 ? 4 : 1); if (s < bs) { bs = s; best = z; }
    }
    return best;
  }
  updateAssist(dt, player, input) {
    const aimIn = !!input.aim && player.alive && Settings.data.autoAim !== false;
    if (aimIn && !this.prevAim) { const z = this.pickTarget(1.02); this.assist = z ? { z, t: 0, hold: 0, lost: 0 } : null; }
    if (!aimIn) this.assist = null;
    this.prevAim = aimIn;
    const A = this.assist;
    if (A) {
      A.t += dt;
      if (Math.abs(input.look.x) + Math.abs(input.look.y) > 0.012) A.hold = 0.5; else A.hold = Math.max(0, A.hold - dt); // si el jugador mueve la cámara, manda él
      if (!A.z.alive) { A.lost += dt; if (A.lost > 0.3) { const n = this.pickTarget(0.55); this.assist = n ? { z: n, t: 0, hold: 0, lost: 0 } : null; } } // siguiente objetivo cercano a la mira
      else if (A.hold <= 0) {
        A.z.zones(); const C = CONFIG.camera, tp = this.aimPoint(A.z, this._t), c = this.camera.position;
        const dx = tp.x - c.x, dy = tp.y - c.y, dz = tp.z - c.z, h = Math.hypot(dx, dz), k = A.t < 0.2 ? 16 : 5;
        this.yaw = dampAngle(this.yaw, Math.atan2(-dx, -dz), k, dt); this.pitch = damp(this.pitch, clamp(Math.atan2(dy, h), C.minPitch, C.maxPitch), k, dt);
      }
    }
    this.lockOn = !!(this.assist && this.assist.z.alive && this.assist.hold <= 0);
  }
  update(dt) {
    const C = CONFIG.camera, s = Settings.data.sens, cam = this.camera, player = this.player, input = player.input;
    this.yaw -= input.look.x * s;
    this.pitch = clamp(this.pitch - input.look.y * s, C.minPitch, C.maxPitch);
    this.updateAssist(dt, player, input);
    // ADS: rampa lineal de C.adsTime segundos (más rápida con buena estadística de apuntado) y curva suave
    const rate = (player.stats.aimSpeed || 1) / C.adsTime;
    this.aimBlend = clamp(this.aimBlend + clamp((player.aiming ? 1 : 0) - this.aimBlend, -rate * dt, rate * dt), 0, 1);
    this.aimEase = smooth(0, 1, this.aimBlend);
    this.sideBlend = damp(this.sideBlend, this.side, 12, dt);
    this.drop = damp(this.drop, player.slideT >= 0 ? C.slideDrop : player.crouch ? C.crouchDrop : 0, 12, dt);
    const cp = Math.cos(this.pitch), a = this.aimEase;
    this.fwd.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const bob = player.speed > 0.3 && player.slideT < 0 ? Math.sin(player.stepPhase * 2) * 0.016 * Math.min(1, player.speed / 5) * (1 - a) : 0;
    this.pivot.copy(player.position); this.pivot.y += C.pivot + bob - this.drop;
    const offX = lerp(C.shoulder, C.aimShoulder, a) * this.sideBlend, dist = lerp(C.distance, C.aimDistance, a);
    this.desired.copy(this.pivot).addScaledVector(this.right, offX).addScaledVector(this.fwd, -dist);
    this.desired.y += C.lift;
    this.dir.subVectors(this.desired, this.pivot);
    const len = this.dir.length(); this.dir.divideScalar(len);
    const hit = this.world.raycast(this.pivot, this.dir, len + C.pad);
    const allowed = hit === Infinity ? len : Math.max(0.15, hit - C.pad);
    this.curLen = allowed < this.curLen ? allowed : damp(this.curLen, allowed, 8, dt);
    cam.position.copy(this.pivot).addScaledVector(this.dir, this.curLen);
    if (cam.position.y < 0.25) cam.position.y = 0.25;
    if (this.shakeT > 0) { this.shakeT -= dt; const k = this.shakeAmp; cam.position.x += rand(-k, k); cam.position.y += rand(-k, k); } else this.shakeAmp = 0;
    cam.lookAt(cam.position.x + this.fwd.x, cam.position.y + this.fwd.y, cam.position.z + this.fwd.z);
    // FOV estilo CoD: horizontal referido a 4:3 (Hor+): 80 → 60 al apuntar. En pantallas muy anchas (pantalla dividida) se limita el horizontal
    const hf = lerp(C.fov, C.aimFov, a) + (player.running ? C.runFov : 0) + player.slideK * C.slideFov;
    const vf = clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hf) / 2) / Math.max(4 / 3, cam.aspect / 1.65))), C.minVFov, C.maxVFov);
    cam.fov = player.aiming || a > 0.02 ? vf : damp(cam.fov, vf, 14, dt); cam.updateProjectionMatrix();
    if (Math.abs(cam.fov - this.lastFov) > 0.6) { this.lastFov = cam.fov; if (player.idx === 0) this.game.lighting.onCameraChange(); }
    this.modelVisible = this.curLen > 0.55;
    this.fill.position.set(this.pivot.x - this.fwd.x * 0.9, this.pivot.y + 0.2, this.pivot.z - this.fwd.z * 0.9);
  }
  dispose() { this.fill.removeFromParent(); this.fill.dispose(); }
}
