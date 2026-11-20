import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { copyFileSync, existsSync } from 'node:fs';

/* Dos salidas:
   · dist/        → versión web normal (trozos con caché, base relativa: sirve en hosting, PWA, TWA o Capacitor)
   · dist-single/ → un único index.html con todo dentro (motor, fuentes, librerías) para jugar sin servidor;
                    se copia como dist/blood-dead.html y es lo que descarga el botón del menú. */
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    publicDir: single ? false : 'public',
    build: {
      target: 'es2022',
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1500,
      assetsInlineLimit: single ? 100000000 : 4096,
    },
    plugins: single
      ? [viteSingleFile({ removeViteModuleLoader: true })]
      : [{
          name: 'blood-dead-single-copy',
          apply: 'build',
          closeBundle() { if (existsSync('dist-single/index.html')) copyFileSync('dist-single/index.html', 'dist/blood-dead.html'); },
        }],
  };
});
