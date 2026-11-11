import * as THREE from 'three';

// Elementos de cielo compartidos por el menú y el mundo de juego.
// Todo es procedural (shaders): sin texturas que descargar.

/** Cúpula de cielo con degradado y resplandor hacia el eclipse. */
export function createSkyDome({ radius = 400, top = 0x07040f, horizon = 0x2a1426, glow = 0xff7a3a, glowDir }) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uHorizon: { value: new THREE.Color(horizon) },
      uGlow: { value: new THREE.Color(glow) },
      uGlowDir: { value: glowDir.clone().normalize() },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTop, uHorizon, uGlow, uGlowDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y * 0.5 + 0.5;
        vec3 col = mix(uHorizon, uTop, smoothstep(0.48, 0.85, h));
        col = mix(uHorizon * 0.25, col, smoothstep(0.30, 0.50, h));
        float g = max(dot(d, uGlowDir), 0.0);
        col += uGlow * (pow(g, 18.0) * 0.55 + pow(g, 4.0) * 0.10);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

/** Eclipse: disco oscuro + corona animada con destello de "anillo de diamante". */
export function createEclipse({ radius = 10, color = 0xff8a3d } = {}) {
  const group = new THREE.Group();
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshBasicMaterial({ color: 0x020104, fog: false }),
  );
  const size = radius * 5;
  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uInner: { value: radius / (size * 0.5) },
  };
  const corona = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uInner;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float a = atan(p.y, p.x);
          float d = max(r - uInner, 0.0);
          float rays = 0.55 + 0.45 * sin(a * 7.0 + uTime * 0.21) * sin(a * 13.0 - uTime * 0.13 + 1.7);
          float glow = exp(-d * 10.0) * 1.1 + exp(-d * 3.2) * 0.38 * rays;
          float rim = exp(-d * 55.0) * 1.6;
          vec2 fp = uInner * vec2(cos(0.78), sin(0.78));
          float flare = exp(-length(p - fp) * 26.0) * (1.4 + 0.3 * sin(uTime * 1.7));
          flare += exp(-abs(p.y - fp.y) * 140.0) * exp(-abs(p.x - fp.x) * 6.0) * 0.5;
          vec3 col = uColor * glow + vec3(1.0, 0.86, 0.68) * (rim + flare);
          col *= smoothstep(1.0, 0.75, r);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  corona.position.z = -0.2;
  group.add(corona, disk);
  group.userData.update = (t) => { uniforms.uTime.value = t; };
  return group;
}

/** Campo de estrellas en la semiesfera superior. */
export function createStars(count, radius = 350) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const y = Math.abs(u) * 0.95 + 0.02;
    const th = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(th) * rr * radius;
    pos[i * 3 + 1] = y * radius;
    pos[i * 3 + 2] = Math.sin(th) * rr * radius;
    c.setHSL(0.62 + Math.random() * 0.12, 0.4, 0.55 + Math.random() * 0.4);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 1.6, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.85, depthWrite: false, fog: false,
  }));
  stars.renderOrder = -9;
  return stars;
}
