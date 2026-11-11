import '@fontsource-variable/cinzel';
import '@fontsource-variable/manrope';
import './ui/styles/base.css';
import './ui/styles/menus.css';
import './ui/styles/hud.css';

import { detectCapabilities } from './core/Capabilities.js';
import { resolveProfile } from './core/GraphicsProfiles.js';
import { Renderer } from './core/Renderer.js';
import { Loop } from './core/Loop.js';
import { AssetLoader } from './core/AssetLoader.js';
import { EventBus } from './core/EventBus.js';
import { Settings } from './core/Settings.js';
import { SaveSystem } from './core/SaveSystem.js';
import { App } from './core/App.js';
import { InputManager } from './controls/InputManager.js';
import { TouchControls } from './controls/TouchControls.js';
import { AudioManager } from './audio/AudioManager.js';
import { UIRouter } from './ui/UIRouter.js';
import { PromptRenderer } from './ui/ButtonPrompts.js';
import { Toast } from './ui/Toast.js';
import { StatsOverlay } from './ui/StatsOverlay.js';
import { LoadingScreen } from './ui/screens/LoadingScreen.js';
import { GameHUD } from './ui/screens/GameHUD.js';
import { registerMenus } from './ui/screens/menus.js';
import { registerSettings } from './ui/screens/SettingsScreen.js';
import { registerServiceWorker } from './pwa/registerSW.js';

const $ = (sel) => document.querySelector(sel);
const fatal = $('#fatal');

function fail(message) {
  $('#boot').classList.add('is-out');
  fatal.textContent = message;
  fatal.hidden = false;
}

const caps = detectCapabilities();
if (!caps.webgl2) {
  fail('Este navegador no soporta WebGL 2. Usa Chrome, Edge, Firefox o Samsung Internet actualizados y activa la aceleración por hardware.');
  throw new Error('WebGL 2 no disponible');
}

const debug = new URLSearchParams(location.search).has('debug');
const bus = new EventBus();
const settings = new Settings(bus);
const renderer = new Renderer($('#app'), resolveProfile(caps, settings.get('graphics')), caps);
const loop = new Loop(renderer.renderer);
loop.maxFps = renderer.profile.maxFps;

const input = new InputManager(bus, settings);
const audio = new AudioManager(settings, bus);
const router = new UIRouter({ bus, input, audio });
const prompts = new PromptRenderer(bus, input, settings);
const stats = new StatsOverlay($('#stats'));
stats.setVisible(settings.get('showStats') || debug);

const app = new App({
  caps, bus, settings, renderer, loop, input, audio, router, prompts, debug,
  save: new SaveSystem(),
  assets: new AssetLoader(renderer), // para cargar GLB/HDRI en las próximas fases
  toast: new Toast($('#toasts')),
  hud: new GameHUD($('#hud'), bus),
  loading: new LoadingScreen($('#loading')),
  touch: new TouchControls($('.touch-controls'), input),
  stats,
  veil: $('#veil'),
  fatal,
  rotateEl: $('#rotate'),
  hudPause: $('.hud-pause'),
});

registerMenus(router, app);
registerSettings(router, settings);
prompts.refresh();

// El primer gesto (toque, clic o tecla) habilita el audio
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

app.start();
requestAnimationFrame(() => $('#boot').classList.add('is-out'));

registerServiceWorker((apply) => app.onUpdateReady(apply));

if (debug) {
  import('./ui/DebugPanel.js').then(({ createDebugPanel }) => createDebugPanel(app));
}

// Acceso para pruebas automáticas y consola
window.__ECLIPSE__ = { app, caps, renderer, settings, input };
