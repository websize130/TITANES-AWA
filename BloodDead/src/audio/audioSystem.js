import * as THREE from 'three';
import { TAU, clamp, rand } from '../core/utils.js';
import { Settings } from '../core/settings.js';

/* Voces de infectado (síntesis por formantes): duración, ataque, tono (inicio → [pico →] final), jitter, estertor (AM), formantes [F, ganancia, Q] */
export const ZVOICE = {
  moan:  { dur: [1.3, 2.3], att: 0.18, f0: [98, 70], jitter: 0.05, rough: 0.35, fry: [24, 32], form: [[540, 1.0, 7], [920, 0.55, 9], [2400, 0.16, 11]], close: 0.78, breath: 0.22, breathF: 900, drive: 1.6, gain: 0.5, verb: 0.55 },
  growl: { dur: [0.6, 1.1], att: 0.05, f0: [72, 60], jitter: 0.09, rough: 0.85, fry: [28, 40], form: [[620, 1.0, 6], [1150, 0.6, 8], [2550, 0.2, 10]], close: 0.9, breath: 0.45, breathF: 1300, drive: 3.5, gain: 0.55, verb: 0.35 },
  roar:  { dur: [0.8, 1.3], att: 0.04, f0: [120, 165, 88], jitter: 0.07, rough: 0.6, fry: [30, 44], form: [[760, 1.0, 5], [1300, 0.75, 7], [2750, 0.32, 9]], close: 0.8, breath: 0.7, breathF: 1700, drive: 5, gain: 0.7, verb: 0.5 },
  gurgle: { dur: [0.7, 1.2], att: 0.03, f0: [56, 47], jitter: 0.16, rough: 1.0, fry: [9, 15], form: [[480, 1.0, 5], [880, 0.5, 7], [2100, 0.12, 9]], close: 0.85, breath: 0.65, breathF: 520, drive: 4, gain: 0.55, verb: 0.3 }, // sangre en la garganta
  snarl: { dur: [0.32, 0.5], att: 0.015, f0: [165, 95], jitter: 0.1, rough: 0.75, fry: [34, 48], form: [[900, 1.0, 5], [1650, 0.7, 7], [3000, 0.3, 8]], close: 0.85, breath: 0.8, breathF: 2200, drive: 4.5, gain: 0.6, verb: 0.3 },
  death: { dur: [0.8, 1.1], att: 0.02, f0: [130, 45], jitter: 0.12, rough: 0.9, fry: [18, 26], form: [[600, 1.0, 6], [1000, 0.5, 8], [2300, 0.15, 10]], close: 0.6, breath: 0.5, breathF: 700, drive: 2.5, gain: 0.6, verb: 0.45 },
};

/* Disparo por arma: filtro de la detonación [inicio, fin, caída], duración, chasquido, golpe sub-grave, cuerpo y envío a la cola */
export const GUN_SFX = {
  pistol: { det: [9500, 500, 0.09], dur: 0.17, gain: 1.0, send: 0.75, crack: 0.75, sub: [150, 48, 0.13], subG: 1.2, body: [260, 0.9, 0.09], pin: 0.32, pinF: 5200, ch: 0.55 },
  shotgun: { det: [7200, 300, 0.16], dur: 0.3, gain: 1.15, send: 1.0, crack: 0.6, sub: [118, 36, 0.21], subG: 1.6, body: [300, 1.3, 0.18], pin: 0.28, pinF: 3900, ch: 0.7 },
  smg: { det: [11000, 900, 0.045], dur: 0.085, gain: 0.78, send: 0.4, crack: 0.62, sub: [175, 70, 0.07], subG: 0.7, body: [320, 0.55, 0.05], mech: 0.18, pin: 0.2, pinF: 6100, ch: 0.35 },
  rifle: { det: [12000, 650, 0.075], dur: 0.14, gain: 1.0, send: 0.8, crack: 1.0, sub: [140, 45, 0.11], subG: 1.05, body: [280, 0.85, 0.08], mech: 0.12, pin: 0.26, pinF: 5600, ch: 0.45 },
};

/* =====================================================================
   AUDIO PROCEDURAL (Web Audio): viento, dron, pasos, hoguera, gemidos
   ===================================================================== */
export class AudioSystem {
  constructor() { this.ctx = null; this.amb = null; this.timer = rand(12, 25); this.hb = 0; this.crackle = 0; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { this.ctx = new AC(); } catch (e) { return false; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = Settings.data.muted ? 0 : 0.8; this.master.connect(c.destination);
    this.noise = this.makeNoise(2, false); this.brown = this.makeNoise(4, true);
    this.verb = c.createConvolver(); this.verb.buffer = this.makeImpulse(2.6);
    const vg = c.createGain(); vg.gain.value = 0.5; this.verb.connect(vg); vg.connect(this.master);
    return true;
  }
  makeNoise(sec, brown) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  makeImpulse(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    return b;
  }
  startAmbience() {
    if (!this.ctx || this.amb) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.brown; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.7;
    const g = (this.ambGain = c.createGain()); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 3);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 220; lfo.connect(lg); lg.connect(lp.frequency);
    src.connect(lp); lp.connect(g); g.connect(this.master); src.start(); lfo.start();
    const o1 = c.createOscillator(), o2 = c.createOscillator(), dg = c.createGain();
    o1.frequency.value = 49; o2.frequency.value = 49.6; dg.gain.value = 0.03;
    o1.connect(dg); o2.connect(dg); dg.connect(this.master); o1.start(); o2.start();
    this.amb = [src, lfo, o1, o2];
  }
  env(node, peak, a, d) {
    const t0 = this.ctx.currentTime, g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g); return g;
  }
  burst(freq, q, peak, dur, type = 'bandpass', verb = 0.15) {
    if (!this.ctx) return;
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f);
    const g = this.env(f, peak, 0.005, dur); g.connect(this.master);
    if (verb) { const vg = c.createGain(); vg.gain.value = verb; g.connect(vg); vg.connect(this.verb); }
    s.start(c.currentTime, Math.random() * 1.5, dur + 0.05);
  }
  tone(freq, peak, a, d, type = 'sine', verb = 0.6) {
    if (!this.ctx) return;
    const c = this.ctx, o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.env(o, peak, a, d); g.connect(this.master);
    const vg = c.createGain(); vg.gain.value = verb; g.connect(vg); vg.connect(this.verb);
    o.start(); o.stop(c.currentTime + a + d + 0.1);
  }
  // Pisada firme en barro: ruido filtrado grave y sordo (120–200 Hz), a la mitad del volumen anterior
  footstep(run) { this.burst(rand(120, 200), 0.9, run ? 0.21 : 0.14, run ? 0.13 : 0.16, 'lowpass', 0.1); }
  /* ---------- Disparo ----------
     Seco y realista: ruido blanco con filtros que se cierran en milisegundos + golpe sub-grave + cola de eco corta.
     Sin osciladores metálicos ni retardos con realimentación (eso era lo que sonaba a tubo). */
  makeShortImpulse(sec) { // reverberación exterior corta: ruido que decae y se oscurece, sin reflexiones periódicas
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let y = 0;
      for (let i = 0; i < n; i++) { const p = i / n, a = 0.5 * Math.pow(1 - p, 2.5) + 0.03; y += a * ((Math.random() * 2 - 1) - y); d[i] = y * Math.exp(-p * 4.2) * 2.6; }
    }
    return b;
  }
  makeChamber(sec) { // reflexiones densas y metálicas de pocos milisegundos (resonancias del arma)
    const c = this.ctx, sr = c.sampleRate, n = Math.floor(sr * sec), b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.026) * 0.55 + Math.sin(t * TAU * (2350 + ch * 85)) * Math.exp(-t / 0.018) * 0.3 + Math.sin(t * TAU * 4150) * Math.exp(-t / 0.009) * 0.18; }
      for (const ms of [2.1, 3.7, 5.3, 8.9, 13.4]) { const k = Math.floor((ms * sr) / 1000) + ch * 7; if (k < n) d[k] += 0.8 * Math.exp(-ms / 12); }
    }
    return b;
  }
  gunBus() {
    if (this.gb) return this.gb;
    const c = this.ctx, comp = c.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 3; comp.ratio.value = 8; comp.attack.value = 0.0006; comp.release.value = 0.08;
    const out = c.createGain(); out.gain.value = 1.8; comp.connect(out); out.connect(this.master);
    const dry = c.createGain(); dry.connect(comp);
    const send = c.createGain(); send.gain.value = 1;
    const pre = c.createDelay(0.1); pre.delayTime.value = 0.012;
    const conv = c.createConvolver(); conv.buffer = this.makeShortImpulse(1.4);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4;
    const wet = c.createGain(); wet.gain.value = 2.8;
    send.connect(pre); pre.connect(conv); conv.connect(lp); lp.connect(wet); wet.connect(out);
    const slap = c.createDelay(0.5), sf = c.createBiquadFilter(), sg = c.createGain(); // un único rebote en la fachada más cercana (sin realimentación)
    slap.delayTime.value = 0.11; sf.type = 'lowpass'; sf.frequency.value = 1600; sg.gain.value = 0.32;
    send.connect(slap); slap.connect(sf); sf.connect(sg); sg.connect(out);
    // Recámara: reverberación metálica muy corta (cañón y corredera) que da cuerpo al chasquido
    const ch = c.createGain(), chc = c.createConvolver(), chf = c.createBiquadFilter(), chg = c.createGain();
    chc.buffer = this.makeChamber(0.16); chf.type = 'bandpass'; chf.frequency.value = 1900; chf.Q.value = 0.6; chg.gain.value = 1.5;
    ch.connect(chc); chc.connect(chf); chf.connect(chg); chg.connect(out);
    return (this.gb = { dry, send, ch });
  }
  gunshot(kind = 'pistol') {
    if (!this.ctx) return;
    const G = GUN_SFX[kind] || GUN_SFX.pistol;
    const c = this.ctx, t = c.currentTime + 0.004, B = this.gunBus();
    const route = (node, peak, a, d, send = 0, chs = 0, t0 = t) => {
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
      node.connect(g); g.connect(B.dry); if (send) { const s = c.createGain(); s.gain.value = send; g.connect(s); s.connect(B.send); }
      if (chs) { const s = c.createGain(); s.gain.value = chs; g.connect(s); s.connect(B.ch); }
    };
    const noise = (dur) => { const s = c.createBufferSource(); s.buffer = this.noise; s.start(t, Math.random() * 1.5, dur); return s; };
    // 0) Percutor: chasquido mecánico seco 3 ms antes de la detonación (metal contra metal) con un leve tintineo
    const tp = t - 0.003, pn = c.createBufferSource(); pn.buffer = this.noise; pn.start(tp, Math.random() * 1.5, 0.014);
    const pf = c.createBiquadFilter(); pf.type = 'bandpass'; pf.frequency.value = G.pinF * rand(0.95, 1.05); pf.Q.value = 3.2; pn.connect(pf); route(pf, G.pin, 0.0004, 0.006, 0, 0.6, tp);
    const po = c.createOscillator(); po.type = 'triangle'; po.frequency.value = G.pinF * 0.74 * rand(0.97, 1.03); po.start(tp); po.stop(tp + 0.06); route(po, G.pin * 0.16, 0.0005, 0.035, 0, 0.4, tp);
    // 1) Detonación: estampido de pólvora por un paso bajo que cae de 9,5 kHz a 500 Hz en 90 ms (la energía se apaga de arriba abajo)
    const det = c.createBiquadFilter(); det.type = 'lowpass'; det.Q.value = 0.4; det.frequency.setValueAtTime(G.det[0], t); det.frequency.exponentialRampToValueAtTime(G.det[1], t + G.det[2]);
    noise(G.dur + 0.09).connect(det); route(det, G.gain, 0.0007, G.dur, G.send, G.ch);
    // 2) Chasquido inicial: ruido agudo de 10 ms (la onda de choque)
    const crack = c.createBiquadFilter(); crack.type = 'highpass'; crack.frequency.value = 2600; noise(0.03).connect(crack); route(crack, G.crack, 0.0003, 0.011, 0.25);
    // 3) Golpe sub-grave: seno que cae de 150 a 48 Hz, ligeramente saturado (contundencia en el pecho)
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(G.sub[0], t); o.frequency.exponentialRampToValueAtTime(G.sub[1], t + G.sub[2]);
    const sat = c.createWaveShaper(); sat.curve = this.driveCurve(2.2); o.connect(sat); route(sat, G.subG, 0.0015, G.sub[2] + 0.09, 0.12); o.start(t); o.stop(t + G.sub[2] + 0.2);
    // 4) Cuerpo grave de la explosión (ruido < 260 Hz) para que no suene hueco
    const body = c.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = G.body[0]; noise(G.body[2] + 0.05).connect(body); route(body, G.body[1], 0.001, G.body[2], 0.3, G.ch * 0.5);
    if (G.mech) { const m = c.createBiquadFilter(); m.type = 'bandpass'; m.frequency.value = 3200; m.Q.value = 6; noise(0.02).connect(m); route(m, G.mech, 0.0005, 0.012, 0); } // mecanismo del automático
    // Ducking: el ambiente se aparta un instante para que el disparo respire
    if (this.ambGain) { const g = this.ambGain.gain; g.cancelScheduledValues(t); g.setTargetAtTime(0.1, t, 0.008); g.setTargetAtTime(0.32, t + 0.18, 0.6); }
  }
  /* ---------- Voces y efectos espaciales (pan + volumen + filtro por distancia) ---------- */
  // Posición de una fuente en el espacio de la cámara (oído) más cercana: así el 3D funciona también con la pantalla dividida
  local(p) {
    const ears = this.ears || [], v = this._lv || (this._lv = new THREE.Vector3()), q = this._lq || (this._lq = new THREE.Quaternion());
    let best = null, bd = Infinity;
    for (const c of ears) { const d = Math.hypot(p.x - c.position.x, p.y - c.position.y, p.z - c.position.z); if (d < bd) { bd = d; best = c; } }
    if (!best) return { x: 0, y: 0, z: -1, d: 5 };
    v.set(p.x, p.y, p.z).sub(best.position).applyQuaternion(q.copy(best.quaternion).invert());
    return { x: v.x, y: v.y, z: v.z, d: bd };
  }
  earDist(p) { return this.local(p).d; }
  /* pan: número (estéreo) u objeto {x,y,z} → audio posicional 3D con HRTF (el volumen por distancia lo calcula quien llama) */
  out(pan = 0, vol = 1, verb = 0.3, dist = 0) {
    const c = this.ctx, g = c.createGain(); g.gain.value = vol;
    let node = g, L = null;
    if (pan && typeof pan === 'object') { L = this.local(pan); dist = L.d; }
    if (dist > 4) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(16000 / (1 + (dist - 4) * 0.22), 900, 16000); g.connect(lp); node = lp; } // lejos: más apagado
    if (L && c.createPanner) {
      const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1; p.rolloffFactor = 0;
      const k = 1 / Math.max(L.d, 1e-3), x = L.x * k, y = L.y * k, z = L.z * k;
      if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
      node.connect(p); node = p;
    } else if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(typeof pan === 'number' ? pan : 0, -1, 1); node.connect(p); node = p; }
    node.connect(this.master);
    if (verb) { const v = c.createGain(); v.gain.value = verb * (dist > 8 ? 1.4 : 1); node.connect(v); v.connect(this.verb); }
    return g;
  }
  envG(dest, t, peak, a, d) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); g.connect(dest); return g; }
  nsrc(t, dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.start(t, Math.random() * 1.5, Math.min(dur + 0.05, 0.49)); return s; }
  bp(src, type, f, q = 1) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; src.connect(b); return b; }
  osc(type, f0, f1, t, dur) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); o.start(t); o.stop(t + dur + 0.05); return o; }
  driveCurve(k) {
    this.curves = this.curves || {}; const key = k.toFixed(1);
    if (!this.curves[key]) { const a = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; a[i] = Math.tanh(x * k) / Math.tanh(k); } this.curves[key] = a; }
    return this.curves[key];
  }
  // Voz de infectado por síntesis de formantes: fuente glotal (sierra con jitter y estertor) → tracto vocal (3 resonancias) → garganta desgarrada (saturación)
  zvoice(kind, pan, vol, pitch = 1, dist = 5) {
    const P = ZVOICE[kind]; if (!this.ctx || !P) return 0;
    const c = this.ctx, t = c.currentTime + 0.01, dur = rand(P.dur[0], P.dur[1]), end = t + dur + 0.06;
    const out = this.out(pan, vol * P.gain, P.verb, dist);
    const env = c.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(1, t + P.att); env.gain.setValueAtTime(1, t + dur * 0.68); env.gain.exponentialRampToValueAtTime(0.0001, t + dur); env.connect(out);
    const sh = c.createWaveShaper(); sh.curve = this.driveCurve(P.drive); sh.connect(env);
    const f = P.f0.map((x) => x * pitch * rand(0.94, 1.06)), o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f[0], t);
    if (f.length === 3) { o.frequency.linearRampToValueAtTime(f[1], t + dur * 0.3); o.frequency.linearRampToValueAtTime(f[2], t + dur); } else o.frequency.linearRampToValueAtTime(f[1], t + dur);
    const jit = c.createBufferSource(); jit.buffer = this.noise; jit.loop = true; // jitter: el tono nunca es estable
    const jl = c.createBiquadFilter(); jl.type = 'lowpass'; jl.frequency.value = 40; const jg = c.createGain(); jg.gain.value = f[0] * P.jitter * 6; jit.connect(jl); jl.connect(jg); jg.connect(o.frequency);
    const am = c.createGain(); am.gain.value = 1 - P.rough * 0.5; // estertor / vocal fry
    const lfo = c.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = rand(P.fry[0], P.fry[1]); const lg = c.createGain(); lg.gain.value = P.rough * 0.5; lfo.connect(lg); lg.connect(am.gain);
    o.connect(am);
    for (const [F, g, Q] of P.form) { // formantes: vocal abierta que se cierra
      const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.setValueAtTime(F * rand(0.95, 1.05) * (0.85 + 0.15 * pitch), t); b.frequency.linearRampToValueAtTime(F * P.close * (0.85 + 0.15 * pitch), t + dur); b.Q.value = Q;
      const fg = c.createGain(); fg.gain.value = g * 3.2; am.connect(b); b.connect(fg); fg.connect(sh);
    }
    const nb = c.createBufferSource(); nb.buffer = this.noise; nb.loop = true; // aliento y gorgoteo húmedo
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = P.breathF; nf.Q.value = 0.8;
    const ng = c.createGain(); ng.gain.value = P.breath; const gl = c.createOscillator(), gg = c.createGain(); gl.frequency.value = rand(9, 15); gg.gain.value = P.breath * 0.6; gl.connect(gg); gg.connect(ng.gain);
    nb.connect(nf); nf.connect(ng); ng.connect(sh);
    o.start(t); jit.start(t, Math.random()); lfo.start(t); nb.start(t, Math.random()); gl.start(t);
    for (const n of [o, jit, lfo, nb, gl]) n.stop(end);
    return dur;
  }
  // Susurro: aire sin voz modelado por formantes que saltan de sílaba en sílaba (ininteligible, muy cerca del oído)
  whisper(pan, vol, dist = 2) {
    if (!this.ctx) return 0;
    const c = this.ctx, t = c.currentTime + 0.01, dur = rand(1.2, 2.4), out = this.out(pan, vol, 0.3, dist), syl = rand(5, 8), n = Math.floor(dur * syl);
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 650; src.connect(hp);
    const sy = c.createGain(); sy.gain.setValueAtTime(0, t);
    for (let i = 0; i < n; i++) { const s0 = t + i / syl; if (Math.random() < 0.18) continue; sy.gain.linearRampToValueAtTime(rand(0.55, 1), s0 + 0.035); sy.gain.linearRampToValueAtTime(0.04, s0 + (rand(0.6, 0.95)) / syl); }
    sy.gain.linearRampToValueAtTime(0, t + dur);
    const VW = [[700, 1200], [400, 2200], [550, 1700], [300, 2400], [650, 1000]];
    for (let k = 0; k < 2; k++) {
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = k ? 9 : 6;
      for (let i = 0; i < n; i++) f.frequency.setValueAtTime(VW[Math.floor(Math.random() * VW.length)][k] * rand(0.9, 1.1), t + i / syl);
      const g = c.createGain(); g.gain.value = k ? 0.42 : 0.55; hp.connect(f); f.connect(g); g.connect(sy);
    }
    const sib = c.createBiquadFilter(); sib.type = 'highpass'; sib.frequency.value = 4500; const sg = c.createGain(); sg.gain.value = 0.045; hp.connect(sib); sib.connect(sg); sg.connect(sy); // sibilantes
    sy.connect(out); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    return dur;
  }
  zscreech(pan, vol, k = 1) { // chillido del corredor (o del Acometedor, más grave) al detectarte
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, out = this.out(pan, vol, 0.6), o = c.createOscillator();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(650 * k, t); o.frequency.exponentialRampToValueAtTime(1250 * k, t + 0.12); o.frequency.exponentialRampToValueAtTime(480 * k, t + 0.6); o.start(t); o.stop(t + 0.65);
    this.bp(o, 'bandpass', 1500, 3).connect(this.envG(out, t, 0.2, 0.03, 0.55));
    this.bp(this.nsrc(t, 0.45), 'highpass', 2500, 0.7).connect(this.envG(out, t, 0.06, 0.02, 0.4));
  }
  thud(pan, vol) { // cuerpo contra el barro
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, out = this.out(pan, vol, 0.2);
    this.bp(this.nsrc(t, 0.25), 'lowpass', 190, 0.8).connect(this.envG(out, t, 0.5, 0.004, 0.22));
    this.osc('sine', 75, 42, t, 0.22).connect(this.envG(out, t, 0.4, 0.003, 0.2));
  }
  splat(pan, vol) { // reventón del hinchado
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, out = this.out(pan, vol, 0.7);
    this.bp(this.nsrc(t, 0.45), 'lowpass', 1300, 0.7).connect(this.envG(out, t, 0.9, 0.003, 0.45));
    this.osc('sine', 95, 38, t, 0.45).connect(this.envG(out, t, 0.9, 0.003, 0.42));
    const sq = this.nsrc(t + 0.05, 0.4), f = this.bp(sq, 'bandpass', 300, 4); f.frequency.exponentialRampToValueAtTime(1600, t + 0.4); f.connect(this.envG(out, t + 0.05, 0.25, 0.01, 0.35));
  }
  flesh(head, heavy = false) { // impacto en carne (más agudo en la cabeza, más húmedo y grave si es crítico o a quemarropa)
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.012, out = this.out(0, 1, 0.15);
    this.bp(this.nsrc(t, 0.08), 'bandpass', head ? 1300 : 750, 1.1).connect(this.envG(out, t, head ? 0.55 : 0.45, 0.002, 0.07));
    this.osc('sine', head ? 140 : 100, 55, t, 0.1).connect(this.envG(out, t, 0.45, 0.002, 0.09));
    if (heavy) { const sq = this.nsrc(t + 0.02, 0.2), f = this.bp(sq, 'bandpass', 420, 3); f.frequency.exponentialRampToValueAtTime(1500, t + 0.2); f.connect(this.envG(out, t + 0.02, 0.22, 0.008, 0.18)); }
  }
  crunch(pan, vol) { // cráneo que revienta: chasquidos de hueso + chapoteo
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.01, out = this.out(pan, vol, 0.45);
    for (let i = 0; i < 4; i++) this.bp(this.nsrc(t + i * 0.018, 0.03), 'bandpass', rand(2200, 3600), 2).connect(this.envG(out, t + i * 0.018, 0.4 - i * 0.07, 0.001, 0.025));
    this.bp(this.nsrc(t + 0.02, 0.35), 'lowpass', 1100, 0.8).connect(this.envG(out, t + 0.02, 0.6, 0.004, 0.3));
    this.osc('sine', 120, 45, t, 0.2).connect(this.envG(out, t, 0.5, 0.003, 0.18));
  }
  whoosh() { // el cuchillo corta el aire
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, out = this.out(0, 1, 0.12), f = this.bp(this.nsrc(t, 0.26), 'bandpass', 600, 2.2);
    f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.12); f.frequency.exponentialRampToValueAtTime(900, t + 0.24);
    f.connect(this.envG(out, t, 0.35, 0.07, 0.17));
  }
  slash() { // tajo en carne: desgarro húmedo + golpe sordo
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.005, out = this.out(0, 1, 0.2);
    const f = this.bp(this.nsrc(t, 0.2), 'bandpass', 1800, 1.4); f.frequency.exponentialRampToValueAtTime(700, t + 0.18); f.connect(this.envG(out, t, 0.5, 0.004, 0.17));
    this.osc('sine', 110, 50, t, 0.12).connect(this.envG(out, t, 0.45, 0.002, 0.11));
    this.bp(this.nsrc(t + 0.03, 0.25), 'lowpass', 500, 1).connect(this.envG(out, t + 0.03, 0.2, 0.01, 0.22));
  }
  coin() { // tintineo de moneda
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, out = this.out(0, 1, 0.4);
    [[1568, 0], [2349, 0.06], [3136, 0.11]].forEach(([f, d], i) => { const o = this.osc('triangle', f, f, t + d, 0.3); o.connect(this.envG(out, t + d, 0.12 - i * 0.025, 0.003, 0.28)); });
  }
  hurt() { // quejido del jugador al recibir un golpe
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, out = this.out(0, 1, 0.15);
    this.bp(this.osc('sawtooth', rand(200, 230), 135, t, 0.24), 'bandpass', 700, 2).connect(this.envG(out, t, 0.24, 0.01, 0.22));
    this.bp(this.nsrc(t, 0.2), 'bandpass', 1400, 1).connect(this.envG(out, t, 0.08, 0.01, 0.16));
  }
  click() { this.tone(1900, 0.05, 0.002, 0.03, 'square', 0); }
  tick(t, f, g, d = 0.02) { const o = this.osc('square', f, f * 0.8, t, d); this.bp(o, 'bandpass', f, 4).connect(this.envG(this.out(0, 1, 0.05), t, g, 0.001, d)); }
  metal(t, f, g, d) { const o = this.osc('triangle', f, f * 0.995, t, d), o2 = this.osc('triangle', f * 2.71, f * 2.7, t, d * 0.6), out = this.out(0, 1, 0.25); o.connect(this.envG(out, t, g, 0.001, d)); o2.connect(this.envG(out, t, g * 0.4, 0.001, d * 0.6)); }
  reload(kind = 'pistol') { // cargador fuera, cargador dentro y corredera
    if (!this.ctx) return; const t = this.ctx.currentTime, k = kind === 'shotgun' ? 0.55 : 1;
    this.tick(t + 0.05, 1400, 0.14); this.bp(this.nsrc(t + 0.06, 0.05), 'bandpass', 2400, 2).connect(this.envG(this.out(0, 1, 0.05), t + 0.06, 0.12, 0.002, 0.05));
    this.tick(t + 0.45 * k + 0.25, 900, 0.2, 0.03); this.metal(t + 0.47 * k + 0.25, 2100, 0.05, 0.08);
    this.tick(t + 0.75 * k + 0.35, 1800, 0.18); this.tick(t + 0.82 * k + 0.35, 1200, 0.2, 0.03);
  }
  dry() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tick(t, 2600, 0.12, 0.012); this.tick(t + 0.03, 1700, 0.06, 0.01); }
  pickup() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tick(t, 1100, 0.15, 0.03); this.metal(t + 0.02, 1800, 0.06, 0.12); this.tick(t + 0.12, 1500, 0.15, 0.03); }
  heal() { if (!this.ctx) return; const t = this.ctx.currentTime; [523, 784].forEach((f, i) => this.osc('sine', f, f, t + i * 0.1, 0.4).connect(this.envG(this.out(0, 1, 0.5), t + i * 0.1, 0.08, 0.01, 0.38))); }
  chime() { // objetivo cumplido: dos notas limpias y sutiles
    if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(0, 1, 0.7);
    [[659, 0], [988, 0.12], [1319, 0.24]].forEach(([f, d], i) => this.osc('sine', f, f, t + d, 0.9).connect(this.envG(out, t + d, 0.09 - i * 0.015, 0.008, 0.85)));
  }
  objective() { if (!this.ctx) return; const t = this.ctx.currentTime; this.osc('sine', 440, 440, t, 0.5).connect(this.envG(this.out(0, 1, 0.6), t, 0.05, 0.01, 0.45)); }
  alarm() { // alerta de peligro: dos golpes graves de sirena
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime, out = this.out(0, 1, 0.5);
    for (let i = 0; i < 2; i++) { const s = t + i * 0.42, o = this.osc('sawtooth', 220, 150, s, 0.36); this.bp(o, 'lowpass', 900, 1).connect(this.envG(out, s, 0.16, 0.02, 0.33)); }
    this.osc('sine', 55, 38, t, 1.1).connect(this.envG(out, t, 0.35, 0.01, 1.0));
  }
  clank(pan = 0, vol = 1) { if (!this.ctx) return; const t = this.ctx.currentTime; this.metal(t, rand(1500, 1900), 0.16 * vol, 0.25); this.bp(this.nsrc(t, 0.05), 'highpass', 3500, 0.8).connect(this.envG(this.out(pan, vol, 0.2), t, 0.25, 0.001, 0.04)); }
  shatter(pan = 0, vol = 1) { if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(pan, vol, 0.4); for (let i = 0; i < 6; i++) this.metal(t + i * 0.025, rand(1800, 4200), 0.08, 0.18); this.bp(this.nsrc(t, 0.4), 'highpass', 2500, 0.7).connect(this.envG(out, t, 0.4, 0.002, 0.35)); }
  glass() { if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(0, 1, 0.8); for (let i = 0; i < 9; i++) this.osc('triangle', rand(2500, 6000), rand(2000, 5000), t + i * 0.03, 0.2).connect(this.envG(out, t + i * 0.03, 0.05, 0.001, 0.18)); this.bp(this.nsrc(t, 0.45), 'highpass', 3000, 0.6).connect(this.envG(out, t, 0.35, 0.002, 0.42)); }
  boom(pan = 0, vol = 1) { // onda de choque: golpe sub-grave, crujido y polvo
    if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(pan, vol, 0.6);
    this.osc('sine', 70, 26, t, 0.9).connect(this.envG(out, t, 0.9, 0.004, 0.85));
    this.bp(this.nsrc(t, 0.49), 'lowpass', 420, 0.7).connect(this.envG(out, t, 0.8, 0.003, 0.48));
    this.bp(this.nsrc(t + 0.02, 0.3), 'bandpass', 1600, 0.8).connect(this.envG(out, t + 0.02, 0.18, 0.003, 0.28));
    if (this.ambGain) { const g = this.ambGain.gain; g.cancelScheduledValues(t); g.setTargetAtTime(0.08, t, 0.01); g.setTargetAtTime(0.32, t + 0.4, 0.8); }
  }
  spore(pan = 0, vol = 1) { if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(pan, vol, 0.5); const f = this.bp(this.nsrc(t, 0.45), 'lowpass', 700, 0.8); f.frequency.exponentialRampToValueAtTime(250, t + 0.4); f.connect(this.envG(out, t, 0.5, 0.01, 0.42)); this.bp(this.nsrc(t + 0.05, 0.4), 'bandpass', 3200, 1.5).connect(this.envG(out, t + 0.05, 0.08, 0.05, 0.3)); }
  shield(on) { if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(0, 1, 0.7), o = this.osc('sawtooth', on ? 80 : 320, on ? 320 : 60, t, 1.0); this.bp(o, 'bandpass', 600, 2).connect(this.envG(out, t, 0.14, 0.05, 0.9)); this.osc('sine', on ? 160 : 520, on ? 520 : 90, t, 1.0).connect(this.envG(out, t, 0.1, 0.05, 0.9)); }
  door() { if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(0, 1, 0.5); const s = this.ctx.createBufferSource(); s.buffer = this.brown; s.start(t, rand(0, 2), 1.7); this.bp(s, 'lowpass', 260, 0.8).connect(this.envG(out, t, 0.9, 0.15, 1.4)); this.osc('sine', 48, 40, t, 1.5).connect(this.envG(out, t, 0.25, 0.2, 1.2)); this.metal(t + 1.55, 300, 0.25, 0.4); }
  generator() { if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(0, 1, 0.3), o = this.osc('sawtooth', 20, 60, t, 2.4); this.bp(o, 'lowpass', 300, 1.5).connect(this.envG(out, t, 0.22, 0.6, 1.7)); this.tick(t, 600, 0.3, 0.05); this.tick(t + 0.15, 400, 0.3, 0.05); }
  power() { this.generator(); }
  beep() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tick(t, 1760, 0.08, 0.08); this.tick(t + 0.12, 2350, 0.08, 0.12); }
  ignite() { if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(0, 1, 0.4), f = this.bp(this.nsrc(t, 0.49), 'bandpass', 500, 0.7); f.frequency.exponentialRampToValueAtTime(2200, t + 0.45); f.connect(this.envG(out, t, 0.35, 0.05, 0.42)); }
  roundStart() { this.alarm(); this.sting(); }
  roundEnd() { this.chime(); }
  sting() { [110, 164.8, 233].forEach((f, i) => this.tone(f, 0.07 - i * 0.015, 0.4, 2.2, 'sine', 0.8)); this.burst(900, 0.4, 0.05, 1.6, 'lowpass', 0.6); }
  heartbeat() { this.tone(52, 0.25, 0.01, 0.16, 'sine', 0.1); setTimeout(() => this.tone(46, 0.18, 0.01, 0.2, 'sine', 0.1), 170); }
  groan() { // gemido lejano: anticipa a los zombis de la siguiente fase
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(rand(85, 105), t); o.frequency.linearRampToValueAtTime(rand(60, 75), t + 2.6);
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5; vg.gain.value = 4; vib.connect(vg); vg.connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 3; o.connect(f);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8); f.connect(g);
    let out = g;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = rand(-0.9, 0.9); g.connect(p); out = p; }
    out.connect(this.verb); const dry = c.createGain(); dry.gain.value = 0.25; out.connect(dry); dry.connect(this.master);
    o.start(); vib.start(); o.stop(t + 3); vib.stop(t + 3);
  }
  update(dt, game) {
    if (!this.ctx || game.state !== 'playing' || !game.player) return;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = rand(40, 80); this.groan(); } // gemido lejano de ambiente (los cercanos los emite cada zombi)
    this.whisperT = (this.whisperT ?? rand(25, 45)) - dt;
    if (this.whisperT <= 0) { const hp = game.player.health / game.player.stats.maxHealth; this.whisperT = rand(30, 65) * (hp < 0.5 ? 0.55 : 1); this.whisper(Math.random() < 0.5 ? -0.92 : 0.92, 0.55, 1.2); } // susurro sin origen junto al oído
    const p = game.player, hpR = p.health / p.stats.maxHealth;
    if (hpR < 0.35) { this.hb -= dt; if (this.hb <= 0) { this.hb = 60 / (hpR < 0.15 ? 130 : 95); this.heartbeat(); } }
    const fd = game.world.nearFire(p.position);
    if (fd < 11) { this.crackle -= dt; if (this.crackle <= 0) { this.crackle = rand(0.04, 0.25); this.burst(rand(1800, 4200), 2, Math.max(0.001, 0.12 * (1 - fd / 11)), 0.03, 'highpass', 0.05); } }
  }
  // Cuchillazo que entra: desgarro húmedo de carne + crujido óseo + golpe sordo del mango (el «swoosh» suena al lanzar el tajo)
  knifeHit(heavy = false) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.004, out = this.out(0, 1, 0.12);
    const f = this.bp(this.nsrc(t, 0.22), 'bandpass', 2400, 1.6); f.frequency.exponentialRampToValueAtTime(600, t + 0.18); f.connect(this.envG(out, t, 0.55, 0.003, 0.19));
    const w = this.bp(this.nsrc(t + 0.015, 0.3), 'lowpass', 380, 2); w.frequency.exponentialRampToValueAtTime(1200, t + 0.13); w.connect(this.envG(out, t + 0.015, 0.42, 0.01, 0.26)); // chapoteo
    for (let i = 0, n = heavy ? 5 : 3; i < n; i++) { const s = t + 0.012 + i * rand(0.009, 0.02); this.bp(this.nsrc(s, 0.02), 'bandpass', rand(2600, 4300), 3).connect(this.envG(out, s, 0.36 - i * 0.05, 0.0008, 0.018)); } // hueso
    this.osc('sine', 120, 45, t, 0.12).connect(this.envG(out, t, 0.5, 0.002, 0.11));
  }
  slide() { // deslizamiento: roce de ropa y grava que se frena
    if (!this.ctx) return; const t = this.ctx.currentTime, out = this.out(0, 1, 0.08);
    const f = this.bp(this.nsrc(t, 0.45), 'bandpass', 950, 0.8); f.frequency.exponentialRampToValueAtTime(300, t + 0.42); f.connect(this.envG(out, t, 0.3, 0.02, 0.42));
    this.bp(this.nsrc(t, 0.4), 'highpass', 3500, 0.6).connect(this.envG(out, t, 0.06, 0.03, 0.3));
  }
  // Marcador de impacto: «tick» seco e inmediato (sin reverberación); más agudo y metálico en la cabeza
  hitTick(kind = 'body') {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (kind === 'body' && t - (this.lastTick || 0) < 0.035) return; this.lastTick = t;
    const out = c.createGain(); out.connect(this.master);
    const F = { body: [3400, 0.15, 0.012], head: [5600, 0.22, 0.02], kill: [2700, 0.22, 0.03], armor: [1600, 0.12, 0.016] }[kind] || [3400, 0.15, 0.012];
    this.bp(this.osc('square', F[0], F[0] * 0.92, t, F[2]), 'bandpass', F[0], 3).connect(this.envG(out, t, F[1], 0.0006, F[2]));
    this.bp(this.nsrc(t, 0.01), 'highpass', 6000, 0.7).connect(this.envG(out, t, F[1] * 0.6, 0.0004, 0.006));
    if (kind === 'head') this.osc('triangle', 7400, 7000, t + 0.012, 0.05).connect(this.envG(out, t + 0.012, 0.07, 0.001, 0.05));
    if (kind === 'kill') this.osc('sine', 180, 70, t, 0.09).connect(this.envG(out, t, 0.3, 0.002, 0.08));
  }
  // Presentación de jefe: golpe sub-grave, acorde disonante de metales que se abre y chirrido
  bossIntro(phase = false) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, out = this.out(0, 1, 0.9), L = phase ? 2.2 : 3.4;
    this.osc('sine', 62, 24, t, 1.6).connect(this.envG(out, t, 0.9, 0.006, 1.5));
    this.bp(this.nsrc(t, 0.49), 'lowpass', 600, 0.7).connect(this.envG(out, t, 0.7, 0.004, 0.45));
    [55, 58.3, 82.4, 116.5].forEach((f, i) => { const lp = this.bp(this.osc('sawtooth', f, f * 0.985, t + 0.05, L), 'lowpass', 180, 1.2); lp.frequency.exponentialRampToValueAtTime(1400, t + L * 0.55); lp.frequency.exponentialRampToValueAtTime(300, t + L); lp.connect(this.envG(out, t + 0.05, 0.085 - i * 0.012, 0.25, L - 0.3)); });
    this.bp(this.osc('sawtooth', 2400, 1700, t + 0.3, 1.4), 'bandpass', 2200, 8).connect(this.envG(out, t + 0.3, 0.025, 0.4, 1.0));
    if (this.ambGain) { const g = this.ambGain.gain; g.cancelScheduledValues(t); g.setTargetAtTime(0.05, t, 0.05); g.setTargetAtTime(0.32, t + L, 1); }
  }
  setMuted(m) { if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05); }
}
