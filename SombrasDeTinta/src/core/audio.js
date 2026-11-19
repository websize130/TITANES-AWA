// Sonido procedural con WebAudio (sin archivos): disparos, explosiones, trampas, cartas y un bajo gótico.
let ctx = null, master = null, noiseBuf = null;
let enabled = true, musicOn = true;
const last = {};
let music = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function throttle(name, ms) {
  const t = performance.now();
  if (last[name] && t - last[name] < ms) return false;
  last[name] = t; return true;
}

function noise(dur, freq, q, gain, type = 'lowpass', decay = dur) {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur);
}

function tone(freq, dur, type, gain, slide = 0, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}

export const Sfx = {
  unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
  setEnabled(v) { enabled = v; if (!v) this.stopMusic(); },
  setMusic(v) { musicOn = v; if (!v) this.stopMusic(); },

  play(name) {
    if (!enabled || !ensure() || ctx.state !== 'running') return;
    switch (name) {
      case 'shot': if (throttle(name, 55)) { noise(0.12, 2400, 0.8, 0.22, 'bandpass', 0.1); noise(0.16, 260, 0.7, 0.16, 'lowpass', 0.14); tone(180, 0.06, 'square', 0.05, 0.5); } break; // pólvora: chasquido + golpe grave
      case 'shotgun': if (throttle(name, 80)) { noise(0.3, 900, 0.7, 0.45, 'lowpass', 0.28); tone(90, 0.15, 'sawtooth', 0.12, 0.4); } break;
      case 'rifle': if (throttle(name, 80)) { noise(0.25, 1800, 1.2, 0.35, 'bandpass', 0.22); tone(320, 0.1, 'square', 0.06, 0.3); } break;
      case 'gatling': if (throttle(name, 45)) noise(0.06, 3000, 1, 0.12, 'bandpass', 0.05); break;
      case 'bow': if (throttle(name, 80)) { tone(600, 0.12, 'triangle', 0.12, 0.4); noise(0.08, 4000, 2, 0.08, 'highpass', 0.06); } break;
      case 'launch': if (throttle(name, 90)) { tone(140, 0.18, 'sine', 0.2, 0.6); noise(0.12, 600, 1, 0.15); } break;
      case 'boom': if (throttle(name, 70)) { noise(0.8, 420, 0.6, 0.6, 'lowpass', 0.75); tone(70, 0.5, 'sine', 0.4, 0.4); } break;
      case 'hit': if (throttle(name, 40)) tone(240 + Math.random() * 80, 0.05, 'square', 0.04, 0.6); break;
      case 'kill': if (throttle(name, 50)) noise(0.12, 700, 1.5, 0.12, 'bandpass', 0.1); break;
      case 'coin': if (throttle(name, 60)) { tone(1320, 0.07, 'square', 0.05); tone(1760, 0.12, 'square', 0.05, 1, 0.06); } break;
      case 'xp': if (throttle(name, 50)) tone(900 + Math.random() * 300, 0.05, 'sine', 0.04); break;
      case 'hurt': if (throttle(name, 150)) { tone(160, 0.2, 'sawtooth', 0.15, 0.5); noise(0.15, 500, 1, 0.15); } break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, 1, i * 0.08)); break;
      case 'ability': tone(220, 0.35, 'sawtooth', 0.12, 3); noise(0.3, 1200, 0.8, 0.2); break;
      case 'ultimate': tone(110, 0.9, 'sawtooth', 0.2, 4); tone(55, 1.2, 'sine', 0.3, 0.5); noise(1, 300, 0.5, 0.4, 'lowpass', 1); break;
      case 'combo': if (throttle(name, 400)) [392, 523, 784].forEach((f, i) => tone(f, 0.12, 'square', 0.06, 1, i * 0.05)); break;
      case 'boss': tone(55, 1.6, 'sawtooth', 0.25, 0.7); tone(82, 1.6, 'sawtooth', 0.18, 0.6); noise(1.2, 200, 0.5, 0.3, 'lowpass', 1.2); break;
      case 'laser': if (throttle(name, 200)) tone(1200, 0.3, 'sine', 0.05, 0.6); break;
      case 'thunder': noise(1.4, 180, 0.4, 0.7, 'lowpass', 1.3); break;
      case 'win': [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, 1, i * 0.12)); break;
      case 'lose': [392, 349, 311, 233].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.1, 0.9, i * 0.22)); break;
      case 'click': noise(0.05, 900, 1.2, 0.2, 'bandpass', 0.04); tone(1700, 0.02, 'square', 0.035); tone(130, 0.06, 'sine', 0.12, 0.5); break; // clic de imprenta
      case 'howl': tone(320, 0.9, 'sawtooth', 0.06, 1.9); tone(330, 0.9, 'triangle', 0.08, 1.85); noise(0.6, 900, 1, 0.06, 'bandpass', 0.6); break; // aullido
      case 'ready': if (throttle(name, 150)) { tone(1320, 0.09, 'triangle', 0.045); tone(1980, 0.12, 'sine', 0.03, 1, 0.06); } break; // carta lista
      case 'power': [660, 990, 1320].forEach((f, i) => tone(f, 0.18, 'triangle', 0.05, 1, i * 0.05)); break; // destello de poder
      case 'pet': if (throttle(name, 120)) { noise(0.08, 1400, 2, 0.12, 'bandpass', 0.6); tone(320, 0.06, 'triangle', 0.08, 0.5); } break;
      case 'petshot': if (throttle(name, 120)) { tone(880, 0.09, 'sine', 0.06, 0.4); noise(0.06, 3200, 1.5, 0.06, 'highpass', 0.5); } break;
      case 'zap': if (throttle(name, 90)) { tone(1800, 0.12, 'square', 0.06, 0.25); noise(0.12, 5000, 3, 0.15, 'bandpass', 0.1); } break;
      case 'trap': if (throttle(name, 90)) { tone(900, 0.05, 'square', 0.12, 0.3); noise(0.12, 2600, 2, 0.25, 'bandpass', 0.1); } break;
      case 'card': if (throttle(name, 60)) noise(0.1, 5200, 1.5, 0.12, 'highpass', 0.09); break;
      case 'cardthrow': if (throttle(name, 70)) { noise(0.14, 3800, 0.9, 0.16, 'bandpass', 0.12); tone(900, 0.08, 'triangle', 0.035, 1.8); } break; // naipe lanzado: silbido de papel
      case 'page': noise(0.25, 3000, 0.6, 0.12, 'bandpass', 0.22); break;
      case 'stamp': tone(80, 0.25, 'sine', 0.4, 0.5); noise(0.15, 400, 1, 0.3); break;
      case 'groan': if (throttle(name, 900)) tone(70 + Math.random() * 30, 0.6, 'sawtooth', 0.05, 0.7); break;
      case 'bell': [220, 220.8].forEach((f) => tone(f, 2.2, 'sine', 0.12, 0.98)); tone(440, 1.4, 'sine', 0.05, 0.98); break;
      case 'curse': tone(160, 0.8, 'sawtooth', 0.12, 0.4); tone(163, 0.8, 'sawtooth', 0.1, 0.42); break;
      case 'round': [196, 0, 196, 233].forEach((f, i) => f && tone(f, 0.3, 'square', 0.08, 1, i * 0.16)); break;
      case 'buy': [660, 880, 1320].forEach((f, i) => tone(f, 0.12, 'square', 0.06, 1, i * 0.06)); break;
      case 'deny': tone(140, 0.2, 'square', 0.08, 0.8); break;
      default: break;
    }
  },

  // ---------------- MÚSICA DINÁMICA POR CAPAS
  // Guitarra western tensa (siempre) → percusión pesada (horda media) → bajo distorsionado (horda masiva).
  setIntensity(v) { intensity = intensity + (v - intensity) * 0.05; },
  startMusic() {
    if (!enabled || !musicOn || !ensure() || music) return;
    const L = layers();
    let step = 0, next = ctx.currentTime + 0.1;
    const BEAT = 0.3125; // corcheas a 96 ppm
    const ARP = [110, 164.8, 220, 261.6, 246.9, 220, 164.8, 196, 110, 164.8, 220, 261.6, 293.7, 261.6, 220, 164.8];
    const BASS = [55, 55, 43.65, 49];
    music = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      const g = [1, Math.max(0, (intensity - 0.25) / 0.45), Math.max(0, (intensity - 0.6) / 0.4)];
      L.gtr.gain.setTargetAtTime(0.11 * (1 - g[2] * 0.3), ctx.currentTime, 0.4);
      L.drum.gain.setTargetAtTime(0.55 * Math.min(1, g[1]), ctx.currentTime, 0.4);
      L.bass.gain.setTargetAtTime(0.16 * Math.min(1, g[2]), ctx.currentTime, 0.6);
      while (next < ctx.currentTime + 0.25) {
        const i = step % 16;
        pluck(L.gtr, ARP[i] * (step % 64 >= 32 ? 1.122 : 1), next);
        if (i % 4 === 0) kick(L.drum, next);
        if (i % 8 === 4) snare(L.drum, next);
        if (i % 2 === 1 && g[1] > 0.6) hiHat(L.drum, next);
        if (i % 8 === 0) bassNote(L.bass, BASS[(step >> 4) % 4], next, BEAT * 8);
        step++; next += BEAT / 2;
      }
    }, 100);
  },
  stopMusic() { if (music) { clearInterval(music); music = null; } },
};

let intensity = 0, LAY = null;
function layers() {
  if (LAY) return LAY;
  const mk = () => { const gn = ctx.createGain(); gn.gain.value = 0; gn.connect(master); return gn; };
  LAY = { gtr: mk(), drum: mk(), bass: mk() };
  // distorsión del bajo
  const ws = ctx.createWaveShaper(), n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; curve[i] = Math.tanh(x * 6); }
  ws.curve = curve; ws.connect(LAY.bass); LAY.bassIn = ws;
  return LAY;
}
function pluck(dest, f, t) {
  const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(400, t + 0.25);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o.connect(lp); lp.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.5);
}
function kick(dest, t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.32);
}
function snare(dest, t) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 0.5); src.stop(t + 0.22);
  const o = ctx.createOscillator(), g2 = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(140, t); g2.gain.setValueAtTime(0.4, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g2); g2.connect(dest); o.start(t); o.stop(t + 0.16);
}
function hiHat(dest, t) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 0.5); src.stop(t + 0.06);
}
function bassNote(dest, f, t, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.04); g.gain.setValueAtTime(0.6, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(LAY.bassIn); o.start(t); o.stop(t + dur + 0.05);
}
