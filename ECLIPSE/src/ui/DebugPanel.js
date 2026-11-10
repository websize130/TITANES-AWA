import { PROFILES } from '../core/GraphicsProfiles.js';

/**
 * Panel lil-gui de depuración. Se carga bajo demanda (import dinámico)
 * solo con ?debug en la URL, para no pesar en la versión normal.
 */
export async function createDebugPanel({ renderer, world, hud, onProfileChange }) {
  const { default: GUI } = await import('lil-gui');
  const gui = new GUI({ title: 'ECLIPSE · Debug' });
  if (renderer.caps.isMobile) gui.close();

  const state = {
    profile: renderer.profileName,
    exposure: renderer.renderer.toneMappingExposure,
    sun: world.sun.intensity,
    ambient: world.hemi.intensity,
    hud: true,
  };

  const options = Object.fromEntries(Object.entries(PROFILES).map(([k, p]) => [p.label, k]));
  gui.add(state, 'profile', options).name('Perfil gráfico').onChange(onProfileChange);
  gui.add(state, 'exposure', 0.2, 2, 0.01).name('Exposición')
    .onChange((v) => { renderer.renderer.toneMappingExposure = v; });
  gui.add(state, 'sun', 0, 5, 0.05).name('Luz direccional')
    .onChange((v) => { world.sun.intensity = v; });
  gui.add(state, 'ambient', 0, 3, 0.05).name('Luz ambiental')
    .onChange((v) => { world.hemi.intensity = v; });
  gui.add(state, 'hud').name('Mostrar HUD').onChange((v) => hud.setVisible(v));
  return gui;
}
