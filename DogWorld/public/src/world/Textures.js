// Texturas procedurales (canvas) para que el prototipo no dependa de assets externos.
// Se pueden sustituir por texturas PBR reales (albedo/normal/roughness) sin tocar la lógica.
import * as THREE from 'three';

const cache = new Map();

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// PRNG determinista para que todos los clientes vean el mismo mundo.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finish(canvas, { repeat = [1, 1], srgb = true, anisotropy = 4 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = anisotropy;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function memo(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

/** Bloques de piedra arenisca con mortero, estilo castillo de cuento. */
export function stoneBricksTexture() {
  return memo('stone', () => {
    const [c, g] = makeCanvas(512, 512);
    const rnd = mulberry32(7);
    g.fillStyle = '#7d6a58';
    g.fillRect(0, 0, 512, 512);
    const rows = 8;
    const rowH = 512 / rows;
    for (let r = 0; r < rows; r++) {
      let x = r % 2 ? -32 : 0;
      while (x < 512) {
        const w = 56 + rnd() * 40;
        const hue = 30 + rnd() * 12;
        const light = 62 + rnd() * 14;
        g.fillStyle = `hsl(${hue}, ${28 + rnd() * 12}%, ${light}%)`;
        const pad = 3;
        roundRect(g, x + pad, r * rowH + pad, w - pad * 2, rowH - pad * 2, 7);
        g.fill();
        // Brillo superior y sombra inferior (look estilizado "hand-painted").
        g.fillStyle = 'rgba(255,240,210,0.22)';
        g.fillRect(x + pad + 4, r * rowH + pad + 2, w - pad * 2 - 8, 5);
        g.fillStyle = 'rgba(60,40,25,0.22)';
        g.fillRect(x + pad + 2, r * rowH + rowH - pad - 6, w - pad * 2 - 4, 4);
        // Grietas / musgo.
        if (rnd() < 0.18) {
          g.fillStyle = 'rgba(90,140,60,0.45)';
          g.beginPath();
          g.ellipse(x + w * rnd(), r * rowH + rowH - 8, 14 + rnd() * 10, 5, 0, 0, Math.PI * 2);
          g.fill();
        }
        x += w;
      }
    }
    return finish(c);
  });
}

/** Tejas moradas para los tejados cónicos. */
export function roofTilesTexture() {
  return memo('roof', () => {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#4b1f86';
    g.fillRect(0, 0, 256, 256);
    const rnd = mulberry32(11);
    for (let r = 0; r < 12; r++) {
      const y = r * 22;
      for (let i = -1; i < 10; i++) {
        const x = i * 28 + (r % 2) * 14;
        const l = 42 + rnd() * 14;
        g.fillStyle = `hsl(${268 + rnd() * 10}, 62%, ${l}%)`;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 26, y);
        g.lineTo(x + 26, y + 16);
        g.quadraticCurveTo(x + 13, y + 26, x, y + 16);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.fillRect(x + 3, y + 2, 20, 3);
      }
    }
    return finish(c);
  });
}

/** Estandarte morado con borde dorado y huella de perro. Fondo transparente en la punta. */
export function bannerTexture() {
  return memo('banner', () => {
    const [c, g] = makeCanvas(256, 512);
    g.clearRect(0, 0, 256, 512);
    const shape = () => {
      g.beginPath();
      g.moveTo(8, 0);
      g.lineTo(248, 0);
      g.lineTo(248, 430);
      g.lineTo(128, 504);
      g.lineTo(8, 430);
      g.closePath();
    };
    shape();
    g.fillStyle = '#d9a52b';
    g.fill();
    g.save();
    g.translate(128, 250);
    g.scale(0.9, 0.93);
    g.translate(-128, -250);
    shape();
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#7a3cc8');
    grad.addColorStop(1, '#4a1d85');
    g.fillStyle = grad;
    g.fill();
    g.restore();
    drawPaw(g, 128, 230, 1.6, '#ffcc3d');
    return finish(c, { srgb: true });
  });
}

/** Cascada: vetas verticales que se desplazan con offset.y. */
export function waterfallTexture() {
  return memo('water', () => {
    const [c, g] = makeCanvas(128, 256);
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(160,220,255,0.75)');
    grad.addColorStop(0.5, 'rgba(220,245,255,0.95)');
    grad.addColorStop(1, 'rgba(160,220,255,0.75)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 256);
    const rnd = mulberry32(3);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.5})`;
      g.fillRect(rnd() * 128, rnd() * 256, 2 + rnd() * 4, 20 + rnd() * 60);
    }
    return finish(c, { repeat: [1, 2] });
  });
}

/** Vetas de madera para vallas y cofres. */
export function woodTexture() {
  return memo('wood', () => {
    const [c, g] = makeCanvas(128, 256);
    g.fillStyle = '#8a5a32';
    g.fillRect(0, 0, 128, 256);
    const rnd = mulberry32(5);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(${60 + rnd() * 30},${35 + rnd() * 20},15,${0.3 + rnd() * 0.3})`;
      g.lineWidth = 1 + rnd() * 2;
      g.beginPath();
      const x = rnd() * 128;
      g.moveTo(x, 0);
      g.bezierCurveTo(x + 6, 80, x - 6, 170, x + 3, 256);
      g.stroke();
    }
    return finish(c);
  });
}

/** Ruido suave para rocas (usado como bumpMap). */
export function rockNoiseTexture() {
  return memo('rock', () => {
    const [c, g] = makeCanvas(256, 256);
    const rnd = mulberry32(9);
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = Math.floor(90 + rnd() * 90);
      g.fillStyle = `rgba(${v},${v},${v},0.35)`;
      g.beginPath();
      g.arc(rnd() * 256, rnd() * 256, 2 + rnd() * 10, 0, Math.PI * 2);
      g.fill();
    }
    return finish(c, { srgb: false });
  });
}

/** Sprite radial suave (brillos, partículas, sombras de contacto). */
export function glowTexture() {
  return memo('glow', () => {
    const [c, g] = makeCanvas(128, 128);
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

export function drawPaw(g, cx, cy, s, color) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(cx, cy + 22 * s, 30 * s, 25 * s, 0, 0, Math.PI * 2);
  g.fill();
  const toes = [[-30, -14, -0.4], [-11, -32, -0.12], [11, -32, 0.12], [30, -14, 0.4]];
  for (const [dx, dy, rot] of toes) {
    g.beginPath();
    g.ellipse(cx + dx * s, cy + dy * s, 10 * s, 13 * s, rot, 0, Math.PI * 2);
    g.fill();
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
