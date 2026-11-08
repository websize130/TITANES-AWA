// Sistema de partículas con pool fijo en un único THREE.Points (una draw call).
// Atlas de 4 iconos: brillo, corazón, nota musical y copo de nieve.
import * as THREE from 'three';

const CELLS = { glow: 0, heart: 1, note: 2, flake: 3 };

let atlas = null;
function getAtlas() {
  if (atlas) return atlas;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  // 0: brillo radial
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // 1: corazón
  g.save();
  g.translate(192, 70);
  g.beginPath();
  g.moveTo(0, 38);
  g.bezierCurveTo(-60, -5, -30, -50, 0, -18);
  g.bezierCurveTo(30, -50, 60, -5, 0, 38);
  g.fill();
  g.restore();
  // 2: nota musical
  g.font = 'bold 100px serif';
  g.fillText('♪', 320, 64);
  // 3: copo de nieve
  g.strokeStyle = '#ffffff';
  g.lineWidth = 9;
  g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.beginPath();
    g.moveTo(448, 64);
    g.lineTo(448 + Math.cos(a) * 50, 64 + Math.sin(a) * 50);
    g.stroke();
  }
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace;
  return atlas;
}

// Presets de emisión por tipo de efecto.
const PRESETS = {
  bark: { cell: 'glow', color: '#fff3b0', count: 6, speed: 2.5, spread: 0.9, life: 0.45, size: 0.5, gravity: 0, grow: 1.8 },
  note: { cell: 'note', color: '#ffd84a', count: 1, speed: 1.2, spread: 0.6, life: 1.4, size: 0.45, gravity: -0.6, grow: 0.2, rand: true },
  heart: { cell: 'heart', color: '#ff7fb5', count: 1, speed: 1.0, spread: 0.5, life: 1.5, size: 0.42, gravity: -0.8, grow: 0.3 },
  ice: { cell: 'flake', color: '#bff0ff', count: 3, speed: 6, spread: 0.25, life: 0.7, size: 0.3, gravity: 0.5, grow: 1.4 },
  frost: { cell: 'glow', color: '#9fe6ff', count: 14, speed: 2.5, spread: 1, life: 0.9, size: 0.6, gravity: 0, grow: 0.5 },
  dirt: { cell: 'glow', color: '#8a5a2e', count: 3, speed: 3.5, spread: 0.6, life: 0.6, size: 0.28, gravity: 9, grow: 0, back: true },
  dust: { cell: 'glow', color: '#d9c2a0', count: 4, speed: 1.6, spread: 1, life: 0.6, size: 0.5, gravity: -0.3, grow: 1.2 },
  wind: { cell: 'glow', color: '#ffffff', count: 2, speed: 7, spread: 0.15, life: 0.3, size: 0.25, gravity: 0, grow: 0, back: true },
  scent: { cell: 'glow', color: '#9dff7a', count: 2, speed: 0.7, spread: 1, life: 1.2, size: 0.32, gravity: -0.5, grow: 0.6 },
  sparkle: { cell: 'flake', color: '#ffe27a', count: 10, speed: 2.4, spread: 1, life: 0.8, size: 0.3, gravity: 1.5, grow: 0 },
  confetti: { cell: 'glow', color: '#ff8fc8', count: 18, speed: 4, spread: 1, life: 1.1, size: 0.3, gravity: 5, grow: 0, rainbow: true },
  rubble: { cell: 'glow', color: '#9a8296', count: 16, speed: 5, spread: 1, life: 0.9, size: 0.45, gravity: 12, grow: 0 },
  gold: { cell: 'flake', color: '#ffcf4a', count: 14, speed: 4, spread: 1, life: 1, size: 0.35, gravity: 4, grow: 0 },
};

const RAINBOW = ['#ff8fc8', '#ffd84a', '#7be07b', '#6fd3ff', '#b47cff'].map((c) => new THREE.Color(c));

export class Effects {
  constructor(scene, max = 600) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.data = new Float32Array(max * 4); // size, alpha, cell, grow
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.dataAttr = new THREE.BufferAttribute(this.data, 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    geo.setAttribute('aData', this.dataAttr);
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -9999;

    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: getAtlas() }, scale: { value: 400 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        attribute vec4 aData;
        attribute vec3 color;
        uniform float scale;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vCell;
        void main() {
          vColor = color;
          vAlpha = aData.y;
          vCell = aData.z;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aData.x * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D map;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vCell;
        void main() {
          vec2 uv = vec2((gl_PointCoord.x + vCell) * 0.25, 1.0 - gl_PointCoord.y);
          vec4 tex = texture2D(map, uv);
          if (tex.a * vAlpha < 0.02) discard;
          gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this._c = new THREE.Color();
  }

  setViewportHeight(h) {
    this.material.uniforms.scale.value = h * 0.9;
  }

  /**
   * Emite partículas de un preset. dir (opcional) = dirección principal (normalizada).
   */
  emit(type, x, y, z, dir = null, countMul = 1) {
    const p = PRESETS[type];
    if (!p) return;
    const n = Math.max(1, Math.round(p.count * countMul));
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      let dx; let dy; let dz;
      if (dir) {
        const s = p.back ? -1 : 1;
        dx = dir.x * s + (Math.random() - 0.5) * p.spread;
        dy = dir.y * s + (Math.random() - 0.2) * p.spread;
        dz = dir.z * s + (Math.random() - 0.5) * p.spread;
      } else {
        dx = (Math.random() - 0.5) * p.spread * 2;
        dy = 0.6 + Math.random() * p.spread;
        dz = (Math.random() - 0.5) * p.spread * 2;
      }
      const len = Math.hypot(dx, dy, dz) || 1;
      const sp = p.speed * (0.7 + Math.random() * 0.6);
      this.vel[i * 3] = (dx / len) * sp;
      this.vel[i * 3 + 1] = (dy / len) * sp;
      this.vel[i * 3 + 2] = (dz / len) * sp;
      this.pos[i * 3] = x + (Math.random() - 0.5) * 0.1;
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * 0.1;
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.1;
      const c = p.rainbow ? RAINBOW[k % RAINBOW.length] : this._c.set(p.color);
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.data[i * 4] = p.size * (p.rand ? 0.8 + Math.random() * 0.5 : 1);
      this.data[i * 4 + 1] = 1;
      this.data[i * 4 + 2] = CELLS[p.cell];
      this.data[i * 4 + 3] = p.grow;
      this.life[i] = p.life;
      this.maxLife[i] = p.life;
      this.grav[i] = p.gravity;
    }
  }

  /** Rastro de olfato: partícula que viaja de A hacia B. */
  emitTrail(ax, ay, az, bx, by, bz, color = '#9dff7a') {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const life = 1.4;
    this.pos[i * 3] = ax; this.pos[i * 3 + 1] = ay; this.pos[i * 3 + 2] = az;
    this.vel[i * 3] = (bx - ax) / life * 0.5;
    this.vel[i * 3 + 1] = (by - ay) / life * 0.5;
    this.vel[i * 3 + 2] = (bz - az) / life * 0.5;
    const c = this._c.set(color);
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    this.data[i * 4] = 0.45; this.data[i * 4 + 1] = 1; this.data[i * 4 + 2] = 0; this.data[i * 4 + 3] = 0;
    this.life[i] = life; this.maxLife[i] = life; this.grav[i] = 0;
  }

  update(dt) {
    const { pos, vel, data, life, maxLife, grav } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) {
        pos[i * 3 + 1] = -9999;
        data[i * 4 + 1] = 0;
        continue;
      }
      vel[i * 3 + 1] -= grav[i] * dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const k = life[i] / maxLife[i];
      data[i * 4 + 1] = k < 0.3 ? k / 0.3 : 1;
      data[i * 4] += data[i * 4 + 3] * dt * data[i * 4];
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.dataAttr.needsUpdate = true;
  }
}
