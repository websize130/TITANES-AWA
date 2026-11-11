const TIPS = [
  'Esquivar en el momento justo te hace intocable durante un instante.',
  'El Éter se regenera con el tiempo. Úsalo para tus habilidades.',
  'Puedes cambiar entre mando, teclado y pantalla táctil en cualquier momento.',
  'Ajusta la calidad gráfica en Ajustes si tu dispositivo se calienta.',
  'Tu progreso se guarda al volver al menú principal.',
];

/** Pantalla de carga cinematográfica con progreso real por etapas. */
export class LoadingScreen {
  constructor(el) {
    this.el = el;
    this.bar = el.querySelector('.loading-bar i');
    this.stage = el.querySelector('.loading-stage');
    this.tip = el.querySelector('.loading-tip');
  }

  show() {
    this.tip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    this.set(0, 'Preparando');
    this.el.classList.add('is-active');
  }

  set(progress, label) {
    this.bar.style.transform = `scaleX(${progress})`;
    if (label) this.stage.textContent = label;
  }

  hide() { this.el.classList.remove('is-active'); }
}
