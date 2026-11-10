// Detección de capacidades del dispositivo, sin crear el renderer del juego.

export function detectCapabilities() {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isMobile = isAndroid || /iPhone|iPad|iPod|Mobile/i.test(ua) || navigator.maxTouchPoints > 1;

  const caps = {
    isAndroid,
    isMobile,
    webgl2: false,
    gpuRenderer: 'desconocido',
    maxTextureSize: 0,
    maxSamples: 0,
    // deviceMemory solo existe en navegadores Chromium (Chrome Android sí)
    deviceMemoryGB: navigator.deviceMemory ?? null,
    cores: navigator.hardwareConcurrency ?? null,
    devicePixelRatio: window.devicePixelRatio || 1,
  };

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (gl) {
    caps.webgl2 = true;
    caps.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    caps.maxSamples = gl.getParameter(gl.MAX_SAMPLES);
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    caps.gpuRenderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // libera el contexto de prueba
  }
  return caps;
}
