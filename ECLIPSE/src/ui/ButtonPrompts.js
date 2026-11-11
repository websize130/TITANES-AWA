/**
 * Indicaciones de botones según el dispositivo activo.
 * Glifos geométricos propios (no logotipos ni recursos de marcas):
 *  - playstation: formas ✕ ○ □ △
 *  - xbox: letras A B X Y
 *  - generic: rombo de 4 puntos con la posición resaltada
 *  - kbm: teclas y ratón
 * Uso en HTML: <span data-prompt="confirm">Seleccionar</span>
 */

const PAD_BUTTON = { confirm: 0, back: 1, interact: 0, dodge: 1, attack: 2, skill: 3, pause: 9, any: 0 };
const KEYS = {
  confirm: 'Enter', back: 'Esc', pause: 'Esc', dodge: 'Espacio', interact: 'E', skill: 'Q',
  attack: 'mouse', move: 'WASD', any: 'Enter',
};
const START_LABEL = { playstation: 'Options', xbox: 'Menú', generic: 'Start' };

const circle = '<circle cx="12" cy="12" r="10.5" class="g-ring"/>';
const SHAPES = [
  '<path d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" class="g-stroke"/>',
  '<circle cx="12" cy="12" r="4.6" class="g-stroke"/>',
  '<rect x="7.9" y="7.9" width="8.2" height="8.2" class="g-stroke"/>',
  '<path d="M12 7.3l4.9 8.4H7.1z" class="g-stroke"/>',
];
const LETTERS = ['A', 'B', 'X', 'Y'];
// Posición física: 0 abajo, 1 derecha, 2 izquierda, 3 arriba
const DOTS = [[12, 17.5], [17.5, 12], [6.5, 12], [12, 6.5]];

function svg(inner) { return `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`; }

function padGlyph(button, family) {
  if (button === 9) return `<span class="g-pill">${START_LABEL[family] ?? 'Start'}</span>`;
  if (family === 'playstation') return svg(circle + SHAPES[button]);
  if (family === 'xbox') return svg(`${circle}<text x="12" y="16.2" class="g-text">${LETTERS[button]}</text>`);
  return svg(DOTS.map(([x, y], i) =>
    `<circle cx="${x}" cy="${y}" r="3" class="${i === button ? 'g-dot-on' : 'g-dot'}"/>`).join(''));
}

function keyGlyph(action) {
  const k = KEYS[action];
  if (k === 'mouse') {
    return svg('<rect x="6.5" y="3" width="11" height="18" rx="5.5" class="g-stroke"/>'
      + '<path d="M12 3v7.5M6.5 10.5h5.5V3.6A5.5 5.5 0 0 0 6.5 9z" class="g-fill"/>');
  }
  return `<kbd class="g-key">${k}</kbd>`;
}

export function glyphFor(action, style) {
  if (style === 'kbm') return keyGlyph(action);
  if (style === 'touch') return '';
  return padGlyph(PAD_BUTTON[action] ?? 0, style);
}

export class PromptRenderer {
  constructor(bus, input, settings) {
    this.input = input;
    this.settings = settings;
    bus.on('input:device', () => this.refresh());
    bus.on('settings:changed', ({ key }) => { if (key === 'promptStyle') this.refresh(); });
  }

  get style() {
    const d = this.input.device;
    if (d !== 'gamepad') return d;
    const forced = this.settings.get('promptStyle');
    return forced === 'auto' ? this.input.padFamily : forced;
  }

  refresh(root = document) {
    const style = this.style;
    document.body.dataset.input = this.input.device;
    document.body.dataset.prompts = style;
    for (const el of root.querySelectorAll('[data-prompt]')) {
      let g = el.querySelector(':scope > .glyph');
      if (!g) {
        g = document.createElement('span');
        g.className = 'glyph';
        el.prepend(g);
      }
      g.innerHTML = glyphFor(el.dataset.prompt, style);
    }
    // Textos que dependen del dispositivo: data-text-kbm / -gamepad / -touch
    for (const el of root.querySelectorAll('[data-text-kbm]')) {
      el.textContent = el.dataset[`text${this.input.device[0].toUpperCase()}${this.input.device.slice(1)}`] ?? el.dataset.textKbm;
    }
  }
}
