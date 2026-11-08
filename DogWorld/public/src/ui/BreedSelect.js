// Pantalla de selección de raza: tarjetas interactivas + vista 3D con el perro
// sobre un pedestal haciendo su gesto de personalidad (Rufus ladra y baila…).
// Las razas ocupadas en la sala se marcan y no se pueden elegir (cooperación).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BREEDS, getBreed } from '../breeds/BreedData.js';
import { DogAvatar } from '../player/DogAvatar.js';
import { Effects } from '../world/Effects.js';
import { getMaterials } from '../world/Materials.js';

const REFRESH_MS = 2500;

export class BreedSelect {
  constructor() {
    this.root = document.getElementById('breed-select');
    this.cardsEl = document.getElementById('sel-cards');
    this.canvas = document.getElementById('preview-canvas');
    this.roomEl = document.getElementById('sel-room');
    this.confirmBtn = document.getElementById('sel-confirm');
    this.statusEl = document.getElementById('sel-status');
    this.info = {
      tag: document.getElementById('pv-tag'),
      name: document.getElementById('pv-name'),
      breed: document.getElementById('pv-breed'),
      personality: document.getElementById('pv-personality'),
      abIcon: document.getElementById('pv-ab-icon'),
      abName: document.getElementById('pv-ab-name'),
      abDesc: document.getElementById('pv-ab-desc'),
      stats: document.getElementById('pv-stats'),
    };
    this.isOpen = false;
    this.selected = null;
    this.taken = new Map(); // breedId -> nombre del jugador que la usa
    this.mine = null;
    this.cards = new Map();
    this.avatars = new Map();
    this.portraits = new Map();
    this.three = null;
    this.yawDrag = 0;

    document.getElementById('sel-back').addEventListener('click', () => {
      const cb = this.onBack;
      this.close();
      cb?.();
    });
    this.confirmBtn.addEventListener('click', () => this.confirm());
    this.root.addEventListener('keydown', (e) => this.onKey(e));
    this.bindDrag();
  }

  // ----------------------------------------------------------------- escena 3D
  initThree() {
    if (this.three) return;
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

    scene.add(new THREE.HemisphereLight('#dcecff', '#6a8a3a', 1.3));
    const key = new THREE.DirectionalLight('#fff1d6', 2.8);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
    scene.add(key);
    const rim = new THREE.DirectionalLight('#b47cff', 1.6);
    rim.position.set(-4, 3, -4);
    scene.add(rim);

    // Pedestal de piedra (como en la ilustración) sobre un disco de césped.
    const M = getMaterials();
    const pedestal = new THREE.Group();
    const base = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.35, 2.4, 2, 0.1), M.stoneRough);
    base.position.y = -0.55;
    const mid = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.5, 2.0, 2, 0.1), M.stoneRough);
    mid.position.y = -0.2;
    const top = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.22, 2.3, 2, 0.08), M.stoneRough);
    top.position.y = 0.08 - 0.11;
    for (const m of [base, mid, top]) { m.castShadow = true; m.receiveShadow = true; pedestal.add(m); }
    scene.add(pedestal);
    const grass = new THREE.Mesh(new THREE.CircleGeometry(4, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#6fbf3e', roughness: 1 }));
    grass.position.y = -0.73;
    grass.receiveShadow = true;
    scene.add(grass);
    // Cristal morado flotando detrás.
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0).scale(0.75, 1.8, 0.75), M.crystal);
    crystal.position.set(-1.7, 1.2, -1.2);
    scene.add(crystal);

    // Pedrusco de Goliath para la vista previa.
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), M.rock);
    rock.castShadow = true;

    const effects = new Effects(scene, 300);

    this.three = { renderer, scene, camera, pedestal, crystal, rock, effects, w: 0, h: 0, clock: new THREE.Clock(), t: 0 };
  }

  getAvatar(breedId) {
    let av = this.avatars.get(breedId);
    if (!av) {
      av = new DogAvatar(breedId, this.three.effects);
      av.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      av.model.blob.visible = false;
      av.root.visible = false;
      this.three.scene.add(av.root);
      this.avatars.set(breedId, av);
    }
    return av;
  }

  /** Retratos de las tarjetas renderizados a partir de los modelos 3D reales. */
  renderPortraits() {
    const { renderer, scene, camera, pedestal, crystal } = this.three;
    const size = 192;
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    pedestal.visible = false;
    crystal.visible = false;
    const grass = scene.children.find((o) => o.geometry?.type === 'CircleGeometry');
    if (grass) grass.visible = false;
    for (const b of BREEDS) {
      if (this.portraits.has(b.id)) continue;
      const av = this.getAvatar(b.id);
      for (const other of this.avatars.values()) other.root.visible = other === av;
      av.root.position.set(0, 0, 0);
      av.root.rotation.y = 0.55;
      av.update(0.016, 0, 0, 0);
      const h = av.height;
      camera.position.set(0.15 * h, h * 0.78, h * 2.05 + 0.6);
      camera.lookAt(0, h * 0.6, 0);
      renderer.render(scene, camera);
      this.portraits.set(b.id, renderer.domElement.toDataURL('image/png'));
    }
    pedestal.visible = true;
    crystal.visible = true;
    if (grass) grass.visible = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.three.w = 0; // forzar redimensionado
  }

  // --------------------------------------------------------------- tarjetas
  buildCards() {
    this.cardsEl.innerHTML = '';
    this.cards.clear();
    for (const b of BREEDS) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'dog-card';
      card.setAttribute('role', 'option');
      card.style.setProperty('--accent', b.accent);
      card.dataset.breed = b.id;
      card.innerHTML = `
        <img alt="" src="${this.portraits.get(b.id) || ''}" />
        <span class="dc-name"></span>
        <span class="dc-breed"></span>
        <span class="dc-ability"></span>`;
      card.querySelector('.dc-name').textContent = b.name;
      card.querySelector('.dc-breed').textContent = b.breed;
      card.querySelector('.dc-ability').textContent = `${b.ability.icon} ${b.ability.name}`;
      // Un toque solo selecciona (y muestra el 3D); se confirma con el botón, doble clic o Intro.
      card.addEventListener('click', () => this.select(b.id));
      card.addEventListener('dblclick', () => this.confirm());
      this.cardsEl.appendChild(card);
      this.cards.set(b.id, card);
    }
  }

  refreshCards() {
    for (const [id, card] of this.cards) {
      const by = this.taken.get(id);
      const taken = Boolean(by) && id !== this.mine;
      card.classList.toggle('taken', taken);
      card.classList.toggle('mine', id === this.mine);
      card.dataset.taken = taken ? `Con ${by}` : '';
      card.setAttribute('aria-selected', String(id === this.selected));
      card.setAttribute('aria-disabled', String(taken));
    }
    this.updateConfirm();
  }

  isAvailable(id) {
    return !this.taken.has(id) || id === this.mine;
  }

  select(id) {
    const b = getBreed(id);
    this.selected = b.id;
    this.root.style.setProperty('--accent', b.accent);
    const i = this.info;
    i.tag.textContent = b.tagline;
    i.name.textContent = b.name;
    i.breed.textContent = b.breed;
    i.personality.textContent = b.personality;
    i.abIcon.textContent = b.ability.icon;
    i.abName.textContent = b.ability.name;
    i.abDesc.textContent = b.ability.description;
    const bar = (label, v) => `<span>${label}</span><span class="pv-bar"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></span>`;
    i.stats.innerHTML = bar('Velocidad', (b.stats.speed - 0.7) / 0.5)
      + bar('Salto', (b.stats.jump - 0.75) / 0.45)
      + bar('Fuerza', b.stats.strength)
      + bar('Tamaño', (b.stats.scale - 0.5) / 0.9);

    if (this.three) {
      for (const av of this.avatars.values()) av.root.visible = false;
      const av = this.getAvatar(b.id);
      av.root.visible = true;
      av.setGesture(b.gesture);
      av.update(0, -1, 0, 0);
      this.yawDrag = 0;
      // Accesorio para el gesto de Goliath.
      const { rock } = this.three;
      rock.parent?.remove(rock);
      if (b.id === 'goliath') {
        av.model.chest.add(rock);
        const y = av.model.head.position.y + b.model.head.h * 0.5 + 0.55;
        rock.position.set(0, y, 0.15);
        av.ctx.prop = rock;
        av.ctx.propBaseY = y;
      }
      this.three.effects.emit('sparkle', 0, av.height * 0.6, 0);
    }
    this.refreshCards();
  }

  updateConfirm() {
    const b = getBreed(this.selected);
    const ok = this.isAvailable(b.id);
    this.confirmBtn.disabled = !ok;
    this.confirmBtn.textContent = ok
      ? (b.id === this.mine ? `Seguir con ${b.name}` : `¡Jugar con ${b.name}!`)
      : `${b.name} ya está con ${this.taken.get(b.id)}`;
  }

  setTaken(players) {
    this.taken.clear();
    for (const p of players || []) this.taken.set(p.b, p.name);
    this.refreshCards();
  }

  setStatus(text) {
    this.statusEl.textContent = text || '';
  }

  // --------------------------------------------------------------- ciclo
  /**
   * opts: { room, players:[{name,b}], current, mine, refresh: async () => players,
   *         onConfirm: async (breedId) => void, onBack: () => void }
   */
  open(opts) {
    this.initThree();
    if (this.portraits.size < BREEDS.length) this.renderPortraits();
    if (!this.cards.size) this.buildCards();
    this.onConfirm = opts.onConfirm;
    this.onBack = opts.onBack;
    this.refresh = opts.refresh;
    this.mine = opts.mine || null;
    this.roomEl.textContent = opts.room ? `Sala ${opts.room}` : 'Modo local';
    this.setStatus('');
    this.setTaken(opts.players);

    this.root.classList.remove('hidden');
    this.isOpen = true;
    let first = opts.current && this.isAvailable(opts.current) ? opts.current : null;
    if (!first) first = BREEDS.find((b) => this.isAvailable(b.id))?.id || BREEDS[0].id;
    this.select(first);
    this.cards.get(first)?.focus({ preventScroll: false });

    this.three.clock.getDelta();
    this.loop = () => {
      if (!this.isOpen) return;
      this.frame();
      this.raf = requestAnimationFrame(this.loop);
    };
    this.raf = requestAnimationFrame(this.loop);

    clearInterval(this.refreshTimer);
    if (this.refresh) {
      this.refreshTimer = setInterval(async () => {
        try { this.setTaken(await this.refresh()); } catch { /* sin conexión */ }
      }, REFRESH_MS);
    }
  }

  close() {
    this.isOpen = false;
    cancelAnimationFrame(this.raf);
    clearInterval(this.refreshTimer);
    this.root.classList.add('hidden');
  }

  async confirm() {
    if (!this.isAvailable(this.selected)) return;
    this.confirmBtn.disabled = true;
    this.setStatus('Entrando…');
    try {
      await this.onConfirm?.(this.selected);
    } catch (err) {
      if (err?.taken) this.setTaken(err.taken.map((b) => ({ b, name: 'otro jugador' })));
      this.setStatus(err?.message || 'No se pudo entrar');
    } finally {
      this.updateConfirm();
    }
  }

  onKey(e) {
    if (!this.isOpen) return;
    const ids = BREEDS.map((b) => b.id);
    const i = ids.indexOf(this.selected);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const next = ids[(i + step + ids.length) % ids.length];
      this.select(next);
      this.cards.get(next).focus();
      e.preventDefault();
    } else if (e.key === 'Enter' && e.target.classList?.contains('dog-card')) {
      e.preventDefault();
      this.confirm();
    } else if (e.key === 'Escape') {
      document.getElementById('sel-back').click();
    }
  }

  bindDrag() {
    let last = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      last = e.clientX;
      try { this.canvas.setPointerCapture(e.pointerId); } catch { /* */ }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (last === null) return;
      this.yawDrag += (e.clientX - last) * 0.012;
      last = e.clientX;
    });
    const end = () => { last = null; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  frame() {
    const T = this.three;
    const dt = Math.min(T.clock.getDelta(), 0.05);
    T.t += dt;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w && h && (w !== T.w || h !== T.h)) {
      T.w = w; T.h = h;
      T.renderer.setSize(w, h, false);
      T.camera.aspect = w / h;
      T.camera.updateProjectionMatrix();
      T.effects.setViewportHeight(h * T.renderer.getPixelRatio());
    }
    const av = this.avatars.get(this.selected);
    if (av) {
      // Giro suave para lucir al perro + giro manual arrastrando.
      // Pedestal a escala del perro y encuadre que incluye su gesto (a dos patas, pedrusco…).
      const ps = 0.5 + 0.45 * av.breed.stats.scale;
      T.pedestal.scale.setScalar(ps);
      av.root.position.y = 0.08 * ps;
      av.root.rotation.y = 0.5 + Math.sin(T.t * 0.5) * 0.35 + this.yawDrag;
      av.update(dt, -1, 0, 0);
      const tall = { goliathLift: 1.7, rufusDance: 1.35, blizzardHowl: 1.35 }[av.breed.gesture] || 1.1;
      const ht = av.height * tall;
      const aspect = Math.max(0.6, Math.min(1.6, T.camera.aspect));
      const dist = (ht * 2.2 + 0.9) / Math.min(1, aspect);
      T.camera.position.set(Math.sin(0.2) * dist, ht * 0.62 + 0.25, Math.cos(0.2) * dist);
      T.camera.lookAt(0, ht * 0.46, 0);
    }
    T.crystal.rotation.y += dt;
    T.crystal.position.y = 1.2 + Math.sin(T.t * 1.5) * 0.1;
    T.effects.update(dt);
    T.renderer.render(T.scene, T.camera);
  }
}
