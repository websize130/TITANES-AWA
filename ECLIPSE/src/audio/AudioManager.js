/**
 * Audio sintetizado con Web Audio (sin archivos todavía): sonidos de interfaz
 * y un fondo ambiental grave. Los navegadores exigen un gesto del usuario
 * (toque, clic o tecla) antes de reproducir sonido: llamar a unlock() entonces.
 */
export class AudioManager {
  constructor(settings, bus) {
    this.settings = settings;
    this.ctx = null;
    this.ambient = null;
    this.ambientLevel = 1;
    bus.on('settings:changed', ({ key }) => {
      if (key.endsWith('Volume')) this.#applyVolumes();
    });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    });
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.#applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  get ready() { return this.ctx?.state === 'running'; }

  play(name) {
    if (!this.ready) return;
    switch (name) {
      case 'move': this.#blip(740, 0.035, 'sine', 0.05); break;
      case 'confirm': this.#blip(523, 0.08, 'triangle', 0.08); this.#blip(784, 0.12, 'sine', 0.06, 0.05); break;
      case 'back': this.#blip(440, 0.09, 'triangle', 0.06, 0, 300); break;
      case 'start': this.#blip(196, 0.9, 'sine', 0.1, 0, 392); this.#blip(294, 0.9, 'sine', 0.05, 0.08); break;
      case 'error': this.#blip(160, 0.12, 'square', 0.03); break;
      case 'attack': this.#blip(320, 0.07, 'sawtooth', 0.03, 0, 120); break;
      case 'skill': this.#blip(392, 0.5, 'sine', 0.08, 0, 784); break;
      case 'dodge': this.#blip(600, 0.12, 'sine', 0.03, 0, 220); break;
      default: break;
    }
  }

  /** Dron ambiental grave (dos osciladores filtrados con LFO). */
  startAmbient() {
    if (!this.ready || this.ambient) return;
    const c = this.ctx;
    const out = c.createGain();
    out.gain.value = 0;
    out.gain.linearRampToValueAtTime(0.05 * this.ambientLevel, c.currentTime + 3);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 280;
    filter.Q.value = 4;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(filter.frequency);
    const oscs = [55, 82.41, 110.3].map((f, i) => {
      const o = c.createOscillator();
      o.type = i === 2 ? 'sine' : 'sawtooth';
      o.frequency.value = f;
      o.detune.value = (i - 1) * 6;
      o.connect(filter);
      o.start();
      return o;
    });
    filter.connect(out).connect(this.music);
    lfo.start();
    this.ambient = { out, oscs, lfo };
  }

  /** 1 = menú, valores menores durante la partida. */
  setAmbientLevel(level, seconds = 1.5) {
    this.ambientLevel = level;
    if (!this.ambient) return;
    const g = this.ambient.out.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(0.05 * level, this.ctx.currentTime + seconds);
  }

  #applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.get('masterVolume'), t, 0.05);
    this.sfx.gain.setTargetAtTime(s.get('sfxVolume'), t, 0.05);
    this.music.gain.setTargetAtTime(s.get('musicVolume'), t, 0.05);
  }

  #blip(freq, dur, type, vol, delay = 0, endFreq = null) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}
