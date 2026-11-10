import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el build funciona en GitHub Pages, Netlify, itch.io
  // o empaquetado dentro de una app de escritorio (Electron/Tauri/NW.js).
  base: './',
  server: {
    host: true, // accesible desde otros dispositivos de la red
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0, // los modelos/texturas nunca se incrustan en base64
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // three en un chunk separado: mejor caché entre versiones del juego
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/lil-gui')) return 'lil-gui';
        },
      },
    },
  },
});
