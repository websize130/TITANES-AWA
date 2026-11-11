import * as THREE from 'three';
import { Platform } from './Platform.js';
import { resolveProfile, PROFILES } from './GraphicsProfiles.js';
import { createMenuScene } from '../world/MenuScene.js';
import { GameSession } from '../systems/GameSession.js';
import { FAMILY_LABEL } from '../controls/GamepadProfiles.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const MIN_LOADING_MS = 1600;

/**
 * Orquestador y máquina de estados de ECLIPSE:
 *   title → menu → loading → playing ⇄ paused → (menu)
 * Un único renderer WebGL 2 para todo: el menú también es una escena 3D.
 */
export class App {
  constructor(deps) {
    Object.assign(this, deps); // renderer, caps, bus, settings, save, input, audio, router, prompts, toast, hud, loading, stats, touch, loop
    this.platform = Platform;
    this.state = 'boot';
    this.session = null;
    this.menu = createMenuScene(this.renderer.profileName, () => this.renderer.pixelRatio);
    this.#immersive = false;
    this.#rotateDismissed = false;
    this.#pendingUpdate = null;
    this.#lastFps = 0;
    this.#bindEvents();
  }

  #immersive; #rotateDismissed; #pendingUpdate; #lastFps;
  #autosave = 0;

  start() {
    this.loop.add((dt) => this.update(dt));
    this.loop.onFpsSample = (fps) => this.#onFps(fps);
    this.onResize();
    this.loop.start();
    this.openTitle();
    this.#checkOrientation();
  }

  // ------------------------------------------------------------------ estados

  #setState(s) {
    this.state = s;
    document.body.dataset.state = s;
  }

  openTitle() {
    this.#setState('title');
    this.input.setContext('menu');
    this.router.show('title');
  }

  openMainMenu() {
    this.audio.unlock();
    this.audio.play(this.state === 'title' ? 'start' : 'confirm');
    this.audio.startAmbient();
    this.audio.setAmbientLevel(1);
    this.#setState('menu');
    this.router.show('main');
    if (this.#pendingUpdate) this.toast.show('Nueva versión lista: se aplicará la próxima vez que abras ECLIPSE.');
  }

  /**
   * JUGAR. Se llama de forma síncrona desde el gesto del usuario para que el
   * navegador permita la pantalla completa.
   */
  play({ resume }) {
    if (this.state !== 'menu') return;
    this.audio.unlock();
    if (this.settings.get('fullscreenOnPlay') && !Platform.isStandalone) this.#enterImmersive();
    this.#load(resume ? this.save.load() : null);
  }

  async #load(saveData) {
    this.#setState('loading');
    this.router.clear();
    this.audio.setAmbientLevel(0.35);
    await this.#fade(true);
    this.loading.show();
    await this.#fade(false);
    const t0 = performance.now();

    this.loading.set(0.15, 'Invocando el santuario');
    await nextFrame();
    this.session = new GameSession({ renderer: this.renderer, bus: this.bus, saveData });
    this.onResize();

    this.loading.set(0.5, 'Forjando materiales');
    await nextFrame();
    // Compila los shaders antes de mostrar nada: evita tirones al empezar
    try { await this.renderer.renderer.compileAsync(this.session.scene, this.session.camera); } catch { /* opcional */ }

    this.loading.set(0.85, 'Despertando al eco');
    this.renderer.render(this.session.scene, this.session.camera);
    const left = MIN_LOADING_MS - (performance.now() - t0);
    if (left > 0) await wait(left);
    this.loading.set(1, 'Listo');
    await wait(250);

    await this.#fade(true);
    this.loading.hide();
    this.hud.show();
    this.bus.emit('player:vitals', { health: this.session.player.health / 100, aether: this.session.player.aether / 100 });
    this.input.setContext('game');
    this.#setState('playing');
    Platform.requestWakeLock();
    await this.#fade(false);
    this.hud.showZone(this.session.zone, saveData ? 'Partida continuada' : 'Prólogo');
    this.#checkOrientation();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.#setState('paused');
    this.input.setContext('menu');
    this.input.exitPointerLock();
    this.touch.reset();
    this.hud.setPaused(true);
    this.#saveGame();
    this.router.show('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.router.clear();
    this.hud.setPaused(false);
    this.input.setContext('game');
    this.#setState('playing');
    this.input.requestPointerLock(this.renderer.domElement);
  }

  async returnToMenu() {
    if (this.state !== 'paused') return;
    this.#saveGame();
    this.router.clear();
    this.#setState('loading');
    await this.#fade(true);
    this.hud.hide();
    this.session.dispose();
    this.session = null;
    Platform.releaseWakeLock();
    if (this.#immersive) {
      this.#immersive = false;
      Platform.unlockOrientation();
      await Platform.exitFullscreen();
    }
    this.onResize();
    this.#setState('menu');
    this.input.setContext('menu');
    this.audio.setAmbientLevel(1);
    this.router.show('main');
    await this.#fade(false);
    this.toast.show('Partida guardada');
  }

  // ------------------------------------------------------------------ bucle

  update(dt) {
    this.input.update(dt);
    switch (this.state) {
      case 'title':
      case 'menu':
        this.menu.update(dt);
        this.renderer.render(this.menu.scene, this.menu.camera);
        break;
      case 'playing':
        if (this.input.wasPressed('pause')) { this.pause(); break; }
        this.session.update(dt, this.input);
        this.renderer.render(this.session.scene, this.session.camera);
        this.#autosave += dt;
        if (this.#autosave > 60) this.#saveGame();
        break;
      default:
        // paused / loading: no se renderiza (ahorro de batería)
        break;
    }
  }

  // ------------------------------------------------------------------ utilidades

  onResize() {
    const { width, height } = this.renderer.resize();
    const aspect = width / height;
    this.menu.setAspect(aspect);
    if (this.session) {
      this.session.camera.aspect = aspect;
      this.session.camera.updateProjectionMatrix();
    }
  }

  setGraphics(preference) {
    const name = resolveProfile(this.caps, preference);
    const needsRestart = this.renderer.applyProfile(name);
    this.loop.maxFps = this.renderer.profile.maxFps;
    if (this.session) {
      this.session.world.applyShadowProfile(this.renderer.profile);
      this.renderer.createEnvironment(this.session.scene);
    }
    this.onResize();
    if (needsRestart) this.toast.show('El suavizado de bordes cambiará al reiniciar el juego.');
  }

  async toggleFullscreen() {
    if (Platform.isFullscreen) {
      this.#immersive = false;
      Platform.unlockOrientation();
      await Platform.exitFullscreen();
      return;
    }
    const ok = await this.#enterImmersive();
    if (!ok) this.toast.show('Este navegador no permite pantalla completa ahora. Prueba tocando o con el ratón.');
  }

  /** Pantalla completa + orientación horizontal. Llamar dentro de un gesto. */
  #enterImmersive() {
    return Platform.requestFullscreen().then((ok) => {
      if (ok) {
        this.#immersive = true;
        if (this.caps.isMobile) Platform.lockLandscape();
      }
      return ok;
    });
  }

  #saveGame() {
    if (!this.session) return;
    this.#autosave = 0;
    this.save.save(this.session.serialize());
  }

  #fade(on) {
    this.veil.classList.toggle('is-on', on);
    return wait(on ? 420 : 380);
  }

  #onFps(fps) {
    this.#lastFps = fps;
    if (this.state === 'playing' || this.state === 'menu' || this.state === 'title') this.renderer.adaptResolution(fps);
    const s = this.renderer.stats();
    this.stats.update([
      `FPS ${fps.toFixed(0)} / ${this.renderer.profile.maxFps} · ${PROFILES[this.renderer.profileName].label}`,
      `pixelRatio ${this.renderer.pixelRatio.toFixed(2)} · draw ${s.drawCalls} · tris ${s.triangles}`,
      `geo ${s.geometries} · tex ${s.textures} · WebGL2 · three r${THREE.REVISION}`,
      `entrada ${this.input.device}${this.input.device === 'gamepad' ? ` (${this.input.padFamily})` : ''} · ${this.state}`,
    ]);
  }

  #checkOrientation() {
    const portrait = this.caps.isMobile && Platform.isPortrait();
    const show = portrait && !this.#rotateDismissed;
    this.rotateEl.hidden = !show;
    if (show && this.state === 'playing') this.pause();
  }

  /** Llamado por el registro del service worker cuando hay versión nueva esperando. */
  onUpdateReady(apply) {
    if (this.state === 'title' || this.state === 'boot') {
      // Aún no se ha empezado a jugar: se aplica ya, de forma transparente
      this.veil.classList.add('is-on');
      apply();
    } else {
      this.#pendingUpdate = apply;
      this.toast.show('Nueva versión lista: se aplicará la próxima vez que abras ECLIPSE.');
    }
  }

  #bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    matchMedia('(orientation: portrait)').addEventListener('change', () => {
      this.#rotateDismissed = false;
      setTimeout(() => this.#checkOrientation(), 120);
    });
    this.rotateEl.querySelector('#rotate-dismiss').addEventListener('click', () => {
      this.#rotateDismissed = true;
      this.#checkOrientation();
    });
    const rotateFs = this.rotateEl.querySelector('#rotate-fullscreen');
    rotateFs.hidden = !(Platform.fullscreenSupported && Platform.orientationLockSupported);
    rotateFs.addEventListener('click', () => {
      this.#enterImmersive().then((ok) => {
        if (!ok) this.toast.show('No se pudo activar la pantalla completa en este navegador.');
        setTimeout(() => this.#checkOrientation(), 300);
      });
    });
    // Mientras el aviso de girar está visible, el mando puede descartarlo
    this.router.blocker = (e) => {
      if (this.rotateEl.hidden) return false;
      if (e.type === 'confirm' || e.type === 'back') { this.#rotateDismissed = true; this.#checkOrientation(); }
      return true;
    };

    Platform.onFullscreenChange(() => {
      if (!Platform.isFullscreen && this.#immersive) {
        // El jugador salió (Esc, gesto atrás de Android...): se pausa como en consola
        this.#immersive = false;
        Platform.unlockOrientation();
        this.pause();
      }
      this.router.top?.refresh?.();
    });

    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'playing' && this.input.device === 'kbm') this.pause();
    });
    // En partida con ratón: el primer clic captura el puntero para mover la cámara
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      if (this.state === 'playing' && e.pointerType === 'mouse') this.input.requestPointerLock(this.renderer.domElement);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else if (this.state === 'playing') Platform.requestWakeLock();
    });

    this.hudPause.addEventListener('click', () => this.pause());

    this.bus.on('input:gamepad', ({ connected, family, wasActive }) => {
      const label = FAMILY_LABEL[family];
      this.toast.show(connected ? `${label} conectado` : `${label} desconectado`, { icon: '◆' });
      if (!connected && wasActive) this.pause();
      this.prompts.refresh();
    });
    this.bus.on('input:device', () => this.router.refreshFocus());
    this.bus.on('sfx', (name) => this.audio.play(name));
    this.bus.on('settings:changed', ({ key, value }) => {
      if (key === 'graphics') this.setGraphics(value);
      if (key === 'showStats') this.stats.setVisible(value || this.debug);
    });

    this.renderer.onContextLost = () => {
      this.loop.stop();
      this.fatal.textContent = 'Se perdió el contexto gráfico. Recuperando…';
      this.fatal.hidden = false;
    };
    this.renderer.onContextRestored = () => {
      this.fatal.hidden = true;
      this.loop.start();
    };
  }
}
