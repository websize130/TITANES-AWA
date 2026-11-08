// Cuadro de diálogo de Isabel, la bruja guía (páginas con efecto máquina de escribir).
export class Dialog {
  constructor() {
    this.root = document.getElementById('dialog');
    this.textEl = document.getElementById('dialog-text');
    this.pageEl = document.getElementById('dialog-page');
    this.nextBtn = document.getElementById('dialog-next');
    this.pages = [];
    this.index = 0;
    this.isOpen = false;
    this.typing = 0;
    this.nextBtn.addEventListener('click', () => this.next());
  }

  /** speaker: { name, title, portrait, color } (por defecto, Isabel). */
  open(pages, onClose = null, speaker = null) {
    const sp = speaker || { name: 'Isabel', title: 'la bruja guía', portrait: '🧙‍♀️', color: '#b47cff' };
    document.getElementById('dialog-name').textContent = `${sp.name}, ${sp.title}`;
    const portrait = document.getElementById('dialog-portrait');
    portrait.textContent = sp.portrait;
    portrait.style.background = `radial-gradient(circle, #fff6e0, ${sp.color})`;
    this.root.style.borderColor = sp.color;
    this.pages = pages;
    this.index = 0;
    this.onClose = onClose;
    this.isOpen = true;
    this.root.classList.remove('hidden');
    this.show();
  }

  show() {
    const text = this.pages[this.index];
    this.pageEl.textContent = `${this.index + 1} / ${this.pages.length}`;
    this.nextBtn.textContent = this.index < this.pages.length - 1 ? 'Siguiente ▸' : '¡Entendido!';
    clearInterval(this.typing);
    let n = 0;
    this.full = false;
    this.typing = setInterval(() => {
      n += 2;
      this.textEl.textContent = text.slice(0, n);
      if (n >= text.length) {
        clearInterval(this.typing);
        this.full = true;
      }
    }, 16);
  }

  /** Avanza (si el texto aún se está escribiendo, lo completa). */
  next() {
    if (!this.isOpen) return;
    if (!this.full) {
      clearInterval(this.typing);
      this.textEl.textContent = this.pages[this.index];
      this.full = true;
      return;
    }
    if (this.index < this.pages.length - 1) {
      this.index++;
      this.show();
    } else {
      this.close();
    }
  }

  close() {
    if (!this.isOpen) return;
    clearInterval(this.typing);
    this.isOpen = false;
    this.root.classList.add('hidden');
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }
}
