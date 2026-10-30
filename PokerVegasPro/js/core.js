/* PokerVegasPro — núcleo: espacio de nombres, eventos, utilidades y sonido. */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  /** Emisor de eventos mínimo: los sistemas se comunican por eventos, no por referencias directas. */
  class Emitter {
    constructor() { this._handlers = Object.create(null); }
    on(type, fn) {
      (this._handlers[type] || (this._handlers[type] = [])).push(fn);
      return () => this.off(type, fn);
    }
    off(type, fn) {
      const list = this._handlers[type];
      if (!list) return;
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    }
    emit(type, payload) {
      const list = this._handlers[type];
      if (list) for (const fn of list.slice()) fn(payload);
      const any = this._handlers['*'];
      if (any) for (const fn of any.slice()) fn(type, payload);
    }
  }

  const nf = typeof Intl !== 'undefined' ? new Intl.NumberFormat('es-ES') : null;

  const util = {
    fmt(n) {
      n = Math.round(n || 0);
      if (!nf) return String(n);
      // es-ES no agrupa números de 4 cifras; forzamos el punto de miles como en la referencia (12.450).
      return Math.abs(n) >= 1000 && Math.abs(n) < 10000
        ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        : nf.format(n);
    },
    short(n) {
      if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1).replace('.', ',') + 'M';
      if (n >= 1e4) return Math.round(n / 1e3) + 'K';
      return util.fmt(n);
    },
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    /** Redondea una cantidad de fichas a un múltiplo "bonito" de la ciega pequeña. */
    roundTo(v, step) { return Math.max(step, Math.round(v / step) * step); },
    mmss(ms) {
      const s = Math.max(0, Math.ceil(ms / 1000));
      return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    },
    esc(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    initials(name) {
      const parts = String(name).replace(/[_\-.]/g, ' ').trim().split(/\s+/);
      return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : (parts[0][1] || ''))).toUpperCase();
    },
  };

  /** Sonidos sintetizados con WebAudio (sin ficheros externos). */
  const Sound = {
    enabled: true,
    _ctx: null,
    _ensure() {
      if (!this.enabled || typeof window === 'undefined') return null;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!this._ctx) this._ctx = new AC();
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    },
    _tone(freq, dur, type, gain, delay) {
      const ctx = this._ensure();
      if (!ctx) return;
      const t = ctx.currentTime + (delay || 0);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    _noise(dur, gain, delay) {
      const ctx = this._ensure();
      if (!ctx) return;
      const t = ctx.currentTime + (delay || 0);
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      f.type = 'highpass';
      f.frequency.value = 2200;
      g.gain.value = gain || 0.05;
      src.buffer = buf;
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t);
    },
    card(delay) { this._noise(0.09, 0.06, delay); },
    chip() { this._tone(2400, 0.06, 'triangle', 0.05); this._tone(3100, 0.05, 'triangle', 0.035, 0.03); },
    turn() { this._tone(880, 0.18, 'sine', 0.06); this._tone(1320, 0.22, 'sine', 0.05, 0.12); },
    fold() { this._tone(220, 0.12, 'sine', 0.04); },
    win() { [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.25, 'triangle', 0.06, i * 0.09)); },
    click() { this._tone(1200, 0.04, 'square', 0.02); },
  };

  PVP.Emitter = Emitter;
  PVP.util = util;
  PVP.Sound = Sound;
})(typeof window !== 'undefined' ? window : globalThis);
