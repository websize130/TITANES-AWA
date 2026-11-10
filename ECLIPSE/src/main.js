import * as THREE from 'three';
import { detectCapabilities } from './core/Capabilities.js';
import { resolveInitialProfile, PROFILES } from './core/GraphicsProfiles.js';
import { Renderer } from './core/Renderer.js';
import { Loop } from './core/Loop.js';
import { AssetLoader } from './core/AssetLoader.js';
import { createTestScene } from './world/TestScene.js';
import { createCamera } from './camera/createCamera.js';
import { Hud } from './ui/Hud.js';

const fatal = (msg) => {
  const el = document.getElementById('fatal');
  el.textContent = msg;
  el.hidden = false;
};

const caps = detectCapabilities();
if (!caps.webgl2) {
  fatal('Este navegador no soporta WebGL 2. Usa Chrome o Firefox actualizados para Android y activa la aceleración por hardware.');
  throw new Error('WebGL 2 no disponible');
}

const profileName = resolveInitialProfile(caps);
const renderer = new Renderer(document.getElementById('app'), profileName, caps);
const assets = new AssetLoader(renderer); // listo para cargar GLB en las siguientes fases
const world = createTestScene(renderer);
const { camera, controls } = createCamera(renderer.domElement);
const hud = new Hud(document.getElementById('hud'));
const loop = new Loop(renderer.renderer);
loop.maxFps = renderer.profile.maxFps;

function onResize() {
  const { width, height } = renderer.resize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

function setProfile(name) {
  if (renderer.applyProfile(name)) { location.reload(); return; } // cambio de antialias
  loop.maxFps = renderer.profile.maxFps;
  world.applyShadowProfile(renderer.profile);
  renderer.createEnvironment(world.scene);
  onResize();
}

renderer.onContextLost = () => { loop.stop(); fatal('Se perdió el contexto gráfico. Recuperando…'); };
renderer.onContextRestored = () => { document.getElementById('fatal').hidden = true; loop.start(); };

loop.add((dt) => {
  controls.update();
  world.update(dt);
  renderer.render(world.scene, camera);
});

loop.onFpsSample = (fps) => {
  renderer.adaptResolution(fps);
  const s = renderer.stats();
  hud.update([
    `ECLIPSE · entorno de prueba`,
    `FPS ${fps.toFixed(0)} / ${renderer.profile.maxFps}  ·  perfil ${PROFILES[renderer.profileName].label}`,
    `pixelRatio ${renderer.pixelRatio.toFixed(2)}  ·  draw ${s.drawCalls}  ·  tris ${s.triangles}`,
    `geo ${s.geometries}  ·  tex ${s.textures}  ·  WebGL2 ✔  ·  three r${THREE.REVISION}`,
  ]);
};

if (new URLSearchParams(location.search).has('debug')) {
  import('./ui/DebugPanel.js').then(({ createDebugPanel }) =>
    createDebugPanel({ renderer, world, hud, onProfileChange: setProfile }));
}

loop.start();

// Exposición para pruebas automáticas y consola de depuración
window.__ECLIPSE__ = { THREE, caps, renderer, world, camera, assets, setProfile };
