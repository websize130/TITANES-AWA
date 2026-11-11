// Perfiles gráficos. Los valores están pensados para no sobrecalentar tablets:
// el perfil "bajo" limita a 30 FPS y desactiva sombras.

export const PROFILES = {
  low: {
    label: 'Bajo',
    antialias: false,      // requiere recrear el renderer (recarga)
    maxPixelRatio: 1,
    minPixelRatio: 0.6,    // la resolución dinámica puede bajar hasta aquí
    shadows: false,
    shadowMapSize: 512,
    maxFps: 30,
    envMap: false,
    anisotropy: 1,
  },
  medium: {
    label: 'Medio',
    antialias: false,
    maxPixelRatio: 1.5,
    minPixelRatio: 0.75,
    shadows: true,
    shadowMapSize: 1024,
    maxFps: 60,
    envMap: true,
    anisotropy: 4,
  },
  high: {
    label: 'Alto',
    antialias: true,
    maxPixelRatio: 2,
    minPixelRatio: 1,
    shadows: true,
    shadowMapSize: 2048,
    maxFps: 60,
    envMap: true,
    anisotropy: 8,
  },
};

/**
 * Perfil efectivo: ?gfx=low|medium|high > preferencia guardada > detección.
 * @param {string} preference 'auto' o el nombre de un perfil (Settings.graphics)
 */
export function resolveProfile(caps, preference = 'auto') {
  const fromUrl = new URLSearchParams(location.search).get('gfx');
  if (fromUrl && PROFILES[fromUrl]) return fromUrl;
  if (preference !== 'auto' && PROFILES[preference]) return preference;
  return detectProfile(caps);
}

export function detectProfile(caps) {
  if (caps.isMobile) {
    // En móviles/tablets nunca se elige "alto" automáticamente.
    const lowMem = caps.deviceMemoryGB !== null && caps.deviceMemoryGB <= 4;
    return lowMem ? 'low' : 'medium';
  }
  return 'high';
}
