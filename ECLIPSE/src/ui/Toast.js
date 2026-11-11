/** Avisos breves (mando conectado, guardado, etc.). Máximo 3 a la vez. */
export class Toast {
  constructor(container) { this.container = container; }

  show(text, { icon = '', duration = 2800 } = {}) {
    while (this.container.children.length >= 3) this.container.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span></span>`;
    el.lastElementChild.textContent = text;
    this.container.append(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => {
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), 450);
    }, duration);
  }
}
