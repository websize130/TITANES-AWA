/** Overlay de rendimiento (FPS, perfil, memoria GPU). Ajustes → Mostrar rendimiento. */
export class StatsOverlay {
  constructor(el) {
    this.el = el;
    this.visible = false;
    el.hidden = true;
  }

  update(lines) {
    if (!this.visible) return;
    this.el.textContent = lines.join('\n');
  }

  setVisible(v) {
    this.visible = v;
    this.el.hidden = !v;
  }
}
