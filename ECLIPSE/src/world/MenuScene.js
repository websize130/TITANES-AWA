import * as THREE from 'three';
import { createSkyDome, createEclipse, createStars } from './Sky.js';
import { disposeObject } from '../core/dispose.js';

// Fondo animado del menú: el Reino Caído flotando bajo el eclipse.
// Siluetas de bajo coste (MeshBasic + niebla), estrellas y brasas por GPU.

const DENSITY = {
  low: { stars: 700, embers: 50 },
  medium: { stars: 1400, embers: 110 },
  high: { stars: 2400, embers: 180 },
};

/** Silueta del castillo en ruinas sobre una isla flotante (forma 2D extruida). */
function createKingdom() {
  const s = new THREE.Shape();
  // Contorno superior de izquierda a derecha: murallas, torres y torreón roto
  const top = [
    [-14, 0], [-12, 0], [-12, 3], [-11.4, 3], [-11.4, 2.4], [-10.8, 2.4], [-10.8, 3],
    [-9.6, 3], [-9.6, 6.5], [-8.8, 8.2], [-8, 6.5], [-8, 3],
    [-5, 3], [-5, 4], [-4.4, 4], [-4.4, 3.4], [-3.8, 3.4], [-3.8, 4], [-3, 4],
    [-3, 10.5], [-2.2, 10.5], [-2.2, 11.2], [-1.6, 11.2], [-1.6, 10.5], [-1, 10.5],
    [-1, 13], [-0.2, 15.8], [0.6, 13], [0.6, 10.5], [1.6, 10.5], [1.6, 4],
    [3, 4], [3, 7.2], [3.5, 8.4], [4.1, 7.0], [4.6, 7.6], [4.6, 3],
    [7, 3], [7, 6], [7.5, 6], [7.5, 5.4], [8.1, 5.4], [8.1, 6], [8.6, 6], [8.6, 3],
    [10.5, 3], [10.5, 1.6], [12, 1.2], [14, 0],
  ];
  // Roca inferior irregular (isla flotante)
  const bottom = [
    [12.5, -1.5], [10, -3], [8.6, -2.6], [6.5, -5.5], [4, -6], [2.5, -9.5],
    [0.8, -12.5], [-0.8, -9], [-3, -7.5], [-5, -5], [-7.6, -4.8], [-9.5, -2.6], [-12.6, -1.6],
  ];
  s.moveTo(top[0][0], top[0][1]);
  for (let i = 1; i < top.length; i++) s.lineTo(top[i][0], top[i][1]);
  for (const [x, y] of bottom) s.lineTo(x, y);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -2);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0a0710 }));
}

function createRocks(count) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x0c0914 });
  const geo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, mat);
    const s = 0.6 + Math.random() * 2.4;
    m.scale.set(s * (1 + Math.random()), s * 0.6, s);
    m.position.set(4 + Math.random() * 50, -8 + Math.random() * 18, -30 - Math.random() * 70);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    m.userData.phase = Math.random() * Math.PI * 2;
    m.userData.baseY = m.position.y;
    group.add(m);
  }
  return group;
}

function createEmbers(count, getPixelRatio) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -20 + Math.random() * 60;
    pos[i * 3 + 1] = -12 + Math.random() * 30;
    pos[i * 3 + 2] = -55 + Math.random() * 55;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const uniforms = { uTime: { value: 0 }, uPixelRatio: { value: getPixelRatio() } };
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      uniform float uTime, uPixelRatio;
      attribute float aSeed;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float speed = 0.6 + aSeed * 1.4;
        p.y = mod(p.y + 12.0 + uTime * speed, 30.0) - 12.0;
        p.x += sin(uTime * 0.4 + aSeed * 40.0) * 1.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.5 + aSeed * 3.0) * uPixelRatio * (40.0 / -mv.z);
        vAlpha = (0.35 + 0.65 * abs(sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 20.0)))
               * smoothstep(-12.0, -6.0, p.y) * smoothstep(18.0, 10.0, p.y);
      }`,
    fragmentShader: /* glsl */`
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(vec3(1.0, 0.55, 0.22) * a, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  points.frustumCulled = false;
  points.userData.uniforms = uniforms;
  return points;
}

export function createMenuScene(profileName, getPixelRatio) {
  const density = DENSITY[profileName] ?? DENSITY.medium;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x120a1a, 0.011);

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 600);
  const base = new THREE.Vector3(0, 1.5, 16);
  const target = new THREE.Vector3(4, 5, -40);

  const eclipsePos = new THREE.Vector3(30, 26, -150);
  scene.add(createSkyDome({ glowDir: eclipsePos.clone().sub(base) }));
  scene.add(createStars(density.stars));

  const eclipse = createEclipse({ radius: 12 });
  eclipse.position.copy(eclipsePos);
  scene.add(eclipse);

  const kingdom = createKingdom();
  kingdom.position.set(20, -6, -62);
  kingdom.scale.setScalar(1.35);
  kingdom.rotation.y = -0.18;
  scene.add(kingdom);

  const rocks = createRocks(9);
  scene.add(rocks);

  const embers = createEmbers(density.embers, getPixelRatio);
  scene.add(embers);

  let t = 0;
  const look = new THREE.Vector3();

  return {
    scene,
    camera,
    /** Recoloca el eclipse para que no quede detrás del menú en pantallas estrechas. */
    setAspect(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 166 * aspect;
      eclipse.position.x = Math.min(34, halfW * 0.42);
      kingdom.position.x = Math.min(20, halfW * 0.22);
    },
    update(dt) {
      t += dt;
      eclipse.userData.update(t);
      embers.userData.uniforms.uTime.value = t;
      embers.userData.uniforms.uPixelRatio.value = getPixelRatio();
      kingdom.position.y = -6 + Math.sin(t * 0.25) * 0.6;
      for (const r of rocks.children) {
        r.position.y = r.userData.baseY + Math.sin(t * 0.3 + r.userData.phase) * 0.8;
        r.rotation.y += dt * 0.03;
      }
      // Deriva lenta de cámara (sensación cinematográfica)
      camera.position.set(base.x + Math.sin(t * 0.06) * 2.2, base.y + Math.sin(t * 0.09) * 0.6, base.z);
      look.set(target.x + Math.sin(t * 0.05) * 1.5, target.y, target.z);
      camera.lookAt(look);
      eclipse.lookAt(camera.position);
    },
    dispose() { disposeObject(scene); },
  };
}
