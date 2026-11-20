import { loadPeer, loadQR } from './vendor.js';
import { $ } from '../core/utils.js';

/* El móvil como mando inalámbrico: el juego abre una sala (código de 4 caracteres) y el móvil se conecta
   abriendo esta misma página con ?mando=CÓDIGO. WebRTC (canal de datos) con emparejamiento por PeerJS. */
export class RemoteLink {
  constructor(game) { this.game = game; this.peer = null; this.code = ''; this.conns = new Map(); this.status = 'off'; }
  async open() {
    if (this.peer && !this.peer.destroyed) return this.code;
    this.status = 'loading'; this.render();
    let Peer; try { Peer = await loadPeer(); } catch (e) { this.status = 'error'; this.err = 'No se pudo cargar el módulo de conexión (¿sin Internet?)'; this.render(); return null; }
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const tryOpen = (n) => new Promise((res) => {
      this.code = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
      const peer = new Peer('blooddead-' + this.code);
      peer.on('open', () => { this.peer = peer; this.status = 'ready'; res(true); });
      peer.on('error', (err) => { if (err.type === 'unavailable-id' && n < 4) { peer.destroy(); tryOpen(n + 1).then(res); } else { this.status = 'error'; this.err = 'Error de conexión: ' + (err.type || err.message); this.render(); res(false); } });
      peer.on('connection', (c) => this.accept(c));
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    });
    await tryOpen(0); this.render(); return this.code;
  }
  accept(c) {
    const key = 'r:' + c.peer;
    c.on('open', () => { this.conns.set(key, c); this.game.pads.remote(key, { b: 0 }); this.render(); this.game.onPadConnected && this.game.onPadConnected(key, 'Móvil'); c.send({ t: 'hello', code: this.code }); });
    c.on('data', (m) => { if (m && typeof m === 'object') this.game.pads.remote(key, m); });
    c.on('close', () => { this.conns.delete(key); const s = this.game.pads.st.get(key); if (s) s.connected = false; this.game.onPadLost && this.game.onPadLost(key); this.render(); });
  }
  send(key, msg) { const c = this.conns.get(key); if (c && c.open) try { c.send(msg); } catch (e) { /* sin canal */ } }
  url() { return location.href.split('#')[0].split('?')[0] + '?mando=' + this.code; }
  async render() {
    const el = $('#padStatus'); if (!el) return;
    $('#padCode').textContent = this.code || '····';
    $('#padUrl').textContent = this.code ? this.url() : '';
    const n = this.conns.size;
    el.textContent = this.status === 'loading' ? 'Preparando la sala…' : this.status === 'error' ? this.err : n ? `${n} móvil${n > 1 ? 'es' : ''} conectado${n > 1 ? 's' : ''}` : 'Esperando al móvil…';
    el.className = 'pad-status' + (n ? ' ok' : this.status === 'error' ? ' err' : '');
    $('#padLocal').hidden = location.protocol !== 'file:';
    const box = $('#padQr'); if (!this.code || box.dataset.code === this.code) return;
    try { const qrcode = await loadQR(), qr = qrcode(0, 'M'); qr.addData(this.url()); qr.make(); box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); box.dataset.code = this.code; } catch (e) { box.textContent = ''; }
  }
  close() { for (const c of this.conns.values()) try { c.close(); } catch (e) { /* ya cerrada */ } this.conns.clear(); if (this.peer) this.peer.destroy(); this.peer = null; this.code = ''; this.status = 'off'; }
}
