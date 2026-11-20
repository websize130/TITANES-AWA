import * as THREE from 'three';
import { TAU, clamp, damp, rand } from '../core/utils.js';

/* =====================================================================
   EMBOSCADAS BAJO LOS TABLONES (Modo Supervivencia)
   En cabañas, embarcaderos y porches hay tarimas sueltas (world.ambushSpots). Cuando el director las «arma»,
   la siguiente que pisa un jugador revienta: un infectado de verdad (del ZombieSystem) asoma bajo los tablones
   y le agarra los pies. El jugador queda inmovilizado y le muerde hasta que:
     · se zafa con la interacción contextual (mantener Usar / botón de mano), o
     · lo mata (cuchillo, disparos): cuenta como baja normal, con sangre y monedas.
   ===================================================================== */
const PLANKS = 5, PW = 0.27, PL = 1.5; // tablones por tarima, ancho y largo
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

export class AmbushSystem {
  constructor(game) {
    this.game = game; this.rate = null; this.armT = Infinity; this.active = []; this.objs = []; this.hinted = false;
    this.spots = (game.world.ambushSpots || []).map((s, i) => ({ ...s, i, broken: false, cd: 0, debris: [] }));
    const n = this.spots.length; if (!n) return;
    // Tablones: una sola malla instanciada para todas las tarimas (madera escaneada del escenario)
    const geo = new THREE.BoxGeometry(PW - 0.02, 0.05, PL), mat = game.materials.get('woodDark');
    this.planks = new THREE.InstancedMesh(geo, mat, n * PLANKS); this.planks.castShadow = false; this.planks.receiveShadow = true;
    this.planks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.track(this.planks);
    // Hueco oscuro que aparece al reventar
    const hole = new THREE.CircleGeometry(0.62, 18); hole.rotateX(-Math.PI / 2);
    this.holeMat = new THREE.MeshBasicMaterial({ color: 0x030303 });
    for (const s of this.spots) {
      s.hole = this.track(new THREE.Mesh(hole, this.holeMat)); s.hole.position.set(s.x, s.y + 0.006, s.z); s.hole.visible = false;
      s.pl = Array.from({ length: PLANKS }, (_, k) => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wz: 0, fly: false, off: (k - (PLANKS - 1) / 2) * PW }));
      this.layPlanks(s);
    }
    this.geo = [geo, hole];
  }
  track(o) { this.game.scene.add(o); this.objs.push(o); return o; }
  // Activa o desactiva las emboscadas (rate = { every: [mín, máx] } por nivel, o null)
  setRate(rate) { this.rate = rate; this.armT = rate ? rand(...rate.every) * 0.5 : Infinity; if (!rate) for (const s of this.spots) this.repair(s); }
  layPlanks(s) { // tarima intacta (con un leve desnivel: un jugador atento la reconoce)
    for (let k = 0; k < PLANKS; k++) {
      const P = s.pl[k], c = Math.cos(s.ry), sn = Math.sin(s.ry);
      P.x = s.x + c * P.off; P.z = s.z - sn * P.off; P.y = s.y + 0.03 + (k % 2) * 0.008; P.rx = rand(-0.02, 0.02); P.ry = s.ry; P.rz = rand(-0.03, 0.03); P.fly = false;
      this.setPlank(s, k);
    }
    this.planks.instanceMatrix.needsUpdate = true;
  }
  setPlank(s, k) { const P = s.pl[k]; _e.set(P.rx, P.ry, P.rz); _q.setFromEuler(_e); this.planks.setMatrixAt(s.i * PLANKS + k, _m.compose(_p.set(P.x, P.y, P.z), _q, _s)); }
  repair(s) { if (s.busy) return; s.broken = false; s.hole.visible = false; this.layPlanks(s); }

  update(dt) {
    if (!this.spots.length) return;
    const g = this.game, Z = g.zombies;
    let moving = false;
    for (const s of this.spots) for (let k = 0; k < PLANKS; k++) { // tablones que saltan por los aires y caen alrededor del hueco
      const P = s.pl[k]; if (!P.fly) continue; moving = true;
      P.vy -= 9.8 * dt; P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt; P.rx += P.wx * dt; P.rz += P.wz * dt;
      if (P.y < s.y + 0.03 && P.vy < 0) { P.y = s.y + 0.03; P.vy *= -0.25; P.vx *= 0.5; P.vz *= 0.5; P.wx *= 0.4; P.wz *= 0.4; if (Math.abs(P.vy) < 0.4) { P.fly = false; P.rx = rand(-0.3, 0.3); } }
      this.setPlank(s, k);
    }
    if (moving) this.planks.instanceMatrix.needsUpdate = true;
    for (let i = this.active.length - 1; i >= 0; i--) if (this.active[i].done) this.active.splice(i, 1);
    if (!this.rate || !Z) return;
    this.armT -= dt;
    if (this.armT > 0) return;
    // Armada: la próxima tarima que pise alguien revienta
    for (const P of g.activePlayers) {
      if (!P.alive || P.rooted) continue;
      for (const s of this.spots) {
        if (s.broken || Math.hypot(P.position.x - s.x, P.position.z - s.z) > 0.75) continue;
        this.trigger(s, P); this.armT = rand(...this.rate.every); return;
      }
    }
  }

  trigger(s, P) {
    const g = this.game, Z = g.zombies, z = Z.get(['villager', 'woman', 'police'][Math.floor(Math.random() * 3)]);
    s.broken = true; s.busy = true; s.hole.visible = true;
    // Los tablones saltan
    for (let k = 0; k < PLANKS; k++) { const L = s.pl[k], a = rand(0, TAU); L.fly = true; L.vx = Math.cos(a) * rand(0.6, 1.8); L.vz = Math.sin(a) * rand(0.6, 1.8); L.vy = rand(2.2, 3.8); L.wx = rand(-9, 9); L.wz = rand(-9, 9); }
    // El jugador queda a medio metro del hueco, de cara al que sale
    let dx = P.position.x - s.x, dz = P.position.z - s.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { dx = Math.sin(P.facing); dz = Math.cos(P.facing); d = 1; }
    P.position.x = s.x + (dx / d) * 0.58; P.position.z = s.z + (dz / d) * 0.58; P.velocity.set(0, 0, 0); P.rooted = z;
    z.spawn(s.x, s.z, Z.spawnOpts()); z.noBlock = true; z.tgt = P; z.state = 'grab';
    z.facing = Math.atan2(P.position.x - s.x, P.position.z - s.z); z.mesh.rotation.set(0, z.facing, 0);
    const a = { z, P, s, t: 0, bite: 0.9, y0: s.y - 1.95, y1: s.y - 1.08, done: false, out: 0 };
    z.mesh.position.y = a.y0;
    z.ext = (zz, dt) => this.ctrl(a, zz, dt);
    // Acción contextual para zafarse (más difícil en niveles altos)
    const lvl = g.mode && g.mode.round ? g.mode.round : 1, hold = clamp(0.95 + (lvl - 1) * 0.045, 0.95, 1.6);
    a.action = g.interact.addAction({ id: 'escape', label: 'Zafarse', hold, only: P, follow: P, onUse: () => this.release(a) });
    // Golpe de efecto: crujido de madera, alarido, temblor y sangre de la primera mordida
    g.audio.boardBreak(s); Z.voice('screech', z); P.rig.shake(0.05, 0.35); g.pads.rumble(P, 0.9, 0.7, 260);
    const hud = P.idx ? g.hud2 : g.hud;
    hud.alert('¡Te han agarrado los pies!', this.hinted ? 'Zafarte o acuchíllalo' : 'Mantén USAR para zafarte · o acuchíllalo / dispárale', 'danger', 2.4);
    this.hinted = true;
    g.events.emit('ambush:grab', { player: P, z });
    this.active.push(a);
  }
  // Control del infectado mientras sale, agarra y (si te zafas) vuelve a hundirse
  ctrl(a, z, dt) {
    const P = a.P, b = z.b; a.t += dt;
    if (!z.alive || a.out > 0) { // muerto o rechazado: se hunde bajo los tablones y desaparece
      if (P.rooted === z) this.free(a);
      a.out += dt; z.mesh.position.y -= dt * (z.alive ? 1.6 : 1.1);
      if (!z.alive) { b.spine.rotation.x = damp(b.spine.rotation.x, 1.1, 6, dt); b.head.rotation.x = damp(b.head.rotation.x, 0.6, 6, dt); }
      if (a.out > 1.2) { z.ext = null; z.active = false; z.mesh.visible = false; z.alive = false; a.s.busy = false; a.done = true; }
      return;
    }
    const emerge = clamp(a.t / 0.45, 0, 1), e = 1 - Math.pow(1 - emerge, 3);
    z.mesh.position.y = a.y0 + (a.y1 - a.y0) * e + Math.sin(a.t * 9) * 0.015;
    z.facing = Math.atan2(P.position.x - z.pos.x, P.position.z - z.pos.z); z.mesh.rotation.y = z.facing;
    // Pose: se inclina hacia el jugador y tira de sus tobillos con las dos manos
    const pull = Math.sin(a.t * 7.5), jerk = Math.sin(a.t * 13.7) * 0.08;
    for (const n in b) b[n].rotation.set(0, 0, 0);
    b.spine.rotation.x = 0.55 + 0.08 * pull; b.chest.rotation.x = 0.15; b.chest.rotation.z = 0.06 * pull;
    b.head.rotation.set(-0.35 + jerk, 0.12 * Math.sin(a.t * 3.1), 0.2 * Math.sin(z.seed));
    b.shoulderL.rotation.set(-1.25 - 0.22 * pull, 0, 0.32); b.shoulderR.rotation.set(-1.25 + 0.22 * pull, 0, -0.32);
    b.elbowL.rotation.x = -0.45 + 0.2 * pull; b.elbowR.rotation.x = -0.45 - 0.2 * pull;
    z.hitK = Math.max(0, z.hitK - dt * 3);
    // Mordiscos periódicos (más fuertes con el multiplicador de daño del nivel)
    if (!P.alive) { this.release(a, false); return; }
    a.bite -= dt;
    if (a.bite <= 0 && emerge >= 1) {
      a.bite = 1.25; const got = P.takeDamage(6 * (z.mDmg || 1), z);
      if (got > 0) { this.game.zombies.onPlayerHit(z, got, P); this.game.zombies.voice('growl', z); }
    }
    P.velocity.set(0, 0, 0);
  }
  free(a) { const P = a.P; if (P.rooted === a.z) P.rooted = null; if (a.action) { this.game.interact.removeAction(a.action); a.action = null; } }
  // Zafarse: patada y el infectado se hunde (sin baja)
  release(a, kicked = true) {
    if (a.out > 0) return;
    this.free(a); a.out = 0.0001;
    if (kicked) { const g = this.game; g.audio.knifeHit(true); a.P.iframes = Math.max(a.P.iframes || 0, 0.6); a.P.rig.shake(0.03, 0.2); (a.P.idx ? g.hud2 : g.hud).alert('¡Te has zafado!', '', 'success', 1.2); }
  }
  dispose() {
    for (const a of this.active) this.free(a);
    this.objs.forEach((o) => o.removeFromParent()); if (this.geo) this.geo.forEach((x) => x.dispose());
    if (this.holeMat) this.holeMat.dispose(); if (this.planks) this.planks.dispose();
  }
}
