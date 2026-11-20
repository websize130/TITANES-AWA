import * as THREE from 'three';
import { clamp } from '../core/utils.js';
import { CONFIG, QUALITY } from '../data/config.js';
import { Settings } from '../core/settings.js';
import { TextureFactory } from './textures.js';

/* =====================================================================
   MOTOR: renderizador, tone mapping, sombras y entorno IBL nocturno
   ===================================================================== */
export class Engine {
  constructor(canvas, qName) {
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: qName !== 'bajo', powerPreference: 'high-performance', stencil: false }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    TextureFactory.maxAniso = Math.min(8, r.capabilities.getMaxAnisotropy());
    // Contador de errores de shader: permite reconstruir la escena sin CSM si un GPU no lo soporta
    this.shaderErrors = 0;
    r.debug.onShaderError = (gl, program, vs, fs) => {
      this.shaderErrors++;
      console.error('[BLOOD DEAD] Error de shader', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs));
    };
    this.applyBrightness();
    this.setPixelRatio(QUALITY[qName].pixelRatio);
  }
  get width() { return this.canvas.clientWidth || window.innerWidth; }
  get height() { return this.canvas.clientHeight || window.innerHeight; }
  applyBrightness() { this.renderer.toneMappingExposure = (this.levelExposure || CONFIG.render.exposure) * Settings.data.brightness; }
  setPixelRatio(max) { this.prBase = Math.min(window.devicePixelRatio || 1, max); this.prScale = 1; this.renderer.setPixelRatio(this.prBase); this.resize(); }
  setScale(s) { // resolución dinámica: escala la resolución interna sin tocar el tamaño del lienzo
    s = clamp(s, 0.6, 1); if (Math.abs(s - this.prScale) < 0.01) return;
    this.prScale = s; this.renderer.setPixelRatio(Math.max(0.5, this.prBase * s)); this.resize();
  }
  resize() { this.renderer.setSize(this.width, this.height, false); }
  buildEnvironment() {
    const pm = new THREE.PMREMGenerator(this.renderer), sc = new THREE.Scene();
    const geo = new THREE.SphereGeometry(20, 32, 16), pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    const top = new THREE.Color(0.03, 0.042, 0.06), hor = new THREE.Color(0.014, 0.018, 0.022), bot = new THREE.Color(0.004, 0.004, 0.004), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 20;
      if (y > 0) c.copy(hor).lerp(top, Math.pow(y, 0.6)); else c.copy(hor).lerp(bot, Math.min(1, -y * 3));
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    sc.add(new THREE.Mesh(geo, skyMat));
    const moonGeo = new THREE.SphereGeometry(0.9, 16, 12), moonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.4, 4.0) });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.copy(new THREE.Vector3(...CONFIG.lighting.moonDir).normalize().multiplyScalar(-18)); sc.add(moon);
    const rt = pm.fromScene(sc, 0.03);
    geo.dispose(); skyMat.dispose(); moonGeo.dispose(); moonMat.dispose(); pm.dispose();
    return rt.texture;
  }
}
