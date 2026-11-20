import { $, clamp } from '../core/utils.js';
import { icon } from '../ui/icons.js';
import { loadPeer, peerOpts } from './vendor.js';

/* =====================================================================
   INVITADO ONLINE (?unirse=CÓDIGO): entra directo en la partida de un amigo como Jugador 2.
   Recibe su vista en vídeo (con sonido) y el HUD como datos; envía su mando a 60 Hz:
   · ordenador: teclado y ratón (WASD, Mayús correr, clic izq. disparar, clic dcho. apuntar, E usar, R recargar,
     C agacharse, V cuchillo, X arma, F linterna, Q hombro, Esc pausa)
   · móvil / tablet: joystick, zona de cámara y botones (el de la mano solo aparece cuando hay una acción)
   · mando físico conectado al dispositivo del invitado
   ===================================================================== */
const B = { use: 0, crouch: 1, reload: 2, swap: 3, shoulder: 4, knife: 5, aim: 6, fire: 7, pause: 9, light: 12 };
const KEYS = { KeyE: B.use, KeyC: B.crouch, ControlLeft: B.crouch, KeyR: B.reload, KeyX: B.swap, Tab: B.swap, KeyQ: B.shoulder, KeyV: B.knife, KeyF: B.light, Escape: B.pause, KeyP: B.pause };

export const GuestApp = {
  start(code) {
    document.body.dataset.state = 'guest'; document.title = 'Invitado · BLOOD DEAD';
    ['#boot', '#scene', '#dlBtn'].forEach((s) => { const e = $(s); if (e) e.remove(); });
    const touch = matchMedia('(pointer: coarse)').matches;
    const root = document.createElement('div'); root.id = 'guest'; if (touch) root.classList.add('touch');
    const btn = (n, ic, l) => `<button class="g-btn g-${n}" data-b="${B[n]}" aria-label="${l}">${icon(ic)}</button>`;
    root.innerHTML = `<video id="gVideo" playsinline autoplay muted></video>
      <div class="g-hud">
        <div class="g-top"><span class="g-obj" id="gObj"></span><span class="g-status" id="gStatus">Conectando…</span></div>
        <div class="g-hp"><b id="gName">Jugador 2</b><div class="g-bar"><i id="gHp"></i></div></div>
        <div class="g-ammo"><span id="gWpn"></span><b id="gMag">–</b><span id="gRes"></span></div>
        <div class="g-cross" id="gCross"><i></i><i></i><i></i><i></i></div>
        <div class="g-prompt" id="gPrompt" hidden><span class="g-ring"><i id="gRing"></i></span><span id="gPromptText"></span></div>
        <div class="g-alert" id="gAlert" hidden><b></b><span></span></div>
        <div class="g-resp" id="gResp" hidden></div>
        <button class="g-sound" id="gSound" hidden>${icon('volume')}Activar sonido</button>
      </div>
      ${touch ? `<div class="g-touch"><div class="g-joy" id="gJoy"><div class="g-base"><div class="g-knob" id="gKnob"></div></div></div><div class="g-look" id="gLook"></div>
        <div class="g-btns">${btn('fire', 'crosshair', 'Disparar')}${btn('aim', 'scan', 'Apuntar')}${btn('knife', 'knife', 'Cuchillo')}${btn('crouch', 'slide', 'Agacharse')}${btn('reload', 'reload', 'Recargar')}${btn('swap', 'gun', 'Arma')}${btn('light', 'flashlight', 'Linterna')}${btn('use', 'hand', 'Usar').replace('<button', '<button hidden')}</div>
        <button class="g-btn g-pause" data-b="${B.pause}" aria-label="Pausa">${icon('pause')}</button></div>` : ''}
      <div class="g-overlay" id="gOverlay">
        <div class="g-card"><b class="g-logo">BLOOD <em>DEAD</em></b><span class="eyebrow">Invitación · código ${code}</span>
          <h2>Únete a la partida de tu amigo</h2>
          <label class="g-label">Tu nombre<input id="gNameIn" maxlength="16" placeholder="Amigo" autocomplete="nickname"></label>
          <button class="btn btn-primary btn-block" id="gGo">${icon('play')}Entrar en la partida</button>
          <p class="g-help">${touch ? 'Gira el móvil en horizontal. Joystick a la izquierda, desliza a la derecha para mirar.' : 'Haz clic en la imagen para controlar la cámara con el ratón · WASD moverse · Mayús correr · clic izquierdo disparar · clic derecho apuntar · E usar · R recargar · C agacharse · V cuchillo · X arma · F linterna'}</p>
          <span class="pad-status" id="gErr"></span>
        </div>
      </div>`;
    document.body.appendChild(root);
    const video = $('#gVideo'), st = { a: [0, 0], l: [0, 0], r: [0, 0], b: 0, latch: 0, run: false }, keys = new Set();
    try { $('#gNameIn').value = localStorage.getItem('blooddead.guestName') || ''; } catch (e) { /* sin almacenamiento */ }
    const setB = (i, on) => { if (on) { st.b |= 1 << i; st.latch |= 1 << i; } else st.b &= ~(1 << i); };
    const status = (t, ok = false) => { const s = $('#gStatus'); s.textContent = t; s.classList.toggle('ok', ok); };
    const vib = (ms) => { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* sin vibración */ } };
    let conn = null, peer = null, sendT = null, alertT = null;

    // ---- Entrada: teclado y ratón ----
    if (!touch) {
      addEventListener('keydown', (e) => { if (e.repeat) return; keys.add(e.code); if (KEYS[e.code] !== undefined) { e.preventDefault(); setB(KEYS[e.code], true); } });
      addEventListener('keyup', (e) => { keys.delete(e.code); if (KEYS[e.code] !== undefined) setB(KEYS[e.code], false); });
      video.addEventListener('click', () => { if (conn && document.pointerLockElement !== video && video.requestPointerLock) video.requestPointerLock(); });
      addEventListener('mousemove', (e) => { if (document.pointerLockElement === video) { st.l[0] += e.movementX * 0.38; st.l[1] += e.movementY * 0.38; } });
      addEventListener('mousedown', (e) => { if (document.pointerLockElement !== video) return; if (e.button === 0) setB(B.fire, true); if (e.button === 2) setB(B.aim, true); });
      addEventListener('mouseup', (e) => { if (e.button === 0) setB(B.fire, false); if (e.button === 2) setB(B.aim, false); });
      addEventListener('contextmenu', (e) => e.preventDefault());
    }
    // ---- Entrada: táctil (joystick, cámara y botones) ----
    if (touch) {
      root.querySelectorAll('[data-b]').forEach((el) => {
        const i = +el.dataset.b;
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); setB(i, true); el.classList.add('on'); vib(8); });
        for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => { setB(i, false); el.classList.remove('on'); });
      });
      const jz = $('#gJoy'), knob = $('#gKnob'), R = 56; let jid = null, ox = 0, oy = 0;
      const mv = (e) => { if (e.pointerId !== jid) return; let dx = e.clientX - ox, dy = e.clientY - oy; const L = Math.hypot(dx, dy); if (L > R) { dx *= R / L; dy *= R / L; } st.a = [dx / R, dy / R]; st.run = L > R * 0.98 && dy < -R * 0.7; knob.style.transform = `translate3d(${dx}px,${dy}px,0)`; };
      jz.addEventListener('pointerdown', (e) => { jid = e.pointerId; const r = jz.querySelector('.g-base').getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; jz.setPointerCapture(e.pointerId); mv(e); });
      jz.addEventListener('pointermove', mv);
      const je = (e) => { if (e.pointerId !== jid) return; jid = null; st.a = [0, 0]; st.run = false; knob.style.transform = ''; };
      jz.addEventListener('pointerup', je); jz.addEventListener('pointercancel', je);
      const lz = $('#gLook'); let lid = null, lx = 0, ly = 0;
      lz.addEventListener('pointerdown', (e) => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; lz.setPointerCapture(e.pointerId); });
      lz.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; st.l[0] += (e.clientX - lx) * 1.15; st.l[1] += (e.clientY - ly) * 1.15; lx = e.clientX; ly = e.clientY; });
      const le = (e) => { if (e.pointerId === lid) lid = null; }; lz.addEventListener('pointerup', le); lz.addEventListener('pointercancel', le);
    }
    // ---- Envío a 60 Hz (con mando físico del invitado si lo hay) ----
    const send = () => {
      if (!conn || !conn.open) return;
      let a = st.a, r = st.r, b = st.b | st.latch;
      const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g && g.connected) : null;
      if (gp) { a = [gp.axes[0] || 0, gp.axes[1] || 0]; r = [gp.axes[2] || 0, gp.axes[3] || 0]; gp.buttons.forEach((x, i) => { if (i < 17 && (x.pressed || x.value > 0.5)) b |= 1 << i; }); }
      else if (!touch) { // WASD: caminar (0,85) y correr con Mayús (1)
        const k = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1 : 0.85, x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0), y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0), L = Math.hypot(x, y) || 1;
        a = [(x / L) * k, (y / L) * k];
      } else if (st.run) a = [st.a[0], -1];
      try { conn.send({ t: 'in', a, l: st.l, r, b }); } catch (e) { return; }
      st.l = [0, 0]; st.latch = 0;
    };
    // ---- HUD recibido ----
    const hud = (m) => {
      if (m.st && m.st !== 'playing') status(m.st === 'paused' ? 'En pausa' : m.st === 'dead' ? 'Habéis caído' : m.st === 'complete' ? 'Completado' : 'Esperando al anfitrión…', true); else status('', true);
      if (m.hp === undefined) return;
      $('#gName').textContent = m.name || 'Jugador 2'; $('#gHp').style.width = `${clamp(m.hp / m.max, 0, 1) * 100}%`; $('#gHp').classList.toggle('low', m.hp / m.max < 0.3);
      $('#gWpn').textContent = m.wpn || ''; $('#gMag').textContent = m.reload ? '…' : String(m.mag); $('#gRes').textContent = m.res < 0 ? '/ ∞' : `/ ${m.res}`;
      $('#gObj').textContent = m.obj || '';
      $('#gCross').classList.toggle('aim', !!m.aim);
      const pr = $('#gPrompt'); pr.hidden = !m.pr; if (m.pr) { $('#gPromptText').textContent = m.pr[0]; $('#gRing').style.transform = `scaleX(${clamp(m.pr[1], 0, 1)})`; }
      const useB = root.querySelector('.g-use'); if (useB) useB.hidden = !m.pr; // mano contextual: solo con una acción disponible
      const rs = $('#gResp'); rs.hidden = m.alive !== false; if (m.alive === false) rs.textContent = `Caído · tu compañero puede reanimarte · ${m.resp} s`;
    };
    const showAlert = (m) => {
      const el = $('#gAlert'); el.querySelector('b').textContent = m.title || ''; el.querySelector('span').textContent = m.sub || ''; el.className = 'g-alert ' + (m.kind || 'info'); el.hidden = false;
      clearTimeout(alertT); alertT = setTimeout(() => { el.hidden = true; }, 2600);
    };
    // ---- Conexión ----
    const connect = async () => {
      const err = $('#gErr'), name = ($('#gNameIn').value || 'Amigo').trim().slice(0, 16);
      try { localStorage.setItem('blooddead.guestName', name); } catch (e) { /* sin almacenamiento */ }
      err.textContent = 'Conectando con la partida…'; err.className = 'pad-status';
      if (touch) { try { await document.documentElement.requestFullscreen(); await screen.orientation.lock('landscape'); } catch (e) { /* opcional */ } }
      let Peer; try { Peer = await loadPeer(); } catch (e) { err.textContent = 'No se pudo cargar la conexión (¿sin Internet?)'; err.className = 'pad-status err'; return; }
      peer = peerOpts() ? new Peer(peerOpts()) : new Peer();
      peer.on('error', (e) => { err.textContent = e.type === 'peer-unavailable' ? 'No se encuentra la partida: comprueba el código y que tu amigo la tenga abierta' : 'Error de conexión: ' + (e.type || e.message); err.className = 'pad-status err'; $('#gOverlay').hidden = false; });
      peer.on('call', (call) => { call.answer(); call.on('stream', (s) => { video.srcObject = s; video.muted = true; video.play().catch(() => {}); $('#gSound').hidden = false; }); });
      peer.on('open', () => {
        conn = peer.connect('blooddead-net-' + code, { serialization: 'json', reliable: true, metadata: { name } });
        conn.on('open', () => { $('#gOverlay').hidden = true; status('Conectado', true); clearInterval(sendT); sendT = setInterval(send, 16); vib([30, 60, 30]); });
        conn.on('data', (m) => { if (!m || typeof m !== 'object') return; if (m.t === 'hud') hud(m); else if (m.t === 'alert') showAlert(m); else if (m.t === 'vib') vib(m.ms); else if (m.t === 'full') { err.textContent = 'La partida ya tiene compañero'; err.className = 'pad-status err'; $('#gOverlay').hidden = false; } });
        conn.on('close', () => { clearInterval(sendT); status('Desconectado'); err.textContent = 'La partida se ha cerrado o se perdió la conexión'; err.className = 'pad-status err'; $('#gOverlay').hidden = false; $('#gGo').textContent = 'Reconectar'; });
      });
    };
    $('#gGo').addEventListener('click', connect);
    $('#gSound').addEventListener('click', () => { video.muted = false; video.play().catch(() => {}); $('#gSound').hidden = true; });
  },
};
