// Posprocesado: bloom suave (cristales, portales, magia), gradación de color
// (saturación, tono cálido de tarde, viñeta) y salida con tone mapping.
// En calidad baja se desactiva y se renderiza directo.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.28 },
    warmth: { value: 0.03 },
    vignette: { value: 0.3 },
    contrast: { value: 1.12 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float saturation; uniform float warmth; uniform float vignette; uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      // Saturación con "vibrance": satura más los colores apagados.
      float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
      c.rgb = mix(vec3(l), c.rgb, saturation + (1.0 - sat) * 0.12);
      // Tono cálido de tarde y sombras ligeramente violetas (como las ilustraciones).
      c.rgb += vec3(warmth, warmth * 0.4, -warmth * 0.5) * smoothstep(0.2, 1.0, l);
      c.rgb += vec3(0.02, 0.0, 0.035) * (1.0 - smoothstep(0.0, 0.35, l));
      c.rgb = clamp((c.rgb - 0.5) * contrast + 0.5, 0.0, 1.0); // más contraste (colores vivos, no lechosos)
      // Viñeta suave.
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, length(d * vec2(1.1, 1.0)));
      gl_FragColor = c;
    }`,
};

export class PostFX {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    this.enabled = quality.name !== 'low';
    if (!this.enabled) return;
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: quality.antialias ? 4 : 0 }));
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    // Umbral alto: solo brillan fuegos, cristales, portales y magia (no el cielo).
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), quality.name === 'high' ? 0.34 : 0.26, 0.5, 0.93);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setSize(w, h, pixelRatio) {
    if (!this.enabled) return;
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
  }

  render(scene, camera) {
    if (!this.enabled) {
      this.renderer.render(scene, camera);
      return;
    }
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.composer.render();
  }
}
