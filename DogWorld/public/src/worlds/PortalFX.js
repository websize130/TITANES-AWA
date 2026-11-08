// Efectos de portal: material con remolino animado sobre una "ventana" pintada
// del mundo de destino (como en la ilustración), y carteles con el nombre.
import * as THREE from 'three';
import { windUniforms } from '../world/Wind.js';
import { drawPaw } from '../world/Textures.js';

const previewCache = new Map();

/** Vista pintada del mundo que se ve a través del portal. */
export function portalPreviewTexture(worldId) {
  if (previewCache.has(worldId)) return previewCache.get(worldId);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const g = c.getContext('2d');
  const sky = (a, b) => {
    const gr = g.createLinearGradient(0, 0, 0, 384);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 384);
  };
  const tri = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x - w / 2, y);
    g.lineTo(x, y - h);
    g.lineTo(x + w / 2, y);
    g.fill();
  };
  const circle = (x, y, r, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  switch (worldId) {
    case 'park':
      sky('#7cc8ff', '#d8f2ff');
      g.fillStyle = '#9fb6d6';
      for (let i = 0; i < 7; i++) g.fillRect(14 + i * 34, 120 - (i % 3) * 30, 26, 120);
      g.fillStyle = '#6fbf3e';
      g.fillRect(0, 220, 256, 164);
      g.fillStyle = '#e8cf9a';
      g.beginPath();
      g.moveTo(90, 384); g.quadraticCurveTo(150, 300, 120, 230); g.lineTo(140, 230); g.quadraticCurveTo(185, 300, 170, 384);
      g.fill();
      circle(200, 300, 30, '#4fa8e8');
      for (const [x, y] of [[40, 210], [210, 205], [60, 260]]) {
        g.fillStyle = '#7a5233'; g.fillRect(x - 4, y, 8, 30);
        circle(x, y, 26, '#3f9a3a');
      }
      break;
    case 'forest':
      sky('#1f4a2a', '#9be37a');
      for (let i = 0; i < 9; i++) {
        g.fillStyle = i % 2 ? '#3a2a1a' : '#4a3520';
        g.fillRect(i * 30 - 6, 0, 18, 384);
      }
      g.fillStyle = 'rgba(190,255,140,0.35)';
      g.beginPath(); g.moveTo(100, 384); g.lineTo(128, 200); g.lineTo(156, 384); g.fill();
      for (let i = 0; i < 18; i++) circle((i * 53) % 256, 40 + ((i * 37) % 160), 30, 'rgba(60,140,60,0.8)');
      break;
    case 'ice':
      sky('#9bd8ff', '#f2fbff');
      tri(128, 250, 240, 200, '#dfeefa');
      tri(128, 250, 90, 80, '#ffffff');
      tri(60, 260, 140, 110, '#c6e2f5');
      g.fillStyle = '#f5fbff';
      g.fillRect(0, 250, 256, 134);
      for (let i = 0; i < 6; i++) tri(20 + i * 45, 300, 26, 50, '#2f6a5a');
      break;
    case 'factory':
      sky('#4a4f5a', '#8a8f9a');
      g.fillStyle = '#5b606b';
      g.fillRect(0, 240, 256, 144);
      g.fillStyle = '#2b2e35';
      g.fillRect(20, 250, 216, 30);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = ['#ff6b6b', '#ffd84a', '#6fd3ff', '#7be07b', '#ff8fc8', '#ffa94d'][i];
        g.fillRect(28 + i * 36, 222, 26, 26);
      }
      g.fillStyle = '#9aa0aa';
      g.fillRect(40, 60, 18, 160); g.fillRect(190, 40, 22, 180);
      circle(128, 130, 44, '#ffa94d'); circle(128, 130, 20, '#5b606b');
      break;
    case 'desert':
      sky('#7cc8ff', '#ffe7b0');
      tri(140, 250, 200, 150, '#e8b968');
      tri(140, 250, 100, 150, '#d39b48');
      g.fillStyle = '#f2d28a';
      g.fillRect(0, 250, 256, 134);
      g.fillStyle = '#3fc1c9';
      g.beginPath(); g.ellipse(128, 320, 90, 26, 0, 0, Math.PI * 2); g.fill();
      for (const x of [40, 220]) {
        g.fillStyle = '#8a5a2e'; g.fillRect(x - 3, 230, 6, 70);
        circle(x, 228, 22, '#3f9a3a');
      }
      break;
    default: { // fortress
      sky('#1a0730', '#6b2fb8');
      g.fillStyle = '#2a1640';
      g.fillRect(50, 170, 156, 214);
      for (const x of [50, 92, 134, 176]) g.fillRect(x, 140, 30, 40);
      tri(70, 172, 46, 70, '#3a1d58'); tri(186, 172, 46, 70, '#3a1d58');
      // Silueta de gato gigante sobre el castillo.
      circle(128, 120, 46, '#3d2a5c');
      tri(96, 92, 34, 46, '#3d2a5c'); tri(160, 92, 34, 46, '#3d2a5c');
      circle(110, 118, 8, '#ffd84a'); circle(146, 118, 8, '#ffd84a');
      g.fillStyle = '#c78bff';
      g.fillRect(118, 300, 20, 40);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  previewCache.set(worldId, tex);
  return tex;
}

/** Material del portal: vista del mundo + remolino de energía + borde brillante. */
export function makePortalMaterial(worldId, colorA, colorB) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: windUniforms.uTime,
      map: { value: portalPreviewTexture(worldId) },
      colA: { value: new THREE.Color(colorA) },
      colB: { value: new THREE.Color(colorB) },
      locked: { value: 0 },
      charge: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform sampler2D map; uniform vec3 colA; uniform vec3 colB;
      uniform float locked; uniform float charge;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5;
        p.x *= 0.7;
        float r = length(p);
        float a = atan(p.y, p.x);
        float swirl = sin(a * 3.0 + r * 18.0 - uTime * (2.0 + charge * 4.0)) * 0.5 + 0.5;
        vec2 wob = vUv + vec2(sin(vUv.y * 10.0 + uTime * 1.5), cos(vUv.x * 9.0 + uTime)) * 0.012;
        vec3 view = texture2D(map, wob).rgb;
        vec3 energy = mix(colA, colB, swirl);
        float edge = smoothstep(0.18, 0.5, r);
        vec3 col = mix(view, energy, clamp(edge * 0.85 + swirl * 0.15, 0.0, 1.0));
        col += energy * (0.25 + charge * 0.6) * edge;
        float gray = dot(col, vec3(0.3, 0.59, 0.11));
        col = mix(col, vec3(gray) * vec3(0.55, 0.5, 0.7), locked * 0.85);
        gl_FragColor = vec4(col, 0.96);
        #include <colorspace_fragment>
      }`,
  });
}

/** Cartel con el nombre del mundo (estilo título de la ilustración). */
export function makeTitleSprite(title, subtitle, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 64px system-ui, sans-serif';
  g.lineJoin = 'round';
  g.lineWidth = 12;
  g.strokeStyle = '#2a1647';
  g.strokeText(title.toUpperCase(), 256, 58);
  g.fillStyle = color;
  g.fillText(title.toUpperCase(), 256, 58);
  if (subtitle) {
    g.font = '700 30px system-ui, sans-serif';
    g.lineWidth = 7;
    g.strokeText(subtitle, 256, 122);
    g.fillStyle = '#ffffff';
    g.fillText(subtitle, 256, 122);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(6, 1.875, 1);
  return s;
}

/** Sprite de texto pequeño actualizable (cuenta atrás, candado…). */
export class StatusSprite {
  constructor(scale = 2.6) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 96;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.sprite.scale.set(scale, scale * 0.375, 1);
    this.text = null;
  }

  set(text, bg = 'rgba(30,14,58,0.8)') {
    if (text === this.text) return;
    this.text = text;
    const g = this.ctx;
    g.clearRect(0, 0, 256, 96);
    this.sprite.visible = Boolean(text);
    if (!text) return;
    // Ajustar el tamaño de letra para que el texto quepa siempre.
    let size = 34;
    g.font = `bold ${size}px system-ui, sans-serif`;
    while (g.measureText(text).width > 220 && size > 16) {
      size -= 2;
      g.font = `bold ${size}px system-ui, sans-serif`;
    }
    const w = Math.min(254, g.measureText(text).width + 30);
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect((256 - w) / 2, 14, w, 64, 32);
    g.fill();
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 47);
    this.tex.needsUpdate = true;
  }
}

/** Forma de arco (rectángulo + semicírculo) para la abertura del portal. */
export function archShape(w, h, rounded = true) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  if (rounded) {
    s.lineTo(r, h - r);
    s.absarc(0, h - r, r, 0, Math.PI, false);
  } else {
    s.lineTo(r, h);
    s.lineTo(-r, h);
  }
  s.lineTo(-r, 0);
  const geo = new THREE.ShapeGeometry(s, 24);
  // UV normalizadas 0..1 para el shader.
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + r) / w, pos.getY(i) / h);
  return geo;
}

export { drawPaw };
