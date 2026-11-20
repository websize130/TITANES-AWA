import * as THREE from 'three';
import { $, clamp, lerp, rand } from '../core/utils.js';

/* =====================================================================
   CINEMÁTICAS (en el motor): barras negras, cámara de presentación que se acerca
   al jefe en contrapicado, rótulo con nombre y epíteto, y rugido. Se pueden saltar.
   ===================================================================== */
export class Cinematic {
  constructor(game) {
    this.game = game; this.on = false; this.el = $('#cine'); this.z = null;
    this.from = new THREE.Vector3(); this.to = new THREE.Vector3(); this.look = new THREE.Vector3(); this.v = new THREE.Vector3(); this.d = new THREE.Vector3();
  }
  bossIntro(z, o) { this.start(z, { dur: 4.3, ...o }); }
  phaseIntro(z, o) { this.start(z, { dur: 2.6, phase: true, ...o }); }
  // Coloca un punto de cámara a cierta distancia del jefe sin atravesar paredes
  place(out, head, dx, dy, dz, dist) {
    const w = this.game.world; this.d.set(dx, dy, dz).normalize();
    const hit = w.raycast(head, this.d, dist + 0.3), L = hit === Infinity ? dist : Math.max(0.9, hit - 0.35);
    return out.copy(head).addScaledVector(this.d, L);
  }
  start(z, o) {
    const g = this.game, cam = g.camera; if (!cam || !z) return;
    if (this.on) this.end(true);
    this.on = true; this.z = z; this.o = o; this.t = 0; this.dur = o.dur; this.roared = false; this.shk = 0;
    if (!o.phase) z.setState('intro');
    z.zones();
    const sc = z.V.scale, head = this.v.copy(z.headC), P = g.player.position;
    let nx = P.x - z.pos.x, nz = P.z - z.pos.z; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    if (l < 0.5) { nx = Math.sin(z.facing); nz = Math.cos(z.facing); }
    const side = o.phase ? -0.55 : 0.5, ex = nx * Math.cos(side) - nz * Math.sin(side), ez = nz * Math.cos(side) + nx * Math.sin(side);
    // Plano general alto que se acerca hasta un contrapicado a la altura del pecho
    this.place(this.from, head, ex, 0.32, ez, (o.phase ? 3.2 : 5.5) + sc * 1.8);
    this.place(this.to, head, ex * 0.9 + nx * 0.1, -0.18, ez * 0.9 + nz * 0.1, 1.3 + sc * 0.75);
    this.look.copy(head); this.look.y -= 0.35 * sc;
    this.fov0 = o.phase ? 50 : 56; this.fov1 = o.phase ? 40 : 33;
    cam.aspect = g.engine.width / g.engine.height;
    $('#cineEyebrow').textContent = o.eyebrow || ''; $('#cineName').textContent = o.title || ''; $('#cineSub').textContent = o.sub || '';
    $('#cineSkip').textContent = g.input.usingTouch && !g.input.pad ? 'Toca para saltar' : 'Pulsa cualquier botón para saltar';
    this.el.hidden = false; void this.el.offsetWidth; this.el.classList.add('on'); this.el.classList.toggle('phase', !!o.phase);
    document.body.classList.add('cine');
    for (const p of g.players) { p.iframes = Math.max(p.iframes, this.dur + 1.2); p.input.reset(); }
    g.audio.bossIntro(!!o.phase);
    this.apply(0);
    g.lighting.onCameraChange();
  }
  apply(e) {
    const cam = this.game.camera;
    cam.position.lerpVectors(this.from, this.to, e);
    if (this.shk > 0) { const k = this.shk; cam.position.x += rand(-k, k); cam.position.y += rand(-k, k); }
    cam.position.y += Math.sin(this.t * 1.7) * 0.012; // cámara al hombro: leve respiración
    cam.lookAt(this.look); cam.fov = lerp(this.fov0, this.fov1, e); cam.updateProjectionMatrix();
  }
  update(dt) {
    const z = this.z; this.t += dt; this.shk = Math.max(0, this.shk - dt * 0.12);
    const p = clamp(this.t / this.dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
    z.zones(); this.v.copy(z.headC); this.v.y -= 0.28 * z.V.scale; this.look.lerp(this.v, 1 - Math.exp(-6 * dt));
    if (!this.roared && this.t > (this.o.phase ? 0.4 : 1.0)) { this.roared = true; this.game.zombies.voice('roar', z); this.shk = 0.05; this.game.pads.rumble(this.game.player, 0.8, 0.6, 600); }
    this.apply(e);
    if (this.t >= this.dur) this.end();
  }
  skip() { if (this.on && this.t > 0.4) this.end(); }
  end(silent = false) {
    const g = this.game, z = this.z, o = this.o; this.on = false;
    this.el.classList.remove('on'); document.body.classList.remove('cine');
    setTimeout(() => { if (!this.on) this.el.hidden = true; }, 520);
    if (z && z.alive && z.state === 'intro') { z.setState('chase'); z.abT = rand(1.5, 3); }
    for (const p of g.activePlayers) { p.iframes = Math.max(p.iframes > 50 ? p.iframes : 0, 0.8); p.input.reset(); }
    g.pads.clearEdges();
    g.onResize(); g.clock.getDelta();
    if (!silent && o && o.onEnd) o.onEnd();
  }
}
