import { $ } from '../core/utils.js';
import { icon } from '../ui/icons.js';
import { loadPeer } from './vendor.js';

/* Página de mando (?mando=CÓDIGO): joystick, zona de cámara y botones; vibra cuando el juego lo pide */
export const MandoApp = {
  start(code) {
    document.body.dataset.state = 'mando'; document.title = 'Mando · BLOOD DEAD';
    ['#boot', '#scene', '#dlBtn'].forEach((s) => { const e = $(s); if (e) e.remove(); });
    const B = [['fire', 7, 'crosshair', 'Disparar'], ['aim', 6, 'scan', 'Apuntar'], ['knife', 5, 'knife', 'Cuchillo'], ['reload', 2, 'reload', 'Recargar'], ['use', 0, 'hand', 'Usar'], ['slide', 1, 'slide', 'Agacharse'], ['swap', 3, 'gun', 'Arma'], ['light', 12, 'flashlight', 'Linterna']];
    const root = document.createElement('div'); root.id = 'mando';
    root.innerHTML = `<header class="md-top"><div><b>BLOOD <em>DEAD</em></b><span id="mdStatus">Conectando con la sala ${code}…</span></div><button class="md-start" data-b="9">${icon('pause')}<span>Start</span></button></header>
      <div class="md-joy" id="mdJoy"><div class="md-base"><div class="md-knob" id="mdKnob"></div></div><small>Mover · al borde superior: correr</small></div>
      <div class="md-look" id="mdLook"><small>Desliza para mirar</small></div>
      <div class="md-btns">${B.map(([n, b, ic, l]) => `<button class="md-btn md-${n}" data-b="${b}" aria-label="${l}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>`;
    document.body.appendChild(root);
    const st = { a: [0, 0], l: [0, 0], b: 0, run: false }, vib = (ms) => { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* sin vibración */ } };
    const setB = (i, on) => { st.b = on ? st.b | (1 << i) : st.b & ~(1 << i); };
    root.querySelectorAll('[data-b]').forEach((el) => {
      const i = +el.dataset.b;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); setB(i, true); el.classList.add('on'); vib(10); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => { setB(i, false); el.classList.remove('on'); });
    });
    const jz = $('#mdJoy'), knob = $('#mdKnob'); let jid = null, ox = 0, oy = 0; const R = 60;
    jz.addEventListener('pointerdown', (e) => { jid = e.pointerId; const r = jz.querySelector('.md-base').getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; jz.setPointerCapture(e.pointerId); move(e); });
    const move = (e) => { if (e.pointerId !== jid) return; let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } st.a = [dx / R, dy / R]; knob.style.transform = `translate3d(${dx}px,${dy}px,0)`; const run = l >= R * 0.95 && -dy / Math.max(l, 1) > 0.5; if (run !== st.run) { st.run = run; setB(10, run); if (run) vib(12); } };
    jz.addEventListener('pointermove', move);
    const end = (e) => { if (e.pointerId !== jid) return; jid = null; st.a = [0, 0]; knob.style.transform = ''; if (st.run) { st.run = false; setB(10, false); } };
    jz.addEventListener('pointerup', end); jz.addEventListener('pointercancel', end);
    const lz = $('#mdLook'); let lid = null, lx = 0, ly = 0;
    lz.addEventListener('pointerdown', (e) => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; lz.setPointerCapture(e.pointerId); });
    lz.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; st.l[0] += (e.clientX - lx) * 1.15; st.l[1] += (e.clientY - ly) * 1.15; lx = e.clientX; ly = e.clientY; });
    const lend = (e) => { if (e.pointerId === lid) lid = null; }; lz.addEventListener('pointerup', lend); lz.addEventListener('pointercancel', lend);
    const status = (t, ok) => { const s = $('#mdStatus'); s.textContent = t; s.className = ok ? 'ok' : ''; };
    loadPeer().then((Peer) => {
      const peer = new Peer();
      peer.on('open', () => {
        const c = peer.connect('blooddead-' + code.toUpperCase(), { serialization: 'json', reliable: false });
        c.on('open', () => { status('Conectado · eres un mando del juego', true); vib([30, 60, 30]); setInterval(() => { c.send({ a: st.a, l: st.l, b: st.b }); st.l = [0, 0]; }, 33); });
        c.on('data', (m) => { if (m && m.t === 'vib') vib(m.ms); });
        c.on('close', () => status('Conexión cerrada. Recarga para volver a conectar', false));
        setTimeout(() => { if (!c.open) status('No se encuentra la sala ' + code + '. Revisa el código en la pantalla del juego', false); }, 9000);
      });
      peer.on('error', (e) => status('Error de conexión: ' + (e.type || e.message), false));
    }).catch(() => status('No se pudo cargar el módulo de conexión (¿sin Internet?)', false));
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* sin bloqueo */ }
  },
};
