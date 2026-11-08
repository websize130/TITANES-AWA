// Cielo degradado, nubes esponjosas e islas flotantes lejanas con torres.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterials, scaleUVs, shadow } from './Materials.js';
import { buildIslandUnderside } from './Terrain.js';
import { mulberry32, glowTexture } from './Textures.js';

export const SKY_TOP = new THREE.Color('#1a62e6');
export const SKY_HORIZON = new THREE.Color('#a9dcff');

/** Cúpula de cielo con degradado y sol (reutilizable en los mundos temáticos). */
export function makeSkyDome(top, horizon, sunDir = new THREE.Vector3(0.35, 0.55, -0.75)) {
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      horizon: { value: new THREE.Color(horizon) },
      sunDir: { value: sunDir.clone().normalize() },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -1.0, 1.0);
        vec3 col = mix(horizon, top, pow(smoothstep(-0.05, 0.85, h), 0.7));
        col = mix(col, horizon * 0.95, smoothstep(0.0, -0.3, h));
        float sun = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0, 0.93, 0.75) * (pow(sun, 400.0) * 2.0 + pow(sun, 12.0) * 0.25);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  return dome;
}

export function buildSky(quality) {
  const group = new THREE.Group();
  group.name = 'Sky';
  const rnd = mulberry32(77);
  const dome = makeSkyDome(SKY_TOP, SKY_HORIZON);
  group.add(dome);

  // Nubes: grupos de esferas fusionadas (una malla por nube).
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#ffffff', emissive: '#c9dcff', emissiveIntensity: 0.35, roughness: 1, flatShading: false,
  });
  const clouds = [];
  for (let i = 0; i < quality.cloudCount; i++) {
    const parts = [];
    const n = 5 + Math.floor(rnd() * 5);
    for (let k = 0; k < n; k++) {
      const r = 4 + rnd() * 6;
      const g = new THREE.SphereGeometry(r, 12, 8);
      g.translate((k - n / 2) * 4.5 + (rnd() - 0.5) * 3, (rnd() - 0.2) * 3 + (k % 2) * 2, (rnd() - 0.5) * 5);
      parts.push(g);
    }
    const geo = mergeGeometries(parts);
    geo.scale(1, 0.62, 1);
    const cloud = new THREE.Mesh(geo, cloudMat);
    const a = rnd() * Math.PI * 2;
    const dist = 170 + rnd() * 220;
    cloud.position.set(Math.cos(a) * dist, 45 + rnd() * 70, Math.sin(a) * dist - 60);
    cloud.scale.setScalar(0.8 + rnd() * 1.2);
    cloud.userData.speed = 0.6 + rnd() * 1.2;
    group.add(cloud);
    clouds.push(cloud);
  }

  // Islas flotantes lejanas con torres (decorado de fondo).
  const M = getMaterials();
  const isles = [
    [-95, 55, -150, 14], [110, 70, -170, 16], [-150, 35, -40, 12], [140, 40, -60, 11],
    [60, 90, -230, 13], [-70, 85, -240, 10], [170, 25, 40, 9], [-175, 50, 70, 10],
  ];
  const islands = [];
  for (const [x, y, z, r] of isles) {
    const isle = new THREE.Group();
    isle.position.set(x, y, z);
    const radiusFn = (a) => r * (1 + 0.12 * Math.sin(a * 3 + x));
    const under = buildIslandUnderside(0, 0, radiusFn, 0, r * 2.2, Math.floor(x * 7 + z), 24, 8);
    under.receiveShadow = false;
    isle.add(under);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 0.98, 1.2, 24), new THREE.MeshStandardMaterial({ color: '#79c043', roughness: 0.9 }));
    top.position.y = 0.4;
    isle.add(top);
    // Mini castillo.
    const towers = 1 + Math.floor(rnd() * 3);
    for (let t = 0; t < towers; t++) {
      const tr = 1.2 + rnd() * 1.4;
      const th = 6 + rnd() * 10;
      const tx = (rnd() - 0.5) * r;
      const tz = (rnd() - 0.5) * r;
      const body = new THREE.Mesh(scaleUVs(new THREE.CylinderGeometry(tr, tr * 1.08, th, 14), 2, th / 4), M.stone);
      body.position.set(tx, th / 2 + 0.8, tz);
      isle.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(tr * 1.35, th * 0.55, 14), M.roof);
      roof.position.set(tx, th + 0.8 + th * 0.275, tz);
      isle.add(roof);
    }
    // Árboles redondos.
    for (let k = 0; k < 3; k++) {
      const tree = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + rnd(), 1), new THREE.MeshStandardMaterial({ color: '#4f9a33', roughness: 0.9, flatShading: true }));
      tree.position.set((rnd() - 0.5) * r * 1.4, 2.4, (rnd() - 0.5) * r * 1.4);
      isle.add(tree);
    }
    isle.userData.baseY = y;
    isle.userData.phase = rnd() * 10;
    group.add(isle);
    islands.push(isle);
  }

  // Polvo mágico / luciérnagas alrededor del Hub.
  let sparkles = null;
  if (quality.particles) {
    const count = 160;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 45;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.5 + rnd() * 6;
      pos[i * 3 + 2] = Math.sin(a) * r - 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sparkles = new THREE.Points(geo, new THREE.PointsMaterial({
      map: glowTexture(), color: '#ffe9a8', size: 0.35, transparent: true, opacity: 0.8,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    group.add(sparkles);
  }

  return {
    group,
    dome,
    update(t, dt, cameraPos) {
      dome.position.copy(cameraPos);
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 420) c.position.x = -420;
      }
      for (let i = 0; i < islands.length; i++) {
        const isle = islands[i];
        isle.position.y = isle.userData.baseY + Math.sin(t * 0.3 + isle.userData.phase) * 1.5;
      }
      if (sparkles) {
        sparkles.rotation.y = t * 0.02;
        sparkles.position.y = Math.sin(t * 0.5) * 0.3;
      }
    },
  };
}
