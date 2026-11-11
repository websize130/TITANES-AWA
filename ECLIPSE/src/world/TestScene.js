import * as THREE from 'three';
import { createSkyDome, createEclipse, createStars } from './Sky.js';
import { disposeObject } from '../core/dispose.js';

/**
 * Escena 3D básica de verificación del entorno (NO es contenido del juego):
 * suelo PBR, objetos metálicos/rugosos, luz ambiental hemisférica y luz
 * direccional con sombras.
 */
export function createTestScene(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1c1224, 30, 90);

  // Cielo del eclipse, alineado con la luz direccional
  const eclipseDir = new THREE.Vector3(8, 14, 6).normalize();
  scene.add(createSkyDome({ radius: 180, horizon: 0x2b1626, glowDir: eclipseDir }));
  scene.add(createStars(renderer.profileName === 'low' ? 500 : 1000, 170));
  const eclipse = createEclipse({ radius: 9 });
  eclipse.position.copy(eclipseDir).multiplyScalar(150);
  scene.add(eclipse);

  // Iluminación ambiental (cielo violáceo / suelo cálido) + direccional
  const hemi = new THREE.HemisphereLight(0x8f86c8, 0x3a2a1a, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe2b8, 2.2);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // Suelo
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(30, 48),
    new THREE.MeshStandardMaterial({ color: 0x3b3546, roughness: 0.9, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Fila de esferas: variación de metalness/roughness para validar el PBR
  const sphereGeo = new THREE.SphereGeometry(0.6, 32, 16);
  const spheres = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      metalness: i / 4,
      roughness: 1 - i / 4 * 0.85,
    });
    const m = new THREE.Mesh(sphereGeo, mat);
    m.position.set((i - 2) * 1.6, 0.6, 2);
    m.castShadow = true;
    m.receiveShadow = true;
    spheres.add(m);
  }
  scene.add(spheres);

  // Objeto central con emisivo
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.9, 0.28, 128, 16),
    new THREE.MeshStandardMaterial({
      color: 0x18121f, metalness: 0.8, roughness: 0.25,
      emissive: 0xff5a1f, emissiveIntensity: 0.35,
    }),
  );
  knot.position.set(0, 2, -1);
  knot.castShadow = true;
  scene.add(knot);

  const applyShadowProfile = (profile) => {
    sun.castShadow = profile.shadows;
    sun.shadow.map?.dispose();
    sun.shadow.map = null; // fuerza regenerar el shadow map con el nuevo tamaño
    sun.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
  };
  applyShadowProfile(renderer.profile);
  renderer.createEnvironment(scene);

  let t = 0;
  const update = (dt, camera) => {
    t += dt;
    knot.rotation.y += dt * 0.5;
    knot.rotation.x += dt * 0.2;
    eclipse.userData.update(t);
    if (camera) eclipse.lookAt(camera.position);
  };

  const dispose = () => disposeObject(scene);

  return { scene, sun, hemi, update, applyShadowProfile, dispose };
}
