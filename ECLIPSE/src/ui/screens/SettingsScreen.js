// Pantalla de ajustes generada a partir de un esquema. Cada fila se ajusta con
// izquierda/derecha (mando/teclado), tocando las flechas o pulsando la fila.

const SCHEMA = [
  { section: 'Imagen' },
  {
    key: 'graphics', label: 'Calidad gráfica', type: 'options',
    options: [['auto', 'Automática'], ['low', 'Baja'], ['medium', 'Media'], ['high', 'Alta']],
    hint: 'Automática elige según tu dispositivo. Alta puede calentar tablets y móviles.',
  },
  { key: 'showStats', label: 'Mostrar rendimiento', type: 'toggle', hint: 'Muestra FPS y datos de la GPU durante la partida.' },
  { key: 'fullscreenOnPlay', label: 'Pantalla completa al jugar', type: 'toggle', hint: 'Solo en navegadores que lo permitan.' },
  { section: 'Sonido' },
  { key: 'masterVolume', label: 'Volumen general', type: 'range', hint: 'Volumen global del juego.' },
  { key: 'sfxVolume', label: 'Efectos', type: 'range', hint: 'Sonidos de interfaz y combate.' },
  { key: 'musicVolume', label: 'Ambiente', type: 'range', hint: 'Música y ambiente.' },
  { section: 'Control' },
  { key: 'lookSensitivity', label: 'Sensibilidad de cámara', type: 'range', min: 0.4, max: 2, step: 0.2, hint: 'Ratón, stick derecho y arrastre táctil.' },
  { key: 'invertY', label: 'Invertir eje vertical', type: 'toggle', hint: 'Invierte el movimiento vertical de la cámara.' },
  { key: 'vibration', label: 'Vibración', type: 'toggle', hint: 'Vibración del mando o del dispositivo, si es compatible.' },
  {
    key: 'promptStyle', label: 'Iconos de botones', type: 'options',
    options: [['auto', 'Automático'], ['playstation', 'PlayStation'], ['xbox', 'Xbox'], ['generic', 'Genérico']],
    hint: 'Automático detecta el tipo de mando conectado.',
  },
];

const RANGE_DEFAULT = { min: 0, max: 1, step: 0.1 };

export function registerSettings(router, settings) {
  const list = document.querySelector('#settings-list');
  const hint = document.querySelector('#settings-hint');
  const rows = [];

  for (const item of SCHEMA) {
    if (item.section) {
      const h = document.createElement('h3');
      h.className = 'settings-section';
      h.textContent = item.section;
      list.append(h);
      continue;
    }
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'settings-row';
    row.setAttribute('data-nav', '');
    row.setAttribute('data-adjust', '');
    row.innerHTML = `<span class="settings-label"></span>
      <span class="settings-value">
        <span class="arrow" data-step="-1" aria-hidden="true">‹</span>
        <span class="value"></span>
        <span class="arrow" data-step="1" aria-hidden="true">›</span>
      </span>`;
    row.querySelector('.settings-label').textContent = item.label;
    row.dataset.hint = item.hint ?? '';
    const valueEl = row.querySelector('.value');

    const render = () => {
      const v = settings.get(item.key);
      if (item.type === 'toggle') {
        valueEl.textContent = v ? 'Sí' : 'No';
      } else if (item.type === 'options') {
        valueEl.textContent = item.options.find(([k]) => k === v)?.[1] ?? v;
      } else {
        const { min, max } = { ...RANGE_DEFAULT, ...item };
        const segs = 10;
        const filled = Math.round(((v - min) / (max - min)) * segs);
        valueEl.innerHTML = `<span class="segments">${'<i class="on"></i>'.repeat(filled)}${'<i></i>'.repeat(segs - filled)}</span>`;
      }
    };

    const step = (dir) => {
      const v = settings.get(item.key);
      if (item.type === 'toggle') settings.set(item.key, !v);
      else if (item.type === 'options') {
        const i = item.options.findIndex(([k]) => k === v);
        const n = item.options.length;
        settings.set(item.key, item.options[(i + dir + n) % n][0]);
      } else {
        const { min, max, step: s } = { ...RANGE_DEFAULT, ...item };
        const next = Math.round(Math.min(max, Math.max(min, v + dir * s)) * 100) / 100;
        settings.set(item.key, next);
      }
      render();
    };

    row.addEventListener('adjust', (e) => step(e.detail));
    row.addEventListener('click', (e) => {
      const arrow = e.target.closest('[data-step]');
      if (arrow) step(Number(arrow.dataset.step));
      else if (item.type !== 'range') step(1);
    });
    render();
    rows.push({ row, render });
    list.append(row);
  }

  router.register('settings', {
    onEnter() { for (const r of rows) r.render(); list.scrollTop = 0; },
    onFocus(el) { hint.textContent = el.dataset.hint ?? ''; },
    onBack() { router.pop(); },
  });
  document.querySelector('[data-action="settings-back"]').addEventListener('click', () => router.pop());
}
