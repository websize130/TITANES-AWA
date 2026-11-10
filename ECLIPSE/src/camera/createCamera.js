import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Cámara de perspectiva + OrbitControls para inspeccionar la escena de prueba
 * (táctil: 1 dedo rota, 2 dedos zoom/desplazamiento). La cámara de tercera
 * persona del juego sustituirá a los OrbitControls más adelante.
 */
export function createCamera(domElement) {
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(6, 5, 9);

  const controls = new OrbitControls(camera, domElement);
  controls.target.set(0, 1.2, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 3;
  controls.maxDistance = 30;
  controls.update();

  return { camera, controls };
}
