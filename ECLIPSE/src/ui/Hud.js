/** Overlay ligero de diagnóstico (FPS, perfil, memoria GPU). */
export class Hud {
  constructor(el) { this.el = el; this.visible = true; }

  update(lines) {
    if (!this.visible) return;
    this.el.textContent = lines.join('\n');
  }

  setVisible(v) { this.visible = v; this.el.hidden = !v; }
}
