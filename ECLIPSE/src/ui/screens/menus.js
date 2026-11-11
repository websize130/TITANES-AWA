import { formatPlayTime } from '../../core/SaveSystem.js';
import { HOSTING_CREDIT, GAME } from '../../config.js';

/**
 * Registra en el router las pantallas de menú. Las acciones se delegan en
 * `app` (orquestador), así las pantallas no conocen los sistemas de juego.
 */
export function registerMenus(router, app) {
  const $ = (sel) => document.querySelector(sel);

  // ---------- Título ("pulsa cualquier botón") ----------
  const title = $('[data-screen="title"]');
  router.register('title', {
    onInput(e) {
      if (e.type !== 'nav') app.openMainMenu();
      return true;
    },
  });
  title.addEventListener('click', () => { if (router.top?.id === 'title') app.openMainMenu(); });

  // ---------- Menú principal ----------
  const btnContinue = $('[data-action="continue"]');
  const continueMeta = $('#continue-meta');
  router.register('main', {
    onEnter() { this.refresh(); },
    onResume() { this.refresh(); },
    refresh() {
      const save = app.save.load();
      btnContinue.disabled = !save;
      continueMeta.textContent = save ? `${save.zone ?? ''} · ${formatPlayTime(save.playTime ?? 0)}` : 'Sin partida guardada';
      router.refreshFocus();
    },
    onBack() { app.openTitle(); },
  });
  btnContinue.addEventListener('click', () => app.play({ resume: true }));
  $('[data-action="new"]').addEventListener('click', () => {
    if (!app.save.exists()) { app.play({ resume: false }); return; }
    router.push('confirm', {
      title: 'Nueva partida',
      message: 'Se sobrescribirá la partida guardada. ¿Quieres continuar?',
      confirmLabel: 'Empezar de nuevo',
      onConfirm: () => app.play({ resume: false }),
    });
  });
  $('[data-action="settings"]').addEventListener('click', () => router.push('settings'));
  $('[data-action="credits"]').addEventListener('click', () => router.push('credits'));

  $('#menu-version').textContent = `v${GAME.version}`;
  const credit = $('#hosting-credit');
  if (HOSTING_CREDIT) {
    credit.hidden = false;
    credit.textContent = HOSTING_CREDIT.label;
    if (HOSTING_CREDIT.url) credit.href = HOSTING_CREDIT.url;
  }

  // ---------- Diálogo de confirmación ----------
  let confirmParams = null;
  router.register('confirm', {
    overlay: true,
    initialFocus: () => 1, // por seguridad, el foco empieza en "Cancelar"
    onEnter(p) {
      confirmParams = p;
      $('#confirm-title').textContent = p.title;
      $('#confirm-message').textContent = p.message;
      $('#confirm-yes .menu-label').textContent = p.confirmLabel ?? 'Aceptar';
    },
    onBack() { router.pop(); },
  });
  $('#confirm-yes').addEventListener('click', () => {
    const p = confirmParams;
    // Se ejecuta antes de cerrar para conservar el gesto del usuario (pantalla completa)
    p?.onConfirm?.();
    if (router.top?.id === 'confirm') router.pop();
  });
  $('#confirm-no').addEventListener('click', () => router.pop());

  // ---------- Créditos ----------
  const creditsScroll = $('#credits-scroll');
  router.register('credits', {
    onEnter() { creditsScroll.scrollTop = 0; },
    onInput(e) {
      if (e.type === 'nav' && (e.dir === 'up' || e.dir === 'down')) {
        creditsScroll.scrollBy({ top: e.dir === 'up' ? -120 : 120, behavior: 'smooth' });
        return true;
      }
      return false;
    },
    onBack() { router.pop(); },
  });
  $('[data-action="credits-back"]').addEventListener('click', () => router.pop());

  // ---------- Pausa ----------
  const fsItem = $('[data-action="fullscreen"]');
  router.register('pause', {
    onEnter() { this.refresh(); },
    onResume() { this.refresh(); },
    refresh() {
      fsItem.hidden = !app.platform.fullscreenSupported || app.platform.isStandalone;
      fsItem.querySelector('.menu-meta').textContent = app.platform.isFullscreen ? 'Activada' : 'Desactivada';
      $('#pause-zone').textContent = app.session?.zone ?? '';
      $('#pause-time').textContent = formatPlayTime(app.session?.playTime ?? 0);
      router.refreshFocus();
    },
    onBack() { app.resume(); },
    onStart() { app.resume(); },
  });
  $('[data-action="resume"]').addEventListener('click', () => app.resume());
  $('[data-action="pause-settings"]').addEventListener('click', () => router.push('settings'));
  fsItem.addEventListener('click', () => app.toggleFullscreen().then(() => router.top?.refresh?.()));
  $('[data-action="quit"]').addEventListener('click', () => router.push('confirm', {
    title: 'Volver al menú principal',
    message: 'Tu progreso se guardará automáticamente.',
    confirmLabel: 'Volver al menú',
    onConfirm: () => app.returnToMenu(),
  }));
}
