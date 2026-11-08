// Perfiles de calidad. Se puede forzar con ?quality=low|medium|high en la URL.
const PROFILES = {
  low: {
    antialias: false, pixelRatioCap: 1.0, shadows: false, shadowMapSize: 1024,
    grassCount: 9000, flowerCount: 400, cloudCount: 8, terrainResolution: 0.5, maxPointLights: 1, particles: false,
  },
  medium: {
    antialias: false, pixelRatioCap: 1.5, shadows: true, shadowMapSize: 1024,
    grassCount: 18000, flowerCount: 800, cloudCount: 12, terrainResolution: 0.7, maxPointLights: 2, particles: true,
  },
  high: {
    antialias: true, pixelRatioCap: 2.0, shadows: true, shadowMapSize: 2048,
    grassCount: 45000, flowerCount: 1800, cloudCount: 18, terrainResolution: 1.0, maxPointLights: 4, particles: true,
  },
};

export function getQualityProfile(isTouch) {
  const forced = new URLSearchParams(location.search).get('quality');
  let name = PROFILES[forced] ? forced : isTouch ? 'medium' : 'high';
  // Equipos modestos (pocos núcleos) bajan un nivel automáticamente.
  if (!PROFILES[forced] && (navigator.hardwareConcurrency || 8) <= 4) name = name === 'high' ? 'medium' : 'low';
  const p = { ...PROFILES[name], name };
  p.pixelRatio = Math.min(window.devicePixelRatio || 1, p.pixelRatioCap);
  return p;
}
