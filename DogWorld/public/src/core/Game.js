// Orquestador: renderer, bucle principal, estados (menú / selección / jugando) y cableado de sistemas.
import * as THREE from 'three';
import { HubWorld } from '../world/HubWorld.js';
import { Interactables } from '../world/Interactables.js';
import { Effects } from '../world/Effects.js';
import { InputManager } from '../input/InputManager.js';
import { PlayerController } from '../player/PlayerController.js';
import { ThirdPersonCamera } from '../player/ThirdPersonCamera.js';
import { NetworkClient } from '../net/NetworkClient.js';
import { RemotePlayers } from '../net/RemotePlayers.js';
import { HUD } from '../ui/HUD.js';
import { Menu, saveProfile, loadProfile } from '../ui/Menu.js';
import { BreedSelect } from '../ui/BreedSelect.js';
import { AbilitySystem } from '../breeds/AbilitySystem.js';
import { getBreed, BREED_BY_ID } from '../breeds/BreedData.js';
import { Fullscreen } from './Fullscreen.js';
import { getQualityProfile } from './Quality.js';
import { PortalHall } from '../worlds/PortalHall.js';
import { ThemedWorld } from '../worlds/ThemedWorld.js';
import { WORLD_BY_ID, WORLDS, HUB_ZONE, PORTAL_PLAZA } from '../worlds/WorldData.js';
import { isabelPages } from '../worlds/IsabelLines.js';
import { Dialog } from '../ui/Dialog.js';

const PROGRESS_KEY = 'dogworld.progress';
const ISABEL_KEY = 'dogworld.isabel';

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

    this.effects = new Effects(this.scene, this.quality.particles ? 700 : 350);
    this.world = new HubWorld(this.scene, this.quality);
    this.world.interactables = new Interactables(this.scene, this.world.collision, this.effects);
    this.portalHall = new PortalHall(this.scene, this.world.collision, this.effects);

    // Zonas: 'hub' o el id de un mundo temático. activeWorld/activeScene apuntan a la zona actual.
    this.zone = HUB_ZONE;
    this.activeWorld = this.world;
    this.activeScene = this.scene;
    this.themed = null;
    this.portalReadyId = null;
    this.portalStatus = new Map(); // worldId -> { ready:[ids], endsAt }
    this.localPortalT = 0;
    this.transitioning = false;
    this.dialog = new Dialog();
    this.progress = new Set();

    const saved = loadProfile();
    this.player = new PlayerController(this.world, this.input, BREED_BY_ID[saved.breed] ? saved.breed : 'rufus', this.effects);
    this.player.avatar.root.visible = false;
    this.scene.add(this.player.avatar.root);
    this.cameraRig = new ThirdPersonCamera(this.camera, this.input, {
      distance: this.input.isTouchDevice ? 8.5 : 7.5,
      autoFollow: this.input.isTouchDevice,
    });
    this.baseCameraDistance = this.cameraRig.distance;

    this.remotes = new RemotePlayers(this.scene);
    this.remotes.setEffects(this.effects);
    this.net = new NetworkClient();
    this.hud = new HUD(this.input.isTouchDevice);
    this.menu = new Menu(this.input.isTouchDevice);
    this.breedSelect = new BreedSelect();

    this.abilities = new AbilitySystem({
      player: this.player,
      net: () => this.net,
      world: this.world,
      effects: this.effects,
      hud: this.hud,
      remotes: this.remotes,
      isOnline: () => this.online && this.net.joined,
    });
    this.abilities.onLocalScore = (gain) => this.addLocalScore(gain);
    this.applyBreed(this.player.breed.id);
    this.remotes.setMyZone(HUB_ZONE, this.scene);
    this.setProgress(this.loadLocalProgress());

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
    this.menu.onPlay = (profile) => this.onMenuPlay(profile);
    this.menu.onChangeDog = () => this.openBreedSelect();
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
      if (!net.joinInfo && !net.joined) return; // solo consultas de sala
      this.hud.setNetwork(connected ? 'online' : 'offline');
      if (!connected && this.state === 'playing') this.hud.toast('Conexión perdida, reconectando…');
    };
    net.onWelcome = (msg) => {
      if (this.zone !== HUB_ZONE) this.switchZone(HUB_ZONE, null);
      this.setProgress(new Set(msg.progress || []));
      this.remotes.clear();
      for (const p of msg.players) this.remotes.add(p);
      this.world.collectibles.setCollected(msg.collected);
      this.world.interactables.applyState(msg.objects);
      this.refreshCarrying();
      this.localScore = 0;
      this.hud.setBones(0);
      this.hud.setPlayers(this.remotes.count + 1);
      this.hud.setNetwork('online');
    };
    net.onPlayerJoin = (p) => {
      this.remotes.add(p);
      this.hud.setPlayers(this.remotes.count + 1);
      this.hud.toast(`${p.name} se ha unido con ${getBreed(p.b).name}`);
    };
    net.onPlayerLeave = (id) => {
      const p = this.remotes.remove(id);
      this.hud.setPlayers(this.remotes.count + 1);
      if (p) this.hud.toast(`${p.name} se ha ido`);
    };
    net.onPlayerBreed = (id, b) => {
      if (id === net.playerId) {
        this._breedConfirm?.resolve(b);
        return;
      }
      const p = this.remotes.setBreed(id, b);
      if (p) this.hud.toast(`${p.name} ahora juega con ${getBreed(b).name}`);
    };
    net.onSnapshot = (msg) => this.remotes.applySnapshot(msg, net.playerId);
    net.onCollected = (msg) => {
      this.world.collectibles.confirmCollected(msg.id);
      if (msg.by === net.playerId) {
        this.localScore = msg.score;
        this.hud.setBones(msg.score);
      }
    };
    net.onScore = (msg) => {
      if (msg.id === net.playerId) {
        this.localScore = msg.score;
        this.hud.setBones(msg.score);
        this.hud.toast(`¡Tesoro! +${msg.gain} huesos`, 1500);
      } else {
        const p = this.remotes.players.get(msg.id);
        if (p) this.hud.toast(`${p.name} encontró un tesoro (+${msg.gain})`, 1500);
      }
    };
    net.onAbility = (msg) => this.abilities.onRemoteAbility(msg);
    net.onObject = (msg) => {
      if ((msg.z ?? HUB_ZONE) !== this.zone) return;
      const inter = this.activeWorld.interactables;
      if (msg.k === 'rock') inter.setRock(msg.i, msg.s);
      else if (msg.k === 'dig') inter.setDig(msg.i, msg.s);
      else if (msg.k === 'boulder') {
        inter.setBoulder(msg.i, msg.s);
        this.abilities.onBoulderState(msg.i, msg.s);
        this.refreshCarrying();
      }
    };
    net.onRespawn = (id) => this.world.collectibles.respawn(id);
    net.onZone = (msg) => this.enterZone(msg.z, msg.state);
    net.onPlayerZone = (msg) => {
      const p = this.remotes.setZone(msg.id, msg.z, msg.p);
      if (!p) return;
      if (msg.z === this.zone) this.hud.toast(`${p.name} se une a la expedición`, 1600);
      else if (msg.z !== HUB_ZONE && this.zone === HUB_ZONE) this.hud.toast(`${p.name} ha viajado a ${WORLD_BY_ID[msg.z].title}`, 1800);
    };
    net.onPortalStatus = (msg) => {
      if (msg.ready.length) this.portalStatus.set(msg.w, { ready: msg.ready, endsAt: performance.now() + msg.ms });
      else this.portalStatus.delete(msg.w);
      if (!msg.ready.length) this.portalHall.setStatus(msg.w, null, this.progress);
    };
    net.onMission = (msg) => {
      if (msg.z !== this.zone || !this.themed) return;
      const who = msg.by === net.playerId ? 'Tú' : this.remotes.players.get(msg.by)?.name ?? 'Alguien';
      if (msg.solved) {
        const obj = this.themed.objectives.find((o) => o.key === msg.k);
        this.themed.applySolved(msg.k, true);
        if (obj) this.hud.toast(`✔ ${who}: ${obj.def.label.split(':')[0]} ¡reto superado!`, 2000);
      } else if (msg.door) {
        this.themed.openDoor(msg.k, msg.door);
        this.hud.toast(`⏱ ¡${who} abrió la puerta! ¡Corred!`, 1500);
      }
    };
    net.onWorldComplete = (msg) => {
      this.setProgress(new Set(msg.progress));
      if (msg.w === this.zone) this.celebrate(msg.name);
      else this.hud.toast(`🏆 El equipo de ${msg.name} completó ${WORLD_BY_ID[msg.w].title}`, 2500);
    };
    net.onError = (msg) => {
      if (this._breedConfirm && msg.code === 'breed') {
        const err = new Error(msg.msg);
        err.taken = msg.taken;
        this._breedConfirm.reject(err);
        return;
      }
      this.menu.setStatus(msg.msg);
      // Al reconectar, otra persona pudo quedarse con nuestra raza: volver a elegir.
      if (msg.code === 'breed' && this.state === 'playing') {
        this.pause();
        this.net.joined = false;
        this.online = false;
        this.openBreedSelect();
      }
    };
  }

  wireWorld() {
    const collectibles = this.world.collectibles;
    collectibles.onCollect = (id) => {
      navigator.vibrate?.(15);
      if (this.online && this.net.joined) {
        this.net.collect(id);
        // Si el servidor no confirma (otro jugador lo cogió antes), reponer la predicción.
        setTimeout(() => {
          if (collectibles.pending[id]) {
            collectibles.pending[id] = 0;
            collectibles.refreshHalos();
          }
        }, 2000);
      } else {
        collectibles.confirmCollected(id);
        this.addLocalScore(1);
        setTimeout(() => collectibles.respawn(id), 30000);
      }
    };
    this.player.onRespawn = () => this.hud.toast('¡Cuidado con el vacío!');
  }

  addLocalScore(gain) {
    this.localScore += gain;
    this.hud.setBones(this.localScore);
    if (gain > 1) this.hud.toast(`¡Tesoro! +${gain} huesos`, 1500);
  }

  refreshCarrying() {
    const inter = this.world.interactables;
    for (const p of this.remotes.players.values()) p.carrying = inter.heldBy(p.id) >= 0;
  }

  getAvatarById(id) {
    if (id === -1 || (this.online && id === this.net.playerId)) return this.player.avatar;
    return this.remotes.players.get(id)?.avatar ?? null;
  }

  applyBreed(breedId) {
    this.player.setBreed(breedId);
    this.abilities.setBreed(breedId);
    this.cameraRig.distance = this.baseCameraDistance * (0.82 + 0.22 * this.player.stats.scale);
  }

  // ---------------------------------------------------------------------------
  /** Botón principal del menú: continuar o pasar a la selección de perro. */
  async onMenuPlay(profile) {
    if (this.zone !== HUB_ZONE) this.switchZone(HUB_ZONE, null);
    const sameRoom = this.profile && this.menu.inGame && this.profile.room === profile.room && this.profile.name === profile.name;
    if (sameRoom) {
      this.resume();
      return;
    }
    // Nueva sala o nombre: salir de la anterior.
    this.net.close();
    this.net = new NetworkClient();
    this.wireNetwork();
    this.remotes.clear();
    this.online = false;
    this.menu.inGame = false;
    this.profile = profile;
    await this.openBreedSelect();
  }

  /** Abre la pantalla de selección (al entrar en una sala o para cambiar de perro). */
  async openBreedSelect() {
    const profile = this.profile;
    if (!profile) return;
    const inRoom = this.online && this.net.joined;
    let players = [];
    let connected = inRoom;
    if (!inRoom) {
      try {
        const info = await withTimeout(this.net.queryRoom(profile.room), 3000);
        players = info.players;
        connected = true;
      } catch {
        this.net.close();
        this.net = new NetworkClient();
        this.wireNetwork();
        connected = false;
      }
    } else {
      for (const p of this.remotes.players.values()) players.push({ name: p.name, b: p.breedId });
    }

    this.menu.setStatus('');
    this.menu.show(false);
    this.state = 'select';
    this.breedSelect.open({
      room: connected ? profile.room : null,
      players,
      current: this.player.breed.id,
      mine: inRoom ? this.player.breed.id : null,
      refresh: connected ? async () => {
        const info = await withTimeout(this.net.queryRoom(this.profile.room), 2000);
        return info.players.filter((p) => !(this.net.joined && p.b === this.player.breed.id && p.name === this.profile.name));
      } : null,
      onConfirm: (breedId) => this.confirmBreed(breedId, connected),
      onBack: () => {
        this.state = 'menu';
        this.menu.show(true);
      },
    });
  }

  async confirmBreed(breedId, connected) {
    const profile = this.profile;
    if (this.online && this.net.joined) {
      // Cambio de raza dentro de la sala: el servidor confirma que está libre.
      if (breedId !== this.player.breed.id) {
        await withTimeout(new Promise((resolve, reject) => {
          this._breedConfirm = { resolve, reject };
          this.net.changeBreed(breedId);
        }), 4000).finally(() => { this._breedConfirm = null; });
        this.applyBreed(breedId);
        this.effects.emit('sparkle', this.player.position.x, this.player.position.y + 1, this.player.position.z);
      }
    } else if (connected) {
      await withTimeout(this.net.join(profile.room, profile.name, breedId), 4000);
      this.online = true;
      this.applyBreed(breedId);
      this.startRun();
      this.hud.toast(`Sala ${this.net.room} · ${getBreed(breedId).name}`);
    } else {
      this.online = false;
      this.hud.setNetwork('local');
      this.hud.setPlayers(1);
      this.world.collectibles.setCollected([]);
      this.world.interactables.resetLocal();
      this.localScore = 0;
      this.hud.setBones(0);
      this.applyBreed(breedId);
      this.startRun();
      this.hud.toast('Sin servidor: modo local');
    }
    saveProfile({ ...profile, breed: breedId });
    this.menu.breed = breedId;
    this.breedSelect.close();
    this.resume();
  }

  startRun() {
    this.player.respawn();
    this.cameraRig.yaw = 0;
    this.cameraRig.pitch = 0.32;
    this.cameraRig.initialized = false;
  }

  resume() {
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
    this.effects.setViewportHeight(h * this.renderer.getPixelRatio());
  }

  // ---------------------------------------------------------------------------
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    // La selección tiene su propio renderer: no gastar GPU en el mundo detrás.
    if (this.breedSelect.isOpen) return;
    this.elapsed += dt;
    const t = this.elapsed;

    this.input.update();

    const playing = this.state === 'playing' && !this.transitioning;
    if (playing) {
      if (this.input.abilityPressed) this.abilities.activate();
      this.abilities.update(dt);
      this.player.update(dt);
      this.cameraRig.update(dt, this.player);
      if (this.zone === HUB_ZONE) {
        this.world.collectibles.update(t, this.player.position);
        this.updateHubPortals(dt);
      } else {
        this.themed.update(dt, this.player, this.abilities.sniffActive);
        this.hud.setMission(this.themed.def, this.themed.missionList());
      }
      this.updateInteract();
      this.updateBuffs();
    } else {
      // Fondo del menú: cámara cinematográfica. Los demás jugadores siguen moviéndose.
      if (this.menu.inGame) this.cameraRig.update(dt, this.player);
      else this.cameraRig.updateAttract(t);
      if (this.zone === HUB_ZONE) this.world.collectibles.update(t, null);
    }
    if (this.online) this.net.update(dt, this.player.position, this.player.yaw, this.player.anim);

    this.remotes.update(dt);
    this.activeWorld.interactables.update(dt, (id) => this.getAvatarById(id), this.abilities.sniffActive);
    this.effects.update(dt);
    if (this.zone === HUB_ZONE) {
      this.portalHall.update(dt, this.player.avatar.root.visible ? this.player.position : null, this.portalReadyId);
      this.world.update(t, dt, this.camera, playing ? this.player.position : this.camera.position);
    } else {
      this.themed.sky.position.copy(this.camera.position);
    }
    this.renderer.render(this.activeScene, this.camera);
    this.input.endFrame();

    this.adaptResolution(dt);
  }

  // ---------------------------------------------------------------------------
  // Zonas, portales, Isabel y misiones
  // ---------------------------------------------------------------------------
  loadLocalProgress() {
    if (new URLSearchParams(location.search).has('unlockall')) return new Set(WORLDS.map((w) => w.id));
    try { return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY)) || []); } catch { return new Set(); }
  }

  setProgress(progress) {
    this.progress = progress;
    this.portalHall.setProgress(progress);
    if (progress.has('fortress')) this.world.castle.openGate();
    if (!this.online) {
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...progress])); } catch { /* */ }
    }
  }

  get isOnlineNow() {
    return this.online && this.net.joined;
  }

  /** Puente entre el mundo temático y la red (o la lógica local sin servidor). */
  makeBridge() {
    return {
      isOnline: () => this.isOnlineNow,
      act: (k, v) => this.net.act(k, v),
      solveLocal: (k) => {
        const obj = this.themed?.objectives.find((o) => o.key === k);
        if (!obj || obj.solved) return;
        this.themed.applySolved(k, true);
        this.hud.toast(`✔ ${obj.def.label.split(':')[0]}: ¡reto superado!`, 2000);
      },
      completeLocal: () => {
        if (!this.themed || this.themed.complete) return;
        const p = new Set(this.progress);
        p.add(this.themed.id);
        this.setProgress(p);
        this.celebrate(this.profile?.name ?? 'Tú');
      },
      exit: () => this.exitWorld(),
    };
  }

  exitWorld() {
    if (this.zone === HUB_ZONE) return;
    if (this.isOnlineNow) this.net.exitWorld();
    else this.enterZone(HUB_ZONE, null);
  }

  /** Transición con fundido hacia una zona (Hub o mundo). */
  enterZone(zone, state) {
    if (this.transitioning) return;
    this.transitioning = true;
    const def = WORLD_BY_ID[zone];
    const fade = document.getElementById('fade');
    document.documentElement.style.setProperty('--world', def ? def.color : '#6b33b8');
    document.getElementById('fade-title').textContent = def ? def.title : 'Castillo del Despertar';
    document.getElementById('fade-sub').textContent = def ? def.intro : 'De vuelta en la Plaza de los Portales';
    fade.classList.add('show');
    this.dialog.close();
    setTimeout(() => {
      this.switchZone(zone, state);
      setTimeout(() => {
        fade.classList.remove('show');
        this.transitioning = false;
      }, def ? 900 : 350);
    }, 480);
  }

  /** Cambio inmediato de zona (sin fundido). */
  switchZone(zone, state) {
    const prev = this.themed;
    let ctx;
    let scene;
    if (zone === HUB_ZONE) {
      ctx = this.world;
      scene = this.scene;
      this.themed = null;
    } else {
      // Cada expedición empieza con un mundo recién construido (estado limpio).
      ctx = new ThemedWorld(WORLD_BY_ID[zone], this.quality, this.effects);
      ctx.bridge = this.makeBridge();
      if (state) ctx.applyState(state);
      this.themed = ctx;
      scene = ctx.scene;
    }
    this.zone = zone;
    this.activeWorld = ctx;
    this.activeScene = scene;
    scene.add(this.player.avatar.root);
    this.effects.attach(scene);
    this.remotes.setMyZone(zone, scene);
    this.player.setWorld(ctx);
    this.abilities.world = ctx;
    this.abilities.localHeld = -1;
    this.player.carrying = false;
    this.player.velocity.set(0, 0, 0);
    if (zone === HUB_ZONE) {
      const p = PORTAL_PLAZA.returnSpawn;
      this.player.position.set(p.x, this.portalHall.plazaTop + 0.1, p.z);
      this.player.yaw = 0;
      this.cameraRig.yaw = Math.PI; // mirando a los portales
      this.hud.setMission(null);
    } else {
      this.player.position.copy(ctx.spawnPoint);
      this.player.yaw = Math.PI;
      this.cameraRig.yaw = 0;
    }
    this.cameraRig.pitch = 0.32;
    this.cameraRig.initialized = false;
    this.portalReadyId = null;
    this.localPortalT = 0;
    this.hud.setBanner(null);
    this.hud.setPrompt(null);
    if (prev && prev !== ctx) disposeWorld(prev);
  }

  /** Portales del Hub: listo / cuenta atrás compartida / portales sellados. */
  updateHubPortals(dt) {
    const portal = this.portalHall.portalAt(this.player.position);
    const id = portal && !portal.locked ? portal.world.id : null;
    if (portal?.locked && this.lastLockedHint !== portal.world.id) {
      this.lastLockedHint = portal.world.id;
      const req = portal.world.requires.filter((r) => !this.progress.has(r)).map((r) => WORLD_BY_ID[r].title);
      this.hud.toast(`🔒 Isabel: «Este portal se abrirá cuando completéis ${req.join(', ')}»`, 2600);
    } else if (!portal) {
      this.lastLockedHint = null;
    }

    if (id !== this.portalReadyId) {
      this.portalReadyId = id;
      if (this.isOnlineNow) this.net.portal(id);
      else this.localPortalT = id ? 1.5 : 0;
      if (id) navigator.vibrate?.(20);
    }

    // Estado de los portales con jugadores esperando.
    const now = performance.now();
    const hubCount = this.remotes.countInZone(HUB_ZONE) + 1;
    for (const [w, st] of this.portalStatus) {
      const secs = Math.max(0, Math.ceil((st.endsAt - now) / 1000));
      this.portalHall.setStatus(w, `🐾 ${st.ready.length}/${hubCount} · ${secs}s`, this.progress);
    }

    if (!id) {
      this.hud.setBanner(null);
      return;
    }
    const def = WORLD_BY_ID[id];
    if (this.isOnlineNow) {
      const st = this.portalStatus.get(id);
      // Reenviar "listo" si el servidor aún no nos cuenta (latencia, posición sin validar…).
      if ((!st || !st.ready.includes(this.net.playerId)) && now - (this.portalResendAt ?? 0) > 1000) {
        this.portalResendAt = now;
        this.net.portal(id);
      }
      const n = st ? st.ready.length : 1;
      const secs = st ? Math.max(0, (st.endsAt - now) / 1000).toFixed(1) : '…';
      this.hud.setBanner(`🌀 ${def.title}<small>Equipo listo: ${n}/${hubCount} · viaje en ${secs} s — quien se quede atrás podrá unirse después</small>`);
    } else {
      this.localPortalT -= dt;
      this.hud.setBanner(`🌀 ${def.title}<small>Viajando en ${Math.max(0, this.localPortalT).toFixed(1)} s…</small>`);
      if (this.localPortalT <= 0) this.enterZone(id, null);
    }
  }

  /** Acción contextual: hablar con Isabel o pulsar interruptores. */
  updateInteract() {
    const pos = this.player.position;
    let action = null;
    if (this.zone === HUB_ZONE) {
      if (this.portalHall.nearIsabel(pos)) {
        action = { label: 'Hablar con Isabel', icon: '💬', run: () => this.talkToIsabel() };
        if (!this.isabelWaved) {
          this.isabelWaved = true;
          this.portalHall.isabel.wave();
        }
      } else {
        this.isabelWaved = false;
        if (this.dialog.isOpen) this.dialog.close();
      }
    } else {
      const a = this.themed.interactAt(pos);
      if (a) action = { label: a.label, icon: '👆', run: a.run };
    }
    if (this.dialog.isOpen) {
      this.hud.setPrompt(null); // el diálogo ya tiene su botón (R también avanza)
      if (this.input.interactPressed) this.dialog.next();
      return;
    }
    this.hud.setPrompt(action ? action.label : null, action?.icon);
    if (action && this.input.interactPressed) action.run();
  }

  talkToIsabel() {
    let firstTime = true;
    try { firstTime = !localStorage.getItem(ISABEL_KEY); } catch { /* */ }
    const team = [this.player.breed.id];
    for (const p of this.remotes.players.values()) team.push(p.breedId);
    this.portalHall.isabel.wave();
    this.dialog.open(isabelPages({ progress: this.progress, team, firstTime }), () => {
      try { localStorage.setItem(ISABEL_KEY, '1'); } catch { /* */ }
    });
  }

  /** ¡Reliquia recuperada! Fiesta y vuelta al castillo. */
  celebrate(byName) {
    const def = this.themed?.def;
    if (!def || this.themed.complete) return;
    this.themed.complete = true;
    this.themed.updateRelicLabel();
    const p = this.player.position;
    for (let i = 0; i < 6; i++) setTimeout(() => this.effects.emit('confetti', p.x, p.y + 2, p.z), i * 250);
    this.hud.setBanner(`🏆 ¡Reliquia recuperada: ${def.relicName}!<small>${byName} la ha recogido · volviendo al castillo…</small>`, true);
    navigator.vibrate?.([30, 50, 30]);
    const zone = this.zone;
    setTimeout(() => {
      if (this.zone === zone) this.exitWorld();
      const next = WORLDS.filter((w) => !this.progress.has(w.id) && w.requires.every((r) => this.progress.has(r)));
      if (this.progress.has('fortress')) setTimeout(() => this.hud.toast('👑 ¡El castillo ha despertado! Su portón está abierto', 4000), 1500);
      else if (next.length) setTimeout(() => this.hud.toast(`✨ Isabel: «¡Nuevo portal abierto: ${next.map((w) => w.title).join(' y ')}!»`, 3500), 1500);
    }, 6000);
  }

  /** Indicadores de efectos activos (solo toca el DOM cuando cambian). */
  updateBuffs() {
    const a = this.abilities;
    let text = '';
    if (a.sprintT > 0) text += '<span>💨 Esprint</span>';
    if (a.partyT > 0) text += '<span>🎉 Súper salto</span>';
    if (a.sniffT > 0) text += '<span>👃 Olfato</span>';
    if (this.player.carrying) text += '<span>💪 Cargando (E para soltar)</span>';
    this.hud.setBuffs(text);
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
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms)),
  ]);
}

/** Libera la geometría propia de un mundo que ya no se usa (los materiales compartidos se conservan). */
function disposeWorld(world) {
  world.group.traverse((o) => { if (o.geometry && !o.isSprite) o.geometry.dispose(); });
}
