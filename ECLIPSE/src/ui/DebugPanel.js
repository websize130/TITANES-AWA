import { PROFILES } from '../core/GraphicsProfiles.js';
import { createDebugOrbit } from '../camera/DebugOrbit.js';

/**
 * Panel lil-gui de depuración. Se carga bajo demanda (import dinámico)
 * solo con ?debug en la URL, para no pesar en la versión normal.
 */
export async function createDebugPanel(app) {
  const { default: GUI } = await import('lil-gui');
  const { renderer, settings } = app;
  const gui = new GUI({ title: 'ECLIPSE · Debug' });
  gui.domElement.style.zIndex = '80';
  if (renderer.caps.isMobile) gui.close();

  const options = { Automática: 'auto', ...Object.fromEntries(Object.entries(PROFILES).map(([k, p]) => [p.label, k])) };
  const state = {
    graphics: settings.get('graphics'),
    exposure: renderer.renderer.toneMappingExposure,
    sun: 2.2,
    ambient: 0.6,
    freeCamera: false,
  };

  gui.add(state, 'graphics', options).name('Perfil gráfico').onChange((v) => settings.set('graphics', v));
  gui.add(state, 'exposure', 0.2, 2, 0.01).name('Exposición')
    .onChange((v) => { renderer.renderer.toneMappingExposure = v; });
  gui.add(state, 'sun', 0, 5, 0.05).name('Luz direccional')
    .onChange((v) => { if (app.session) app.session.world.sun.intensity = v; });
  gui.add(state, 'ambient', 0, 3, 0.05).name('Luz ambiental')
    .onChange((v) => { if (app.session) app.session.world.hemi.intensity = v; });
  // Cámara libre (OrbitControls) para inspeccionar la escena durante la partida
  gui.add(state, 'freeCamera').name('Cámara libre (Orbit)').onChange((on) => {
    const s = app.session;
    if (!s) { state.freeCamera = false; gui.controllersRecursive().forEach((c) => c.updateDisplay()); return; }
    if (on) s.debugOrbit = createDebugOrbit(s.camera, renderer.domElement, s.player.position);
    else { s.debugOrbit?.dispose(); s.debugOrbit = null; }
  });
  return gui;
}
