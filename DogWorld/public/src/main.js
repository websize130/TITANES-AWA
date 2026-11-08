// Punto de entrada de DogWorld: El Despertar del Castillo.
import { Game } from './core/Game.js';
import { RemotePad } from './ui/RemotePad.js';
import { ModelLibrary } from './core/ModelLibrary.js';

const canvas = document.getElementById('game-canvas');
const params = new URLSearchParams(location.search);

if (params.has('mando')) {
  // Este dispositivo es solo un mando para el Modo TV: no se arranca el mundo 3D.
  const pad = new RemotePad(params.get('mando'));
  if (params.has('debug')) window.dogpad = pad;
} else {
  // Modelos GLB profesionales (si existen) antes de construir el mundo.
  await ModelLibrary.load();
  try {
    const game = new Game(canvas);
    // Acceso para depuración desde la consola.
    if (params.has('debug')) window.dogworld = game;
    if (params.has('tv')) game.tv.enable();
  } catch (err) {
    console.error(err);
    document.getElementById('menu-status').textContent = 'Tu navegador no soporta WebGL 2 o falló al iniciar el juego.';
  }
}

// Evitar gestos del navegador (zoom por doble toque / pellizco) durante la partida.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
