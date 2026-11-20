import { clamp } from '../core/utils.js';

/* Gestor de mandos: sondeo de la Gamepad API + mandos virtuales (móviles), flancos de pulsación, vibración y menús */
export class Pads {
  constructor(game) {
    this.game = game; this.st = new Map(); this.owner = new Map(); this.navT = 0; this.hinted = false;
    addEventListener('gamepadconnected', (e) => { this.game.onPadConnected && this.game.onPadConnected('g' + e.gamepad.index, e.gamepad.id); });
    addEventListener('gamepaddisconnected', (e) => { const s = this.st.get('g' + e.gamepad.index); if (s) s.connected = false; this.game.onPadLost && this.game.onPadLost('g' + e.gamepad.index); });
  }
  make(key, kind) { const s = { key, kind, connected: true, lx: 0, ly: 0, rx: 0, ry: 0, b: new Float32Array(17), prev: new Uint8Array(17), down: Array(17).fill(false), look: kind === 'remote' ? { x: 0, y: 0 } : null, sprint: false, label: '' }; this.st.set(key, s); return s; }
  state(key) { const s = this.st.get(key); return s && s.connected ? s : null; }
  clearEdges() { for (const s of this.st.values()) s.down.fill(false); } // una pulsación ya gastada (menú, unirse) no llega a la partida
  // Mando virtual (móvil): el RemoteLink escribe aquí el estado recibido
  remote(key, msg) {
    const s = this.st.get(key) || this.make(key, 'remote'); s.connected = true;
    if (msg.a) { s.lx = msg.a[0]; s.ly = msg.a[1]; }
    if (msg.l) { s.look.x += msg.l[0]; s.look.y += msg.l[1]; }
    if (msg.b !== undefined) for (let i = 0; i < 17; i++) s.b[i] = (msg.b >> i) & 1;
    if (msg.t) s.raw = msg.t;
  }
  poll() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of list) {
      if (!gp || !gp.connected) continue;
      const key = 'g' + gp.index, s = this.st.get(key) || this.make(key, 'pad'); s.connected = true; s.label = gp.id;
      s.lx = gp.axes[0] || 0; s.ly = gp.axes[1] || 0; s.rx = gp.axes[2] || 0; s.ry = gp.axes[3] || 0;
      for (let i = 0; i < 17; i++) { const b = gp.buttons[i]; s.b[i] = b ? (b.value || (b.pressed ? 1 : 0)) : 0; }
    }
    let any = null;
    for (const s of this.st.values()) {
      for (let i = 0; i < 17; i++) { const now = s.b[i] > 0.5 ? 1 : 0; s.down[i] = !!(now && !s.prev[i]); s.prev[i] = now; }
      if (s.connected && s.down.some((v) => v)) { any = s; s.lastActive = performance.now(); if (this.game.onPadActivity) this.game.onPadActivity(s); }
    }
    if (this.game.state !== 'playing' || this.game.cine.on) this.menuNav(any);
  }
  rumble(player, strong = 0.5, weak = 0.3, ms = 120) {
    const key = player && player.input && player.input.pad; if (!key) return;
    const s = this.st.get(key); if (!s || !s.connected) return;
    if (s.kind === 'remote') { this.game.remote && this.game.remote.send(key, { t: 'vib', ms: Math.round(ms * (0.5 + strong)) }); return; }
    const gp = navigator.getGamepads && navigator.getGamepads()[+key.slice(1)], va = gp && gp.vibrationActuator;
    if (va && va.playEffect) va.playEffect('dual-rumble', { duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }).catch(() => {});
  }
  // Navegación de menús con el mando: cruceta/stick mueven el foco, A pulsa, B vuelve, Start confirma
  menuNav(s) {
    const g = this.game;
    if (g.cine && g.cine.on) { if (s) g.cine.skip(); return; }
    let dir = 0;
    for (const p of this.st.values()) {
      if (!p.connected) continue;
      if (p.down[12] || p.down[14]) dir = -1; if (p.down[13] || p.down[15]) dir = 1;
      if (!dir && (Math.abs(p.ly) > 0.6 || Math.abs(p.lx) > 0.6) && performance.now() - this.navT > 220) { dir = p.ly > 0.6 || p.lx > 0.6 ? 1 : -1; this.navT = performance.now(); }
    }
    const root = g.ui.activeLayer(); if (!root) return;
    const list = [...root.querySelectorAll('button:not([disabled]),input[type=range],[data-pad]')].filter((e) => e.offsetParent !== null && !e.closest('[hidden]'));
    if (!list.length) return;
    const cur = list.indexOf(document.activeElement);
    if (dir) {
      const el = document.activeElement;
      if (el && el.type === 'range' && s && (s.down[14] || s.down[15])) { el.value = +el.value + (s.down[15] ? 1 : -1) * (+el.step || 0.05); el.dispatchEvent(new Event('input')); return; }
      const n = list[cur < 0 ? 0 : (cur + dir + list.length) % list.length]; n.focus({ preventScroll: false }); n.classList.add('pad-focus'); if (el && el !== n) el.classList.remove('pad-focus');
      if (n.scrollIntoView) n.scrollIntoView({ block: 'nearest' });
    }
    if (!s) return;
    if (s.down[4] || s.down[5]) g.ui.cycleCharacter && g.ui.cycleCharacter(s.down[5] ? 1 : -1); // LB / RB: personaje
    if (s.down[0]) { const el = cur >= 0 ? list[cur] : list[0]; if (el && el.click) el.click(); }
    if (s.down[1]) dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    if (s.down[9]) { if (g.state === 'paused') g.resume(); else if (g.state === 'menu') g.startGame(); else { const el = cur >= 0 ? list[cur] : list[0]; if (el && el.click) el.click(); } }
  }
}
