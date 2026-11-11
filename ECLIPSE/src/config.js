// Configuración global de ECLIPSE.

export const GAME = Object.freeze({
  title: 'ECLIPSE',
  subtitle: 'The Fallen Kingdom',
  version: __APP_VERSION__, // inyectado por Vite desde package.json
});

/**
 * Crédito del hosting. Solo se muestra en el menú principal (nunca en partida).
 * Déjalo en null si el proveedor no lo exige. Ejemplo:
 *   { label: 'Publicado en GitHub Pages', url: 'https://pages.github.com/' }
 * Ni GitHub Pages ni Netlify inyectan marcas de agua en el juego.
 */
export const HOSTING_CREDIT = null;
