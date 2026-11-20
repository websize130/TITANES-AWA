import { hydrateIcons } from './ui/icons.js';
import { MandoApp } from './net/mandoApp.js';
import { Game } from './game/game.js';

/* Arranque: ?mando=CÓDIGO abre la página de mando para el móvil; si no, el juego */
try {
  const code = new URLSearchParams(location.search).get('mando');
  if (code) { hydrateIcons(); MandoApp.start(code.slice(0, 8)); }
  else {
    const game = new Game();
    window.BLOOD_DEAD = window.CENIZA = game; // acceso para depurar y para módulos futuros (game.events.on(...))
    game.boot();
  }
} catch (err) {
  console.error(err);
  const t = document.getElementById('bootText');
  if (t) t.textContent = 'Tu navegador no soporta WebGL 2. Prueba con Chrome, Edge o Safari actualizados.';
}
