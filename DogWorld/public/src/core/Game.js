// Orquestador: renderer, bucle principal, estados (menú / jugando) y cableado de sistemas.
import * as THREE from 'three';
import { HubWorld } from '../world/HubWorld.js';
import { InputManager } from '../input/InputManager.js';
import { PlayerController } from '../player/PlayerController.js';
import { ThirdPersonCamera } from '../player/ThirdPersonCamera.js';
import { NetworkClient } from '../net/NetworkClient.js';
import { RemotePlayers } from '../net/RemotePlayers.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';
import { Fullscreen } from './Fullscreen.js';
import { getQualityProfile } from './Quality.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new InputManager(canvas);
    this.quality = getQualityProfile(this.input.isTouchDevice);

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: this.quality.antialias, powerPreference: 'high-performance', stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.pixelRatio = this.quality.pixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1200);

    this.world = new HubWorld(this.scene, this.quality);

    this.player = new PlayerController(this.world, this.input, '#f4b860');
    this.player.avatar.root.visible = false;
    this.scene.add(this.player.avatar.root);
    this.cameraRig = new ThirdPersonCamera(this.camera, this.input, {
      distance: this.input.isTouchDevice ? 8.5 : 7.5,
      autoFollow: this.input.isTouchDevice,
    });

    this.remotes = new RemotePlayers(this.scene);
    this.net = new NetworkClient();
    this.hud = new HUD();
    this.menu = new Menu(this.input.isTouchDevice);

    this.state = 'menu';
    this.online = false;
    this.profile = null;
    this.localScore = 0;
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.fpsAccum = 0;
    this.fpsFrames = 0;

    this.wireUI();
    this.wireNetwork();
    this.wireWorld();

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    Fullscreen.onChange(() => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing' && !this.input.isTouchDevice) this.pause();
    });

    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------------------------------------------------------------------------
  wireUI() {
    this.menu.onPlay = (profile) => this.play(profile);
    this.hud.onPause = () => this.pause();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.state === 'playing') this.pause();
      if (e.code === 'KeyF' && e.altKey) Fullscreen.toggle();
    });
    // Salir del pointer lock con Esc también abre el menú.
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'playing' && !this.input.isTouchDevice && this.wasLocked) this.pause();
      this.wasLocked = Boolean(document.pointerLockElement);
    });
  }

  wireNetwork() {
    const net = this.net;
    net.onStatus = (connected) => {
      this.hud.setNetwork(connected ? 'online' : 'offline');
      if (!connected && this.state === 'playing') this.hud.toast('Conexión perdida, reconectando…');
    };
    net.onWelcome = (msg) => {
      this.remotes.clear();
      for (const p of msg.players) this.remotes.add(p);
      this.world.collectibles.setCollected(msg.collected);
      this.localScore = 0;
      this.hud.setBones(0);
      this.hud.setPlayers(this.remotes.count + 1);
      this.hud.setNetwork('online');
    };
    net.onPlayerJoin = (p) => {
      this.remotes.add(p);
      this.hud.setPlayers(this.remotes.count + 1);
      this.hud.toast(`${p.name} se ha unido`);
    };
    net.onPlayerLeave = (id) => {
      const p = this.remotes.remove(id);
      this.hud.setPlayers(this.remotes.count + 1);
      if (p) this.hud.toast(`${p.name} se ha ido`);
    };
    net.onSnapshot = (msg) => this.remotes.applySnapshot(msg, net.playerId);
    net.onCollected = (msg) => {
      this.world.collectibles.confirmCollected(msg.id);
      if (msg.by === net.playerId) {
        this.localScore = msg.score;
        this.hud.setBones(msg.score);
      }
    };
    net.onRespawn = (id) => this.world.collectibles.respawn(id);
    net.onError = (msg) => this.menu.setStatus(msg.msg);
  }

  wireWorld() {
    const collectibles = this.world.collectibles;
    collectibles.onCollect = (id) => {
      navigator.vibrate?.(15);
      if (this.online && this.net.joined) {
        this.net.collect(id);
        // Si el servidor no confirma (otro jugador lo cogió antes), el hueso se queda oculto
        // hasta su RESPAWN; reponemos la predicción si no hay respuesta en 2 s.
        setTimeout(() => {
          if (collectibles.pending[id]) {
            collectibles.pending[id] = 0;
            collectibles.refreshHalos();
          }
        }, 2000);
      } else {
        // Modo local: recoger y reaparecer tras un tiempo.
        collectibles.confirmCollected(id);
        this.localScore++;
        this.hud.setBones(this.localScore);
        setTimeout(() => collectibles.respawn(id), 30000);
      }
    };
    this.player.onRespawn = () => this.hud.toast('¡Cuidado con el vacío!');
  }

  // ---------------------------------------------------------------------------
  async play(profile) {
    const sameSession = this.profile && this.profile.room === profile.room && this.profile.name === profile.name
      && this.profile.color === profile.color && (this.online ? this.net.joined : true);
    this.player.setFurColor(profile.color);

    if (!sameSession) {
      this.profile = profile;
      this.net.close();
      this.net = new NetworkClient();
      this.wireNetwork();
      this.remotes.clear();
      try {
        await withTimeout(this.net.join(profile.room, profile.name, profile.color), 4000);
        this.online = true;
        this.hud.toast(`Sala ${this.net.room}`);
      } catch (err) {
        this.net.close();
        this.online = false;
        this.hud.setNetwork('local');
        this.hud.setPlayers(1);
        this.hud.toast('Sin servidor: modo local');
        this.world.collectibles.setCollected([]);
        if (err?.message && /llena|versión/i.test(err.message)) {
          this.menu.setStatus(err.message);
          return;
        }
      }
      this.player.respawn();
      this.cameraRig.yaw = 0;
      this.cameraRig.pitch = 0.32;
      this.cameraRig.initialized = false;
    }

    this.menu.setStatus('');
    this.menu.inGame = true;
    this.state = 'playing';
    this.menu.show(false);
    this.hud.show(true);
    this.player.avatar.root.visible = true;
    this.input.setEnabled(true);
    this.clock.getDelta();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'menu';
    this.input.setEnabled(false);
    this.hud.show(false);
    this.menu.show(true);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // En vertical, abrir el FOV para no perder visión lateral.
    this.camera.fov = w < h ? 75 : 60;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------------------
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;
    const t = this.elapsed;

    this.input.update();

    if (this.state === 'playing') {
      this.player.update(dt);
      this.cameraRig.update(dt, this.player);
      this.world.collectibles.update(t, this.player.position);
      if (this.online) this.net.update(dt, this.player.position, this.player.yaw, this.player.anim);
    } else {
      // Fondo del menú: cámara cinematográfica. Los demás jugadores siguen moviéndose.
      if (this.menu.inGame) this.cameraRig.update(dt, this.player);
      else this.cameraRig.updateAttract(t);
      this.world.collectibles.update(t, null);
      if (this.online) this.net.update(dt, this.player.position, this.player.yaw, this.player.anim);
    }

    this.remotes.update(dt);
    this.world.update(t, dt, this.camera, this.state === 'playing' ? this.player.position : this.camera.position);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();

    this.adaptResolution(dt);
  }

  /** Resolución dinámica: baja el pixel ratio si no se sostienen ~50 FPS. */
  adaptResolution(dt) {
    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum < 2) return;
    const fps = this.fpsFrames / this.fpsAccum;
    this.fpsAccum = 0;
    this.fpsFrames = 0;
    const max = this.quality.pixelRatio;
    let pr = this.pixelRatio;
    if (fps < 48 && pr > 0.75) pr = Math.max(0.75, pr - 0.25);
    else if (fps > 58 && pr < max) pr = Math.min(max, pr + 0.25);
    if (pr !== this.pixelRatio) {
      this.pixelRatio = pr;
      this.renderer.setPixelRatio(pr);
      this.resize();
    }
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}
