import { $ } from '../core/utils.js';
import { loadPeer, loadQR, peerOpts } from './vendor.js';
import { baseUrl } from '../ui/qrScanner.js';

/* =====================================================================
   MULTIJUGADOR ONLINE CON INVITACIÓN (anfitrión)
   El anfitrión simula la partida; su amigo entra con un código de 6 caracteres (o el enlace ?unirse=CÓDIGO que se
   comparte por WhatsApp o cualquier canal) y juega como Jugador 2:
     · el invitado envía su mando (teclado/ratón, táctil o mando físico) por un canal de datos WebRTC
     · el anfitrión dibuja la cámara del Jugador 2 en un pase extra y se la envía en vídeo (30 fps) con el sonido
     · el HUD del invitado (vida, munición, objetivo, avisos, interacción contextual) viaja como datos (10 Hz)
   Emparejamiento por el servidor público de PeerJS; después la conexión es directa entre los dos navegadores.
   ===================================================================== */
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', SW = 960, SH = 540;

export class NetHost {
  constructor(game) {
    this.game = game; this.peer = null; this.code = ''; this.conn = null; this.call = null; this.key = null; this.name = '';
    this.status = 'off'; this.err = ''; this.canvas = null; this.ctx = null; this.hudT = 0; this.acc = 0; this.lobbyT = null; this.inGame = false;
  }
  get link() { return `${baseUrl()}?unirse=${this.code}`; }
  get connected() { return !!(this.conn && this.conn.open); }
  get shareText() { return `¡Únete a mi partida de BLOOD DEAD! Código: ${this.code}\n${this.link}`; }

  async open() {
    if (this.peer && !this.peer.destroyed) return this.code;
    this.status = 'loading'; this.renderPanel();
    let Peer; try { Peer = await loadPeer(); } catch (e) { this.status = 'error'; this.err = 'No se pudo cargar el módulo de conexión'; this.renderPanel(); return null; }
    const tryOpen = (n) => new Promise((res) => {
      this.code = Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
      const peer = new Peer('blooddead-net-' + this.code, peerOpts());
      peer.on('open', () => { this.peer = peer; this.status = 'ready'; res(true); });
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && n < 4) { peer.destroy(); tryOpen(n + 1).then(res); return; }
        if (err.type === 'peer-unavailable') return; // llamada a un invitado que se fue
        this.status = 'error'; this.err = 'Error de conexión: ' + (err.type || err.message); this.renderPanel(); res(false);
      });
      peer.on('connection', (c) => this.accept(c));
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    });
    await tryOpen(0); this.renderPanel(); return this.code;
  }
  accept(c) {
    if (this.connected) { c.on('open', () => { try { c.send({ t: 'full' }); } catch (e) { /* sin canal */ } setTimeout(() => c.close(), 300); }); return; } // de momento, un amigo por partida
    const key = 'n:' + c.peer;
    c.on('open', () => {
      this.conn = c; this.key = key; this.name = String((c.metadata && c.metadata.name) || 'Tu amigo').slice(0, 18);
      this.game.pads.remote(key, { b: 0 });
      this.startStream(c.peer);
      this.game.onFriendJoined(key, this.name);
      c.send({ t: 'hello', host: this.game.selected ? this.game.selected.name : '', state: this.game.state });
      this.renderPanel();
    });
    c.on('data', (m) => { if (m && typeof m === 'object' && m.t === 'in') this.game.pads.remote(key, m); });
    c.on('close', () => this.drop());
    c.on('error', () => this.drop());
  }
  // Vídeo para el invitado: un lienzo 2D al que se copia su vista (o la sala de espera) + el audio del juego
  startStream(peerId) {
    if (!this.canvas) { this.canvas = document.createElement('canvas'); this.canvas.width = SW; this.canvas.height = SH; this.ctx = this.canvas.getContext('2d'); }
    const stream = this.canvas.captureStream(0), a = this.game.audio; // fotogramas a demanda: se empuja uno tras cada dibujo
    this.vtrack = stream.getVideoTracks()[0]; if (this.vtrack) this.vtrack.contentHint = 'motion';
    this.lobby();
    if (a.ensure()) { a.netDest = a.netDest || a.ctx.createMediaStreamDestination(); if (!a.netTap) { a.master.connect(a.netDest); a.netTap = true; } for (const t of a.netDest.stream.getAudioTracks()) stream.addTrack(t); }
    this.call = this.peer.call(peerId, stream);
    // Calidad del vídeo: hasta 3 Mbps; si la red aprieta, baja la nitidez antes que los fotogramas (es un juego de acción)
    const tune = () => { const pc = this.call && this.call.peerConnection; if (!pc) return; for (const s of pc.getSenders()) if (s.track && s.track.kind === 'video') { const p = s.getParameters(); p.encodings = p.encodings && p.encodings.length ? p.encodings : [{}]; p.encodings[0].maxBitrate = 3000000; p.encodings[0].maxFramerate = 30; p.degradationPreference = 'maintain-framerate'; s.setParameters(p).catch(() => {}); } };
    setTimeout(tune, 1500); setTimeout(tune, 5000);
    clearInterval(this.lobbyT); this.lobbyT = setInterval(() => { if (!this.inGame) this.lobby(); }, 500);
  }
  lobby() { // sala de espera (fuera de la partida)
    const g = this.ctx, G = this.game; if (!g) return;
    g.fillStyle = '#060606'; g.fillRect(0, 0, SW, SH);
    const grd = g.createRadialGradient(SW / 2, SH * 0.45, 20, SW / 2, SH * 0.45, SW * 0.6); grd.addColorStop(0, 'rgba(139,0,0,.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, SW, SH);
    g.textAlign = 'center'; g.fillStyle = '#ebe7e0'; g.font = '700 64px "Space Grotesk", sans-serif'; g.fillText('BLOOD DEAD', SW / 2, SH * 0.4);
    g.font = '500 24px Inter, sans-serif'; g.fillStyle = '#c8cacd';
    const st = G.state, msg = st === 'paused' ? 'Partida en pausa' : st === 'dead' ? 'Habéis caído · el anfitrión decide si reintentar' : st === 'complete' ? '¡Completado! · el anfitrión elige cómo seguir' : st === 'loading' ? 'Cargando el escenario…' : 'Conectado · esperando a que el anfitrión empiece la partida';
    g.fillText(msg, SW / 2, SH * 0.55);
    g.font = '400 18px Inter, sans-serif'; g.fillStyle = '#7d8086'; g.fillText(`Partida de ${G.selected ? G.selected.name : 'tu amigo'} · jugarás como Jugador 2`, SW / 2, SH * 0.63);
    this.push();
  }
  // Llamado desde Game.render antes de dibujar al jugador 1: vista del jugador 2 a 30 fps en una esquina del lienzo → vídeo
  renderGuest(r, scene, p2, csm, lighting, dt) {
    if (!this.connected || !this.ctx) return;
    this.acc += dt; if (this.acc < 1 / 31) return; this.acc = 0;
    const cam = p2.camera, pr = r.getPixelRatio(), vw = Math.floor(SW / pr), vh = Math.floor(SH / pr), gl = r.domElement;
    if (Math.abs(cam.aspect - SW / SH) > 1e-3) { cam.aspect = SW / SH; cam.updateProjectionMatrix(); }
    r.setScissorTest(true); r.setViewport(0, 0, vw, vh); r.setScissor(0, 0, vw, vh);
    cam.updateMatrixWorld();
    if (csm) { csm.camera = cam; csm.updateFrustums(); }
    lighting.beforeRender();
    r.render(scene, cam);
    this.ctx.drawImage(gl, 0, gl.height - vh * pr, vw * pr, vh * pr, 0, 0, SW, SH); this.push();
    r.setScissorTest(false);
    this.inGame = true;
  }
  // HUD del invitado (10 veces por segundo) y estado de la partida
  update(dt) {
    if (!this.connected) return;
    const G = this.game, p = G.players && G.players[1];
    if (G.state !== 'playing') this.inGame = false;
    if ((this.hudT -= dt) > 0) return; this.hudT = 0.1;
    const msg = { t: 'hud', st: G.state };
    if (p && p.active && p.input.pad === this.key) {
      const W = p.weapons, iv = G.interact && G.interact.view ? G.interact.view[1] : null, m = G.mode;
      Object.assign(msg, { hp: Math.round(p.health), max: p.stats.maxHealth, alive: p.alive, name: p.def.name, wpn: W ? W.W.short : '', mag: W ? W.A.mag : 0, res: W ? (W.A.res === Infinity ? -1 : W.A.res) : 0,
        reload: W ? W.reloading : false, obj: m ? m.currentText : '', resp: !p.alive ? Math.max(0, Math.ceil(35 - (p.respawnT || 0))) : -1, pr: iv && iv.show ? [iv.text, iv.ring] : null, aim: p.rig.aimBlend > 0.5, kills: p.kills || 0 });
    }
    this.send(msg);
  }
  push() { if (this.vtrack && this.vtrack.requestFrame) this.vtrack.requestFrame(); }
  send(m) { if (this.connected) try { this.conn.send(m); } catch (e) { /* canal ocupado */ } }
  alert(title, sub, kind) { this.send({ t: 'alert', title, sub, kind }); }
  vibrate(ms) { this.send({ t: 'vib', ms }); }
  drop() {
    if (!this.key) return;
    const key = this.key; this.key = null; this.conn = null; this.inGame = false; clearInterval(this.lobbyT);
    if (this.call) { try { this.call.close(); } catch (e) { /* ya cerrada */ } this.call = null; }
    const s = this.game.pads.st.get(key); if (s) s.connected = false;
    this.game.onFriendLeft(key, this.name); this.renderPanel();
  }
  /* ---------- Panel «Jugar con amigos» ---------- */
  openPanel() { this.open().then(() => this.renderPanel()); }
  async renderPanel() {
    const st = $('#netStatus'); if (!st) return;
    $('#netCode').textContent = this.code || '······'; $('#netLink').textContent = this.code ? this.link : '';
    st.textContent = this.status === 'loading' ? 'Creando la sala…' : this.status === 'error' ? this.err : this.connected ? `${this.name} está conectado · jugará como Jugador 2` : 'Esperando a tu amigo…';
    st.className = 'pad-status' + (this.connected ? ' ok' : this.status === 'error' ? ' err' : '');
    for (const b of document.querySelectorAll('#modal-online [data-share]')) b.disabled = !this.code;
    const box = $('#netQr'); if (!box || !this.code || box.dataset.code === this.code) return;
    try { const qrcode = await loadQR(), qr = qrcode(0, 'M'); qr.addData(this.link); qr.make(); box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); box.dataset.code = this.code; } catch (e) { box.textContent = ''; }
  }
  share(kind) {
    if (!this.code) return;
    if (kind === 'whatsapp') { window.open('https://wa.me/?text=' + encodeURIComponent(this.shareText), '_blank', 'noopener'); return; }
    if (kind === 'native' && navigator.share) { navigator.share({ title: 'BLOOD DEAD', text: this.shareText, url: this.link }).catch(() => {}); return; }
    const done = () => this.game.ui.toast('Enlace copiado', 'Pégalo en cualquier chat');
    if (navigator.clipboard) navigator.clipboard.writeText(this.shareText).then(done, () => window.prompt('Copia el enlace:', this.link)); else window.prompt('Copia el enlace:', this.link);
  }
  close() { this.drop(); if (this.peer) this.peer.destroy(); this.peer = null; this.code = ''; this.status = 'off'; }
}
