// Tienda de Ropa de Cheila: catálogo por ranuras, probador 3D en vivo con el perro
// del jugador, compra con galletas y equipar/quitar. Navegable con ratón, táctil,
// teclado, mando o el móvil en Modo TV (flechas, Intro, Q/E para pestañas, Esc).
import * as THREE from 'three';
import { SLOTS, COSMETICS, COSMETIC_BY_ID } from '../cosmetics/CosmeticData.js';
import { buildCosmetic } from '../cosmetics/CosmeticModels.js';
import { DogAvatar } from '../player/DogAvatar.js';

const SAYINGS = {
  hello: '¡Hola, cielo! Pruébate lo que quieras: ¡el probador es gratis! 💖',
  buy: ['¡Te queda de maravilla! ✨', '¡Qué estilazo! 💜', '¡Tu perro es el más fashion del castillo! 🌟'],
  poor: '¡Uy! Te faltan galletas. Búscalas por el castillo o pásate por la pastelería de Chalai. 🍪',
  reward: 'Ese no se vende: es una recompensa especial. ¡Pregunta a quien lo regala!',
};

export class Shop {
  constructor() {
    this.root = document.getElementById('shop');
    this.grid = document.getElementById('shop-grid');
    this.tabs = document.getElementById('shop-tabs');
    this.say = document.getElementById('shop-say');
    this.cookiesEl = document.getElementById('shop-cookies');
    this.canvas = document.getElementById('shop-canvas');
    this.equippedEl = document.getElementById('shop-equipped');
    this.isOpen = false;
    this.slot = 'head';
    this.focus = 0;
    this.thumbs = new Map();
    this.three = null;
    this.onEquip = null; // (equipped) => void
    this.onClose = null;
    document.getElementById('shop-close').addEventListener('click', () => this.close());
    this.root.addEventListener('keydown', (e) => this.onKey(e));
    this.buildTabs();
  }

  // ------------------------------------------------------------ 3D
  initThree() {
    if (this.three) return;
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#ffd1e8', 1.6));
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(2, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#b47cff', 1.2);
    rim.position.set(-3, 2, -3);
    scene.add(rim);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
    // Peana redonda pastel.
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.2, 40), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }));
    base.position.y = -0.1;
    scene.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.05, 8, 48), new THREE.MeshStandardMaterial({ color: '#ff8fc8' }));
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    this.three = { renderer, scene, camera, clock: new THREE.Clock(), t: 0, w: 0, h: 0 };
  }

  /**
   * Miniaturas de cada accesorio renderizadas a partir de su modelo 3D.
   * Se hacen de una en una por frame (con un renderer propio) para que la
   * tienda se abra al instante; mientras tanto se muestra el emoji.
   */
  renderThumbsAsync() {
    if (this.thumbJob || this.thumbs.size >= COSMETICS.length) return;
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setSize(size, size, false);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#ffd1e8', 1.8));
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(2, 3, 4);
    scene.add(key);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
    const queue = COSMETICS.filter((c) => !this.thumbs.has(c.id));
    const step = () => {
      const item = queue.shift();
      if (!item) {
        renderer.dispose();
        renderer.forceContextLoss();
        this.thumbJob = null;
        return;
      }
      const g = buildCosmetic(item.id);
      if (item.slot === 'back') {
        // Capas y alas: vistas desde arriba y detrás para que se lean bien.
        g.rotation.set(0.9, Math.PI, 0);
      } else {
        g.rotation.y = -0.5;
        g.rotation.x = item.slot === 'eyes' ? 0.15 : 0.25;
      }
      scene.add(g);
      const box = new THREE.Box3().setFromObject(g);
      const c = box.getCenter(new THREE.Vector3());
      const r = box.getSize(new THREE.Vector3()).length() * 0.5 || 0.5;
      cam.position.set(c.x, c.y + r * 0.15, c.z + r * 3.3);
      cam.lookAt(c);
      renderer.render(scene, cam);
      const url = canvas.toDataURL('image/png');
      this.thumbs.set(item.id, url);
      scene.remove(g);
      // Sustituir el emoji por la miniatura si la tarjeta está a la vista.
      const card = this.grid.querySelector(`[data-item="${item.id}"] .si-thumb`);
      if (card) card.innerHTML = `<img alt="" src="${url}">`;
      this.thumbJob = requestAnimationFrame(step);
    };
    this.thumbJob = requestAnimationFrame(step);
  }

  setDog(breedId, equipped) {
    const T = this.three;
    if (this.dog) {
      T.scene.remove(this.dog.root);
      this.dog.dispose();
    }
    this.dog = new DogAvatar(breedId);
    this.dog.model.blob.visible = false;
    this.dog.setCosmetics(equipped);
    T.scene.add(this.dog.root);
  }

  // ------------------------------------------------------------ UI
  buildTabs() {
    this.tabs.innerHTML = '';
    for (const s of SLOTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'shop-tab';
      b.dataset.slot = s.id;
      b.innerHTML = `<span class="st-ic">${s.icon}</span><span>${s.name}</span>`;
      b.addEventListener('click', () => this.setSlot(s.id));
      this.tabs.appendChild(b);
    }
  }

  setSlot(slot) {
    this.slot = slot;
    this.focus = 0;
    for (const b of this.tabs.children) b.classList.toggle('active', b.dataset.slot === slot);
    this.renderGrid();
  }

  itemsOfSlot() {
    return COSMETICS.filter((c) => c.slot === this.slot);
  }

  renderGrid() {
    const w = this.wallet;
    this.grid.innerHTML = '';
    this.itemsOfSlot().forEach((item, i) => {
      const owned = w.owned.has(item.id);
      const equipped = w.equipped[item.slot] === item.id;
      const card = document.createElement('div');
      card.className = 'shop-item';
      card.style.setProperty('--item', item.color);
      card.classList.toggle('equipped', equipped);
      card.classList.toggle('focus', i === this.focus);
      card.tabIndex = 0;
      card.dataset.item = item.id;
      const img = this.thumbs.get(item.id);
      card.innerHTML = `
        <div class="si-thumb">${img ? `<img alt="" src="${img}">` : `<span>${item.icon}</span>`}</div>
        <div class="si-name"></div>
        <button type="button" class="si-btn"></button>`;
      card.querySelector('.si-name').textContent = `${item.icon} ${item.name}`;
      const btn = card.querySelector('.si-btn');
      if (equipped) {
        btn.textContent = 'Quitar';
        btn.className = 'si-btn remove';
      } else if (owned) {
        btn.textContent = '¡Ponérmelo!';
        btn.className = 'si-btn equip';
      } else if (item.reward) {
        btn.textContent = `🔒 ${item.reward}`;
        btn.className = 'si-btn locked';
      } else {
        btn.innerHTML = `Comprar · 🍪 ${item.price}`;
        btn.className = `si-btn buy${w.cookies < item.price ? ' poor' : ''}`;
      }
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.focus = i;
        this.action(item);
      });
      card.addEventListener('click', () => {
        this.focus = i;
        this.tryOn(item);
        for (const c of this.grid.children) c.classList.remove('focus');
        card.classList.add('focus');
      });
      this.grid.appendChild(card);
    });
    this.cookiesEl.textContent = String(w.cookies);
    this.renderEquipped();
  }

  renderEquipped() {
    const w = this.wallet;
    this.equippedEl.innerHTML = '';
    for (const s of SLOTS) {
      const id = w.equipped[s.id];
      const chip = document.createElement('span');
      chip.className = `eq-chip${id ? '' : ' empty'}`;
      chip.textContent = id ? COSMETIC_BY_ID[id].icon : s.icon;
      chip.title = id ? COSMETIC_BY_ID[id].name : `${s.name}: nada`;
      this.equippedEl.appendChild(chip);
    }
  }

  /** Probador: muestra el accesorio en el perro sin comprarlo. */
  tryOn(item) {
    const set = { ...this.wallet.equipped, [item.slot]: item.id };
    this.dog?.setCosmetics(set);
    this.trying = item.id;
    this.burst(item.icon, 4);
  }

  action(item) {
    const w = this.wallet;
    if (w.equipped[item.slot] === item.id) {
      w.unequip(item.slot);
      this.talk('¡Hecho! Puedes probarte otra cosa cuando quieras.');
    } else if (w.owned.has(item.id)) {
      w.equip(item.id);
      this.talk(`¡${item.name} puesto! Te sienta genial. 😍`);
      this.burst('✨', 10);
    } else if (item.reward) {
      this.talk(SAYINGS.reward);
      navigator.vibrate?.(30);
    } else if (w.buy(item.id)) {
      w.equip(item.id);
      this.talk(SAYINGS.buy[Math.floor(Math.random() * SAYINGS.buy.length)]);
      this.burst('🎉', 18);
      this.burst('🍪', 6);
      navigator.vibrate?.([20, 40, 20]);
    } else {
      this.talk(SAYINGS.poor);
      this.cookiesEl.parentElement.classList.remove('shake');
      void this.cookiesEl.offsetWidth;
      this.cookiesEl.parentElement.classList.add('shake');
      navigator.vibrate?.(60);
    }
    this.dog?.setCosmetics(w.equipped);
    this.trying = null;
    this.onEquip?.({ ...w.equipped });
    this.renderGrid();
  }

  talk(text) {
    this.say.textContent = text;
  }

  /** Lluvia de emojis (confeti amable, solo CSS). */
  burst(emoji, n) {
    const layer = this.root.querySelector('.shop-confetti');
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.textContent = emoji;
      s.style.left = `${20 + Math.random() * 60}%`;
      s.style.animationDelay = `${Math.random() * 0.3}s`;
      s.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
      layer.appendChild(s);
      setTimeout(() => s.remove(), 1600);
    }
  }

  // ------------------------------------------------------------ ciclo
  open(wallet, breedId) {
    this.wallet = wallet;
    this.initThree();
    this.renderThumbsAsync();
    this.setDog(breedId, wallet.equipped);
    this.talk(SAYINGS.hello);
    this.root.classList.remove('hidden');
    this.isOpen = true;
    this.setSlot(this.slot);
    this.root.focus();
    this.three.clock.getDelta();
    const loop = () => {
      if (!this.isOpen) return;
      this.frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    cancelAnimationFrame(this.raf);
    this.root.classList.add('hidden');
    // Si estaba probando algo sin comprar, se quita.
    this.trying = null;
    this.onClose?.();
  }

  /** Navegación con teclado / mando / móvil en Modo TV. */
  onKey(e) {
    if (!this.isOpen) return;
    const items = this.itemsOfSlot();
    const cols = Math.max(1, Math.round(this.grid.clientWidth / 170));
    const move = (d) => {
      this.focus = (this.focus + d + items.length) % items.length;
      this.tryOn(items[this.focus]);
      this.renderGrid();
    };
    const tab = (d) => {
      const i = SLOTS.findIndex((s) => s.id === this.slot);
      this.setSlot(SLOTS[(i + d + SLOTS.length) % SLOTS.length].id);
    };
    switch (e.key) {
      case 'ArrowRight': move(1); break;
      case 'ArrowLeft': move(-1); break;
      case 'ArrowDown': move(cols); break;
      case 'ArrowUp': move(-cols); break;
      case 'Enter': case ' ': this.action(items[this.focus]); break;
      case 'q': case 'Q': tab(-1); break;
      case 'e': case 'E': case 'Tab': tab(1); break;
      case 'Escape': this.close(); break;
      default: return;
    }
    e.preventDefault();
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
    }
    if (this.dog) {
      this.dog.root.rotation.y = 0.6 + Math.sin(T.t * 0.6) * 0.7;
      this.dog.setGesture(this.dog.breed.gesture);
      this.dog.update(dt, T.t % 9 < 3 ? -1 : 0, 0, 0);
      const ht = this.dog.height * 1.2;
      const dist = (ht * 2.1 + 1.0) / Math.min(1, T.camera.aspect);
      T.camera.position.set(0.6, ht * 0.75 + 0.2, dist);
      T.camera.lookAt(0, ht * 0.45, 0);
    }
    T.renderer.render(T.scene, T.camera);
  }
}
