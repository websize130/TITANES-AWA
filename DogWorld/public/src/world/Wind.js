// Viento global en GPU: un único uniform de tiempo compartido por hierba, banderas y estandartes.
export const windUniforms = {
  uTime: { value: 0 },
};

/**
 * Inyecta ondulación de tela en un material estándar. La deformación crece con
 * la distancia al mástil (uv.x) para banderas, o hacia abajo (1 - uv.y) para estandartes.
 */
export function applyClothWind(material, { mode = 'flag', amplitude = 0.25 } = {}) {
  const weight = mode === 'flag' ? 'uv.x' : '(1.0 - uv.y)';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float wW = ${weight};
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float ph = wp.x * 0.3 + wp.z * 0.2;
        transformed.z += sin(uTime * 4.0 + position.x * 3.0 + position.y * 1.5 + ph) * ${amplitude.toFixed(3)} * wW;
        transformed.y += cos(uTime * 3.0 + position.x * 2.0 + ph) * ${(amplitude * 0.3).toFixed(3)} * wW;`,
      );
  };
  material.customProgramCacheKey = () => `cloth-${mode}-${amplitude}`;
  return material;
}
