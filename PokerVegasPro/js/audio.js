/* PokerVegasPro — audio: música lounge/jazz generada en tiempo real con WebAudio (sin archivos ni derechos de autor)
 * y efectos de sonido (fichas, cartas, botones, premios). Todo pasa por un bus con compresor y reverberación suave.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // ii–V–I–VI en Do y su variante (voicings de jazz sin fundamental en la mano derecha).
  const PROG = [
    { root: 38, chord: [53, 57, 60, 64] }, // Dm9
    { root: 43, chord: [53, 57, 59, 64] }, // G13
    { root: 36, chord: [52, 55, 59, 62] }, // Cmaj9
    { root: 45, chord: [55, 58, 61, 65] }, // A7(b13)
    { root: 41, chord: [52, 57, 60, 64] }, // Fmaj7
    { root: 40, chord: [50, 55, 59, 62] }, // Em7
    { root: 38, chord: [53, 57, 60, 64] }, // Dm9
    { root: 43, chord: [53, 56, 59, 65] }, // G7(b9)
  ];
  const BPM = 74;
  const BEAT = 60 / BPM;
  const SWING = 0.62; // corchea larga del swing

  const Audio = {
    ctx: null,
    musicOn: true,
    sfxOn: true,
    playing: false,
    _bar: 0,
    _next: 0,
    _timer: null,

    _ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
        return this.ctx;
      }
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      const ctx = (this.ctx = new AC());
      this.master = ctx.createDynamicsCompressor();
      this.master.threshold.value = -18;
      this.master.ratio.value = 3;
      this.master.connect(ctx.destination);
      // Reverberación de sala pequeña generada por código.
      this.reverb = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 2.2);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
      this.reverb.buffer = ir;
      this.revGain = ctx.createGain();
      this.revGain.gain.value = 0.22;
      this.reverb.connect(this.revGain).connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);
      this.musicBus.connect(this.reverb);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      this.sfxBus.connect(this.reverb);
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
      });
      return ctx;
    },

    /* ---------- música ---------- */

    startMusic() {
      const ctx = this._ensure();
      if (!ctx || this.playing) return;
      this.playing = true;
      this._next = ctx.currentTime + 0.1;
      this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
      this.musicBus.gain.setTargetAtTime(0.32, ctx.currentTime, 1.2);
      this._timer = setInterval(() => this._schedule(), 120);
      this._schedule();
    },

    stopMusic() {
      if (!this.ctx || !this.playing) return;
      this.playing = false;
      clearInterval(this._timer);
      this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    },

    _schedule() {
      const ctx = this.ctx;
      while (this._next < ctx.currentTime + 0.6) {
        this._playBar(this._bar % PROG.length, this._next);
        this._next += BEAT * 4;
        this._bar++;
      }
    },

    _playBar(i, t) {
      const c = PROG[i], nxt = PROG[(i + 1) % PROG.length];
      // Piano eléctrico: acorde en el 1 y a veces anticipado en el «y» del 2.
      this._rhodes(c.chord, t, BEAT * 2.4, 0.07);
      if (Math.random() < 0.55) this._rhodes(c.chord.map((n) => n + (Math.random() < 0.3 ? 12 : 0)), t + BEAT * (1 + SWING), BEAT * 1.6, 0.045);
      // Contrabajo caminando: fundamental, quinta/tercera y aproximación cromática al siguiente acorde.
      const walk = [c.root, c.root + (Math.random() < 0.5 ? 7 : 4), c.root + (Math.random() < 0.5 ? 9 : 10), nxt.root + (Math.random() < 0.5 ? 1 : -1)];
      walk.forEach((n, k) => this._bass(n, t + k * BEAT, BEAT * 0.9));
      // Escobillas: barrido en 2 y 4, ride suave en corcheas con swing.
      for (let k = 0; k < 4; k++) {
        if (k % 2 === 1) this._noise(t + k * BEAT, 0.22, 900, 0.018, 'bandpass');
        this._noise(t + k * BEAT, 0.06, 7000, 0.012, 'highpass');
        this._noise(t + k * BEAT + BEAT * SWING, 0.05, 7000, 0.008, 'highpass');
      }
      // Melodía ocasional, muy suave.
      if (i % 2 === 0 && Math.random() < 0.6) {
        const scale = c.chord.map((n) => n + 12);
        for (let k = 0; k < 3; k++) if (Math.random() < 0.7) this._bell(scale[Math.floor(Math.random() * scale.length)], t + BEAT * (k + (k ? SWING : 0)), 0.03);
      }
    },

    _rhodes(notes, t, dur, vol) {
      const ctx = this.ctx;
      for (const n of notes) {
        const f = midi(n);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
        o1.type = 'sine'; o2.type = 'sine';
        o1.frequency.value = f; o2.frequency.value = f * 2.001;
        const g2 = ctx.createGain(); g2.gain.value = 0.18;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        o1.connect(g); o2.connect(g2).connect(g);
        g.connect(lp).connect(this.musicBus);
        o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
      }
    },

    _bass(n, t, dur) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midi(n);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp).connect(g).connect(this.musicBus);
      o.start(t); o.stop(t + dur + 0.05);
    },

    _bell(n, t, vol) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = midi(n);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(this.musicBus);
      o.start(t); o.stop(t + 1.5);
    },

    _noise(t, dur, freq, vol, type, bus) {
      const ctx = this.ctx;
      if (!this._noiseBuf) {
        const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this._noiseBuf = b;
      }
      const src = ctx.createBufferSource();
      src.buffer = this._noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(bus || this.musicBus);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
      return f;
    },

    _tone(freq, t, dur, vol, type) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.sfxBus);
      o.start(t); o.stop(t + dur + 0.02);
      return o;
    },

    /* ---------- efectos ---------- */

    sfx(name, delay) {
      if (!this.sfxOn) return;
      const ctx = this._ensure();
      if (!ctx) return;
      const t = ctx.currentTime + (delay || 0);
      switch (name) {
        case 'chip': // ficha de cerámica: parciales inarmónicos muy cortos
          for (const [f, v] of [[2650, 0.07], [4120, 0.05], [5830, 0.03]]) this._tone(f * (0.97 + Math.random() * 0.06), t, 0.07, v, 'sine');
          this._noise(t, 0.03, 6000, 0.05, 'highpass', this.sfxBus);
          break;
        case 'chips': // pila de fichas cayendo al bote
          for (let i = 0; i < 6; i++) this.sfx('chip', (delay || 0) + i * 0.035 + Math.random() * 0.02);
          break;
        case 'card': { // carta deslizándose sobre el tapete
          const f = this._noise(t, 0.16, 1800, 0.09, 'bandpass', this.sfxBus);
          f.frequency.setValueAtTime(3200, t);
          f.frequency.exponentialRampToValueAtTime(900, t + 0.15);
          break;
        }
        case 'flip':
          this._noise(t, 0.06, 4200, 0.06, 'bandpass', this.sfxBus);
          break;
        case 'click':
          this._tone(1800, t, 0.035, 0.03, 'triangle');
          break;
        case 'fold':
          this._noise(t, 0.12, 600, 0.05, 'lowpass', this.sfxBus);
          break;
        case 'turn':
          this._tone(880, t, 0.35, 0.05); this._tone(1320, t + 0.11, 0.4, 0.04);
          break;
        case 'win':
          [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone(f, t + i * 0.08, 0.5, 0.05, 'triangle'));
          for (let i = 0; i < 8; i++) this._tone(2600 + Math.random() * 2400, t + 0.3 + i * 0.05, 0.25, 0.015);
          break;
        case 'coins':
          for (let i = 0; i < 14; i++) this.sfx('chip', (delay || 0) + i * 0.05 + Math.random() * 0.03);
          [784, 988, 1175, 1568].forEach((f, i) => this._tone(f, t + i * 0.07, 0.4, 0.04, 'triangle'));
          break;
        default:
      }
    },

    setMusic(on) {
      this.musicOn = on;
      if (on) this.startMusic(); else this.stopMusic();
    },
  };

  // Compatibilidad: el resto del juego usa PVP.Sound.
  if (PVP.Sound) {
    const S = PVP.Sound;
    S.card = (d) => Audio.sfx('card', d);
    S.chip = () => Audio.sfx('chips');
    S.turn = () => Audio.sfx('turn');
    S.fold = () => Audio.sfx('fold');
    S.win = () => Audio.sfx('win');
    S.click = () => Audio.sfx('click');
    Object.defineProperty(S, 'enabled', { get: () => Audio.sfxOn, set: (v) => { Audio.sfxOn = !!v; }, configurable: true });
  }

  PVP.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
