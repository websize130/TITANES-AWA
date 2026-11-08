// Mando remoto: convierte el móvil/tablet en un gamepad táctil para el Modo TV.
// No arranca el mundo 3D (ahorra batería): solo la interfaz del mando y la red.
// Envía movimiento, cámara y botones a 20 Hz; recibe vibración y estado de la TV.
import { NetworkClient } from '../net/NetworkClient.js';
import { PAD } from '../core/TvMode.js';

const SEND_HZ = 20;
const STICK_R = 60;
const LOOK_SENS = 0.007;

export class RemotePad {
  constructor(initialCode = '') {
    document.body.classList.add('pad-mode');
    this.root = document.getElementById('pad');
    this.root.classList.remove('hidden');
    this.pairEl = document.getElementById('pad-pair');
    this.playEl = document.getElementById('pad-play');
    this.codeEls = [...document.querySelectorAll('.pad-digit')];
    this.statusEl = document.getElementById('pad-status');
    this.code = '';
    this.bits = 0;
    this.move = [0, 0];
    this.look = [0, 0];
    this.net = null;
    this.paired = false;

    this.buildKeypad();
    this.bindPlay();
    for (const ch of String(initialCode).replace(/\D/g, '').slice(0, 4)) this.typeDigit(ch);
    if (this.code.length === 4) this.connect();
    setInterval(() => this.send(), 1000 / SEND_HZ);
  }

  // ------------------------------------------------------------ emparejar
  buildKeypad() {
    const pad = document.getElementById('pad-keys');
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pad-key${k === '✔' ? ' ok' : k === '⌫' ? ' del' : ''}`;
      b.textContent = k;
      b.addEventListener('click', () => {
        this.buzz(10);
        if (k === '⌫') this.typeDigit(null);
        else if (k === '✔') this.connect();
        else this.typeDigit(k);
      });
      pad.appendChild(b);
    }
  }

  typeDigit(ch) {
    if (ch === null) this.code = this.code.slice(0, -1);
    else if (this.code.length < 4) this.code += ch;
    this.codeEls.forEach((el, i) => {
      el.textContent = this.code[i] ?? '';
      el.classList.toggle('filled', i < this.code.length);
    });
    if (this.code.length === 4 && ch !== null) this.connect();
  }

  async connect() {
    if (this.code.length !== 4) {
      this.status('Escribe las 4 cifras que aparecen en la tele.');
      return;
    }
    this.status('Conectando con la tele…');
    this.goFullscreen();
    if (!this.net) {
      this.net = new NetworkClient();
      this.net.onTvPaired = () => this.onPaired();
      this.net.onTvLost = () => this.onLost();
      this.net.onTvFeedback = (msg) => this.onFeedback(msg);
      this.net.onError = (msg) => { if (msg.code === 'tv') this.status(`❌ ${msg.msg}`); };
    }
    try {
      await this.net.connect();
      this.net.tvJoin(this.code);
    } catch {
      this.status('No hay conexión con el servidor del juego.');
    }
  }

  onPaired() {
    this.paired = true;
    this.pairEl.classList.add('hidden');
    this.playEl.classList.remove('hidden');
    document.getElementById('pad-tv').textContent = `📺 TV ${this.code}`;
    this.buzz([30, 40, 30]);
    this.keepAwake();
  }

  onLost() {
    this.paired = false;
    this.playEl.classList.add('hidden');
    this.pairEl.classList.remove('hidden');
    this.status('📺 La tele se ha desconectado. Vuelve a escribir el código.');
    this.buzz(200);
  }

  /** Vibración y estado (icono de la habilidad, modo, galletas…). */
  onFeedback(msg) {
    if (msg.hap) this.buzz(msg.hap);
    const st = msg.st;
    if (!st) return;
    document.getElementById('pad-ab-icon').textContent = st.icon || '✨';
    document.getElementById('pad-ab-name').textContent = st.ability || 'Habilidad';
    document.getElementById('pad-cookies').textContent = `🍪 ${st.cookies}`;
    this.root.style.setProperty('--accent', st.accent || '#ffc94a');
    const hint = {
      menu: 'Menú: ✔ A para jugar',
      select: 'Elige perro: ◀ ▶ y A para confirmar',
      shop: 'Tienda: ◀ ▶ ▲ ▼ · A comprar/poner · X/Y pestañas · B salir',
      dialog: 'A para continuar',
    }[st.mode] || st.prompt || '';
    document.getElementById('pad-hint').textContent = hint;
    this.root.classList.toggle('menu-mode', st.mode !== 'playing');
  }

  status(text) {
    this.statusEl.textContent = text;
  }

  // ------------------------------------------------------------ mando
  bindPlay() {
    // Joystick flotante (mitad izquierda).
    const zone = document.getElementById('pad-stick-zone');
    const base = document.getElementById('pad-stick');
    const knob = base.querySelector('.pad-knob');
    let id = -1;
    let ox = 0;
    let oy = 0;
    const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
    zone.addEventListener('pointerdown', (e) => {
      if (id !== -1) return;
      id = e.pointerId;
      try { zone.setPointerCapture(id); } catch { /* */ }
      const r = zone.getBoundingClientRect();
      ox = e.clientX;
      oy = e.clientY;
      base.style.left = `${ox - r.left}px`;
      base.style.top = `${oy - r.top}px`;
      base.classList.add('active');
      this.buzz(8);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox;
      let dy = e.clientY - oy;
      const len = Math.hypot(dx, dy);
      if (len > STICK_R) { dx = (dx / len) * STICK_R; dy = (dy / len) * STICK_R; }
      setKnob(dx, dy);
      // Magnitud con zona muerta; dirección normalizada (y hacia arriba = adelante).
      const m = Math.min(1, len / STICK_R);
      const dead = 0.12;
      const mag = m < dead ? 0 : (m - dead) / (1 - dead);
      const n = Math.hypot(dx, dy) || 1; // dx, dy ya recortados al radio del stick
      this.move = [round((dx / n) * mag), round((-dy / n) * mag)];
      this.updateDpad();
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = -1;
      setKnob(0, 0);
      base.classList.remove('active');
      this.move = [0, 0];
      this.updateDpad();
      this.send();
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // Zona de cámara (arrastrar).
    const look = document.getElementById('pad-look');
    let lid = -1;
    let lx = 0;
    let ly = 0;
    look.addEventListener('pointerdown', (e) => {
      if (lid !== -1) return;
      lid = e.pointerId;
      try { look.setPointerCapture(lid); } catch { /* */ }
      lx = e.clientX;
      ly = e.clientY;
    });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lid) return;
      this.look[0] += (e.clientX - lx) * LOOK_SENS;
      this.look[1] += (e.clientY - ly) * LOOK_SENS;
      lx = e.clientX;
      ly = e.clientY;
    });
    const lend = (e) => { if (e.pointerId === lid) lid = -1; };
    look.addEventListener('pointerup', lend);
    look.addEventListener('pointercancel', lend);

    // Botones: se mantienen pulsados mientras el dedo está encima.
    for (const btn of this.root.querySelectorAll('[data-bit]')) {
      const bit = PAD[btn.dataset.bit];
      let pid = -1;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (pid !== -1) return;
        pid = e.pointerId;
        try { btn.setPointerCapture(pid); } catch { /* */ }
        btn.classList.add('down');
        this.bits |= bit;
        this.buzz(btn.dataset.bit === 'A' ? 14 : 10);
        this.send();
      });
      const up = (e) => {
        if (e.pointerId !== pid) return;
        pid = -1;
        btn.classList.remove('down');
        this.bits &= ~bit;
        this.send();
      };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
    }
    // Evitar zoom / menú contextual en pulsaciones largas.
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** En menús, el stick también funciona como cruceta (flechas). */
  updateDpad() {
    const [x, y] = this.move;
    this.bits &= ~(PAD.UP | PAD.DOWN | PAD.LEFT | PAD.RIGHT);
    if (Math.max(Math.abs(x), Math.abs(y)) > 0.6) {
      if (Math.abs(x) > Math.abs(y)) this.bits |= x > 0 ? PAD.RIGHT : PAD.LEFT;
      else this.bits |= y > 0 ? PAD.UP : PAD.DOWN;
    }
  }

  send() {
    if (!this.paired || !this.net) return;
    this.net.tvInput(this.move, [round(this.look[0]), round(this.look[1])], this.bits);
    this.look = [0, 0];
  }

  buzz(pattern) {
    try { navigator.vibrate?.(pattern); } catch { /* sin vibración */ }
  }

  goFullscreen() {
    const el = document.documentElement;
    try {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {});
      screen.orientation?.lock?.('landscape')?.catch?.(() => {});
    } catch { /* */ }
  }

  /** Mantener la pantalla encendida mientras se juega. */
  async keepAwake() {
    try {
      this.wake = await navigator.wakeLock?.request('screen');
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && this.paired) this.wake = await navigator.wakeLock?.request('screen');
      });
    } catch { /* no soportado */ }
  }
}

const round = (n) => Math.round(n * 1000) / 1000;
