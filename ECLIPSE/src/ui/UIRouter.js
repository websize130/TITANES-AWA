/**
 * Pila de pantallas de menú navegables con mando, teclado, ratón o táctil.
 * - Elementos navegables: [data-nav] dentro de la pantalla superior.
 * - Arriba/abajo mueve el foco, izquierda/derecha emite 'adjust' (ajustes),
 *   confirmar hace click(), atrás llama a onBack().
 * - Las pantallas "overlay" (diálogos) dejan visible la de debajo.
 */
export class UIRouter {
  constructor({ bus, input, audio }) {
    this.input = input;
    this.audio = audio;
    this.screens = new Map();
    this.stack = [];
    this.focused = null;
    this.blocker = null; // función que puede interceptar la entrada (p. ej. aviso de girar)

    bus.on('ui:input', (e) => this.#handle(e));

    // Ratón: el foco sigue al cursor
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target.closest?.('[data-nav]');
      if (el && this.#items().includes(el) && el !== this.focused) this.focus(el, true);
    });
    // Sonido y desenfoque nativo en cualquier activación de un elemento de menú
    document.addEventListener('click', (e) => {
      const el = e.target.closest?.('[data-nav]');
      if (!el || !this.#items().includes(el)) return;
      if (el !== this.focused) this.focus(el, false);
      this.audio.play(el.hasAttribute('data-adjust') ? 'move' : 'confirm');
      el.blur();
    }, true);
  }

  register(id, spec) {
    const el = document.querySelector(`[data-screen="${id}"]`);
    if (!el) throw new Error(`Pantalla no encontrada: ${id}`);
    el.inert = true;
    this.screens.set(id, { id, el, lastFocus: 0, ...spec });
  }

  get top() { return this.stack[this.stack.length - 1] ?? null; }

  /** Sustituye toda la pila por una pantalla. */
  show(id, params) {
    this.clear();
    this.push(id, params);
  }

  push(id, params) {
    const s = this.screens.get(id);
    const prev = this.top;
    if (prev) {
      prev.lastFocus = Math.max(0, this.#items(prev).indexOf(this.focused));
      prev.el.inert = true;
      if (!s.overlay) prev.el.classList.remove('is-active');
    }
    this.stack.push(s);
    s.el.classList.add('is-active');
    s.el.inert = false;
    s.onEnter?.(params);
    this.#focusAt(s, s.initialFocus?.(params) ?? 0);
  }

  pop() {
    const s = this.stack.pop();
    if (!s) return;
    s.el.classList.remove('is-active');
    s.el.inert = true;
    s.onExit?.();
    const prev = this.top;
    if (prev) {
      prev.el.classList.add('is-active');
      prev.el.inert = false;
      prev.onResume?.();
      this.#focusAt(prev, prev.lastFocus);
    } else {
      this.focused = null;
    }
  }

  clear() {
    while (this.stack.length) {
      const s = this.stack.pop();
      s.el.classList.remove('is-active');
      s.el.inert = true;
      s.onExit?.();
    }
    this.focused = null;
  }

  focus(el, sound = true) {
    if (this.focused === el) return;
    this.focused?.classList.remove('is-focused');
    this.focused = el;
    if (!el) return;
    el.classList.add('is-focused');
    el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    if (sound) this.audio.play('move');
    this.top?.onFocus?.(el);
  }

  refreshFocus() {
    const s = this.top;
    if (!s) return;
    if (!this.#items(s).includes(this.focused)) this.#focusAt(s, 0);
  }

  #focusAt(s, index) {
    const items = this.#items(s);
    this.focused?.classList.remove('is-focused');
    this.focused = null;
    if (items.length) this.focus(items[Math.min(index, items.length - 1)], false);
  }

  #items(s = this.top) {
    if (!s) return [];
    return [...s.el.querySelectorAll('[data-nav]')]
      .filter((el) => !el.disabled && !el.hidden && el.getClientRects().length > 0);
  }

  #handle(e) {
    if (this.blocker?.(e)) return;
    const s = this.top;
    if (!s) return;
    if (s.onInput?.(e) === true) return;
    switch (e.type) {
      case 'nav': {
        if (e.dir === 'up' || e.dir === 'down') {
          const items = this.#items(s);
          if (!items.length) return;
          const i = items.indexOf(this.focused);
          const next = (i + (e.dir === 'up' ? -1 : 1) + items.length) % items.length;
          this.focus(items[next]);
        } else if (this.focused?.hasAttribute('data-adjust')) {
          this.focused.dispatchEvent(new CustomEvent('adjust', { detail: e.dir === 'left' ? -1 : 1 }));
          this.audio.play('move');
        }
        break;
      }
      case 'confirm':
        this.focused?.click();
        break;
      case 'back':
        if (s.onBack) { this.audio.play('back'); s.onBack(); }
        break;
      case 'start':
        s.onStart?.();
        break;
      default:
        break;
    }
  }
}
