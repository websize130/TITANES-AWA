/* PokerVegasPro — audio: música generada en tiempo real con WebAudio en varios estilos (sin archivos ni derechos de autor)
 * y efectos de sonido (fichas, cartas, botones, premios). Todo pasa por un bus con compresor y reverberación suave.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const rnd = Math.random;
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  /**
   * Estilos de música. Cada uno define tempo, progresión (fundamental + voicing) y cómo suena un compás.
   * `bar(A, t, c, nxt, i, B)` programa las notas del compás que empieza en t (B = duración de un pulso).
   */
  const STYLES = {
    lounge: {
      name: 'Elegante', desc: 'Jazz lounge de casino', bpm: 74, vol: 0.32,
      // ii–V–I–VI en Do y su variante (voicings de jazz sin fundamental en la mano derecha).
      prog: [
        { root: 38, chord: [53, 57, 60, 64] }, { root: 43, chord: [53, 57, 59, 64] }, { root: 36, chord: [52, 55, 59, 62] }, { root: 45, chord: [55, 58, 61, 65] },
        { root: 41, chord: [52, 57, 60, 64] }, { root: 40, chord: [50, 55, 59, 62] }, { root: 38, chord: [53, 57, 60, 64] }, { root: 43, chord: [53, 56, 59, 65] },
      ],
      bar(A, t, c, nxt, i, B) {
        const SW = 0.62;
        A._rhodes(c.chord, t, B * 2.4, 0.07);
        if (rnd() < 0.55) A._rhodes(c.chord.map((n) => n + (rnd() < 0.3 ? 12 : 0)), t + B * (1 + SW), B * 1.6, 0.045);
        const walk = [c.root, c.root + (rnd() < 0.5 ? 7 : 4), c.root + (rnd() < 0.5 ? 9 : 10), nxt.root + (rnd() < 0.5 ? 1 : -1)];
        walk.forEach((n, k) => A._bass(n, t + k * B, B * 0.9));
        for (let k = 0; k < 4; k++) {
          if (k % 2 === 1) A._noise(t + k * B, 0.22, 900, 0.018, 'bandpass');
          A._noise(t + k * B, 0.06, 7000, 0.012, 'highpass');
          A._noise(t + k * B + B * SW, 0.05, 7000, 0.008, 'highpass');
        }
        if (i % 2 === 0 && rnd() < 0.6) {
          const scale = c.chord.map((n) => n + 12);
          for (let k = 0; k < 3; k++) if (rnd() < 0.7) A._bell(pick(scale), t + B * (k + (k ? SW : 0)), 0.03);
        }
      },
    },
    relax: {
      name: 'Relajante', desc: 'Ambiente chill muy suave', bpm: 60, vol: 0.36,
      prog: [
        { root: 41, chord: [57, 60, 64, 67] }, { root: 40, chord: [55, 59, 62, 67] }, { root: 38, chord: [57, 60, 64, 65] }, { root: 36, chord: [55, 59, 62, 64] },
      ],
      bar(A, t, c, nxt, i, B) {
        A._pad(c.chord, t, B * 4.4, 0.035);
        A._bass(c.root, t, B * 3.5, 0.09);
        const penta = [72, 74, 76, 79, 81, 84];
        for (let k = 0; k < 4; k++) if (rnd() < 0.35) A._bell(pick(penta), t + k * B + rnd() * 0.2, 0.022);
        if (rnd() < 0.5) A._noise(t + B * 2, 0.9, 600, 0.006, 'lowpass'); // oleaje suave
      },
    },
    upbeat: {
      name: 'Animada', desc: 'Funk de casino con ritmo', bpm: 112, vol: 0.28,
      prog: [
        { root: 46, chord: [62, 65, 69, 72] }, { root: 43, chord: [62, 65, 67, 70] }, { root: 39, chord: [62, 67, 70, 74] }, { root: 41, chord: [60, 63, 67, 69] },
      ],
      bar(A, t, c, nxt, i, B) {
        const h = B / 2;
        A._kick(t); A._kick(t + B * 2); if (rnd() < 0.5) A._kick(t + B * 2.5, 0.5);
        A._snare(t + B); A._snare(t + B * 3);
        for (let k = 0; k < 8; k++) A._noise(t + k * h, 0.04, 8000, k % 2 ? 0.012 : 0.02, 'highpass');
        const line = [0, 0, 12, 0, 7, 10, 12, 7];
        line.forEach((d, k) => { if (k !== 3 || rnd() < 0.5) A._pluckBass(c.root + d, t + k * h, h * 0.8); });
        [1.5, 2.5, 3.5].forEach((b) => { if (rnd() < 0.85) A._stab(c.chord, t + b * B, h * 0.7, 0.04); });
        if (i % 4 === 3) [0, 1, 2, 3].forEach((k) => A._stab(c.chord.map((n) => n + 12), t + B * 3 + k * (h / 2), h * 0.4, 0.02));
      },
    },
    electro: {
      name: 'Electrónica', desc: 'Synthwave nocturno', bpm: 100, vol: 0.27,
      prog: [
        { root: 33, chord: [57, 60, 64, 69] }, { root: 29, chord: [57, 60, 65, 69] }, { root: 36, chord: [55, 60, 64, 67] }, { root: 31, chord: [55, 59, 62, 67] },
      ],
      bar(A, t, c, nxt, i, B) {
        const s16 = B / 4;
        for (let k = 0; k < 4; k++) { A._kick(t + k * B, 0.9); A._noise(t + k * B + B / 2, 0.05, 9000, 0.016, 'highpass'); }
        A._snare(t + B, 0.7); A._snare(t + B * 3, 0.7);
        for (let k = 0; k < 8; k++) A._sawBass(c.root + (k % 2 ? 12 : 0), t + k * (B / 2), B / 2 * 0.85);
        A._pad(c.chord, t, B * 4.2, 0.022, 'sawtooth');
        const arp = [c.chord[0], c.chord[1], c.chord[2], c.chord[3], c.chord[2] + 12, c.chord[3], c.chord[1] + 12, c.chord[2]];
        for (let k = 0; k < 16; k++) A._arp(arp[k % arp.length] + 12, t + k * s16, s16 * 0.8);
      },
    },
    bossa: {
      name: 'Bossa', desc: 'Bossa nova cálida', bpm: 86, vol: 0.32,
      prog: [
        { root: 41, chord: [57, 60, 64, 67] }, { root: 43, chord: [53, 57, 59, 62] }, { root: 40, chord: [55, 59, 62, 65] }, { root: 45, chord: [55, 59, 61, 64] },
      ],
      bar(A, t, c, nxt, i, B) {
        // Bajo: fundamental en el 1 y quinta en el «y» del 2 (patrón clásico de bossa).
        A._bass(c.root, t, B * 1.4, 0.13); A._bass(c.root + 7, t + B * 1.5, B * 0.5, 0.11);
        A._bass(c.root, t + B * 2, B * 1.4, 0.13); A._bass(c.root + 7, t + B * 3.5, B * 0.5, 0.11);
        // Guitarra: acordes sincopados.
        [0, 1.5, 2.5, 3].forEach((b) => A._guitar(c.chord, t + b * B, B * 0.9));
        // Rimshot y shaker.
        [0, 0.75, 1.5, 2.5, 3.25].forEach((b) => A._noise(t + b * B, 0.03, 2500, 0.03, 'bandpass'));
        for (let k = 0; k < 8; k++) A._noise(t + k * B / 2, 0.06, 7500, 0.01, 'highpass');
        if (rnd() < 0.4) A._bell(pick(c.chord) + 12, t + B * 2, 0.025);
      },
    },
  };

  const Audio = {
    ctx: null,
    musicOn: true,
    sfxOn: true,
    playing: false,
    _bar: 0,
    _next: 0,
    _timer: null,
    style: 'lounge',
    STYLES,

    /** Cambia el estilo de música (se nota en el siguiente compás). */
    setStyle(id) {
      if (!STYLES[id] || id === this.style) return;
      this.style = id;
      this._bar = 0;
      if (this.ctx && this.playing) this.musicBus.gain.setTargetAtTime(STYLES[id].vol, this.ctx.currentTime, 0.6);
    },

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
      this.musicBus.gain.setTargetAtTime(STYLES[this.style].vol, ctx.currentTime, 1.2);
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
      if (this._next < ctx.currentTime) this._next = ctx.currentTime + 0.05; // tras volver de una pestaña oculta
      while (this._next < ctx.currentTime + 0.6) {
        const st = STYLES[this.style], B = 60 / st.bpm, i = this._bar % st.prog.length;
        st.bar(this, this._next, st.prog[i], st.prog[(i + 1) % st.prog.length], i, B);
        this._next += B * 4;
        this._bar++;
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

    _bass(n, t, dur, vol) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midi(n);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp).connect(g).connect(this.musicBus);
      o.start(t); o.stop(t + dur + 0.05);
    },

    /** Colchón: osciladores desafinados con ataque y caída lentos, filtrados. */
    _pad(notes, t, dur, vol, type) {
      const ctx = this.ctx;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(1.2, dur * 0.35));
      g.gain.setValueAtTime(vol, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = type === 'sawtooth' ? 1400 : 1800;
      g.connect(lp).connect(this.musicBus);
      for (const n of notes) for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = type || 'triangle'; o.frequency.value = midi(n); o.detune.value = det;
        o.connect(g); o.start(t); o.stop(t + dur + 0.05);
      }
    },

    _kick(t, vol) {
      const ctx = this.ctx;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.38 * (vol || 1), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(this.musicBus); o.start(t); o.stop(t + 0.32);
    },

    _snare(t, vol) {
      this._noise(t, 0.16, 1800, 0.07 * (vol || 1), 'bandpass');
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * (vol || 1), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g).connect(this.musicBus); o.start(t); o.stop(t + 0.12);
    },

    _synth(n, t, dur, vol, type, cut, q) {
      const ctx = this.ctx;
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = type; o.frequency.value = midi(n);
      f.type = 'lowpass'; f.Q.value = q || 1;
      f.frequency.setValueAtTime(cut * 3, t); f.frequency.exponentialRampToValueAtTime(cut, t + dur * 0.8);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(this.musicBus); o.start(t); o.stop(t + dur + 0.03);
    },
    _pluckBass(n, t, dur) { this._synth(n, t, dur, 0.14, 'sawtooth', 380, 4); },
    _sawBass(n, t, dur) { this._synth(n, t, dur, 0.09, 'sawtooth', 300, 6); },
    _arp(n, t, dur) { this._synth(n, t, dur, 0.022, 'square', 1600, 2); },
    _stab(notes, t, dur, vol) { for (const n of notes) this._synth(n, t, dur, vol / 2, 'sawtooth', 1500, 1); },
    _guitar(notes, t, dur) { notes.forEach((n, k) => this._synth(n, t + k * 0.012, dur, 0.035, 'triangle', 1800, 1)); },

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

    /* ---------- efectos: sonidos grabados reales (Kenney «Casino Audio», CC0) ----------
     * Se decodifican una sola vez tras el primer toque; mientras tanto, los efectos simplemente no suenan. */
    _samples() {
      if (this._smp || this._smpLoading || !PVP.SfxData) return this._smp;
      this._smpLoading = true;
      const ctx = this.ctx, out = {};
      const jobs = Object.keys(PVP.SfxData).map((name) => {
        const b64 = PVP.SfxData[name].split(',')[1];
        const bin = atob(b64), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Promise((res) => {
          const done = (buf) => { if (buf) out[name] = buf; res(); };
          const r = ctx.decodeAudioData(bytes.buffer, done, () => res());
          if (r && r.then) r.then(done, () => res());
        });
      });
      Promise.all(jobs).then(() => { this._smp = out; });
      return null;
    },

    _play(name, t, vol, rate) {
      const smp = this._smp;
      const buf = smp && smp[name];
      if (!buf) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate || 1;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(g).connect(this.sfxDry);
      src.start(t);
    },

    sfx(name, delay) {
      if (!this.sfxOn) return;
      const ctx = this._ensure();
      if (!ctx) return;
      if (!this.sfxDry) { this.sfxDry = ctx.createGain(); this.sfxDry.gain.value = 0.9; this.sfxDry.connect(this.master); }
      this._samples();
      const t = ctx.currentTime + (delay || 0);
      const r = () => 0.96 + Math.random() * 0.08;
      const any = (base, n) => base + (1 + Math.floor(Math.random() * n));
      switch (name) {
        case 'card': this._play(any('cardSlide', 6), t, 0.75, r()); break;          // reparto
        case 'flip': this._play(any('cardPlace', 3), t, 0.7, r()); break;           // carta sobre la mesa
        case 'fold': this._play(any('cardShove', 2), t, 0.6, r()); break;           // tirar las cartas
        case 'shuffle': this._play('cardFan1', t, 0.55, 1); break;                  // barajar
        case 'chip': this._play(any('chipLay', 3), t, 0.7, r()); break;             // una ficha
        case 'chips': this._play(any('chipsStack', 3), t, 0.75, r()); break;        // apuesta
        case 'collect': this._play(any('chipsHandle', 3), t, 0.7, r()); break;      // fichas al bote
        case 'click': this._tone(1800, t, 0.03, 0.025, 'triangle'); break;
        case 'turn': this._tone(880, t, 0.35, 0.05); this._tone(1320, t + 0.11, 0.4, 0.04); break;
        case 'win':
          [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone(f, t + i * 0.08, 0.5, 0.045, 'triangle'));
          this._play(any('chipsHandle', 3), t + 0.3, 0.8, 1);
          break;
        case 'coins':
          this._play(any('chipsCollide', 4), t, 0.7, 1);
          this._play(any('chipsHandle', 3), t + 0.12, 0.7, 1);
          [784, 988, 1175, 1568].forEach((f, i) => this._tone(f, t + i * 0.07, 0.4, 0.03, 'triangle'));
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
    S.flip = (d) => Audio.sfx('flip', d);
    S.shuffle = () => Audio.sfx('shuffle');
    S.collect = () => Audio.sfx('collect');
    S.chip = () => Audio.sfx('chips');
    S.turn = () => Audio.sfx('turn');
    S.fold = () => Audio.sfx('fold');
    S.win = () => Audio.sfx('win');
    S.click = () => Audio.sfx('click');
    Object.defineProperty(S, 'enabled', { get: () => Audio.sfxOn, set: (v) => { Audio.sfxOn = !!v; }, configurable: true });
  }

  PVP.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
