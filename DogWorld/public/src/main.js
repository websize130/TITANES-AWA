// Punto de entrada de DogWorld: El Despertar del Castillo.
import { Game } from './core/Game.js';

const canvas = document.getElementById('game-canvas');

try {
  const game = new Game(canvas);
  // Acceso para depuración desde la consola.
  if (new URLSearchParams(location.search).has('debug')) window.dogworld = game;
} catch (err) {
  console.error(err);
  document.getElementById('menu-status').textContent = 'Tu navegador no soporta WebGL 2 o falló al iniciar el juego.';
}

// Evitar gestos del navegador (zoom por doble toque / pellizco) durante la partida.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
