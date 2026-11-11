/**
 * Registra el service worker solo en producción (npm run build / preview),
 * en HTTPS o localhost. En desarrollo no se usa para no interferir con Vite.
 * @param {(apply: () => void) => void} onUpdateReady  recibe la función que
 *        activa la versión nueva y recarga la página.
 */
export function registerServiceWorker(onUpdateReady) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (location.protocol !== 'https:' && !local) return;

  let reloading = false;
  const offer = (worker) => onUpdateReady(() => {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
    worker.postMessage('SKIP_WAITING');
  });

  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        // Solo es "actualización" si ya había una versión controlando la página
        if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
      });
    });
    // Buscar versiones nuevas al volver a la app
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) reg.update().catch(() => {});
    });
  }).catch((err) => console.warn('[ECLIPSE] service worker no registrado:', err));
}
