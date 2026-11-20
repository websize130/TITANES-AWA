import { hydrateIcons } from './ui/icons.js';
import { MandoApp } from './net/mandoApp.js';
import { GuestApp } from './net/guestApp.js';
import { Game } from './game/game.js';
import { Settings } from './core/settings.js';

/* Arranque:
   · ?mando=CÓDIGO  → el móvil funciona como mando de la TV
   · ?unirse=CÓDIGO → entra en la partida online de un amigo (invitación por WhatsApp o cualquier canal)
   · ?tv=1          → pantalla de TV (proyectada o en un navegador de Smart TV): Modo TV y sala de mandos abierta
   · sin parámetros → el juego */
try {
  const q = new URLSearchParams(location.search), mando = q.get('mando'), join = q.get('unirse');
  if (mando) { hydrateIcons(); MandoApp.start(mando.slice(0, 8)); }
  else if (join) { hydrateIcons(); GuestApp.start(join.slice(0, 8).toUpperCase()); }
  else {
    const game = new Game();
    window.BLOOD_DEAD = window.CENIZA = game; // acceso para depurar y para módulos futuros (game.events.on(...))
    const tv = q.has('tv');
    if (tv) { Settings.load(); Settings.data.tv = true; Settings.data.tvSet = true; game.applyTv(); }
    game.boot().then(() => { if (tv) { game.ui.tvTabName = 'local'; game.ui.openModal('pads'); } });
  }
} catch (err) {
  console.error(err);
  const t = document.getElementById('bootText');
  if (t) t.textContent = 'Tu navegador no soporta WebGL 2. Prueba con Chrome, Edge o Safari actualizados.';
}
