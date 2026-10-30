/* PokerVegasPro — vista 3D inmersiva con Three.js (r128, build global).
 * Pinta mesa, crupier, cartas y fichas en WebGL; los asientos, el bote y las etiquetas siguen siendo
 * el HUD DOM de TableView, posicionado proyectando las coordenadas 3D a pantalla.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const U = PVP.util;

  /* ---------- micro-tweens (sin dependencias) ---------- */
  const EASE = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  };

  class Tweens {
    constructor() { this.list = []; }
    to(obj, props, dur, opts) {
      opts = opts || {};
      const keys = Object.keys(props);
      this.list = this.list.filter((t) => !(t.obj === obj && t.keys.some((k) => keys.includes(k))));
      this.list.push({
        obj, keys, to: props, from: null, dur: Math.max(1, dur * 1000), delay: (opts.delay || 0) * 1000,
        ease: EASE[opts.ease || 'out'], onDone: opts.onDone, start: performance.now(),
      });
    }
    update(now) {
      if (!this.list.length) return;
      const done = [];
      for (const t of this.list) {
        const el = now - t.start - t.delay;
        if (el < 0) continue;
        if (!t.from) { t.from = {}; for (const k of t.keys) t.from[k] = t.obj[k]; }
        const p = Math.min(1, el / t.dur);
        const e = t.ease(p);
        for (const k of t.keys) t.obj[k] = t.from[k] + (t.to[k] - t.from[k]) * e;
        if (p >= 1) done.push(t);
      }
      if (done.length) {
        this.list = this.list.filter((t) => !done.includes(t));
        for (const t of done) if (t.onDone) t.onDone();
      }
    }
    clear() { this.list = []; }
  }

  /* ---------- texturas generadas en canvas ---------- */
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function cardFaceCanvas(c, deck) {
    const cv = canvas(256, 360);
    const g = cv.getContext('2d');
    const info = PVP.Cards.cardInfo(c);
    let bg = '#fbfaf6', ink = info.red ? '#c1121f' : '#141418';
    if (deck.face === 'dark') { bg = '#17171c'; ink = info.red ? '#ff4d5e' : '#f1f1f1'; }
    if (deck.face === 'neon') { bg = '#0b0614'; ink = info.red ? '#ff2bd6' : '#00f0ff'; }
    roundRect(g, 4, 4, 248, 352, 22);
    if (deck.face === 'gold') {
      const gr = g.createLinearGradient(0, 0, 256, 360);
      gr.addColorStop(0, '#fff6d8'); gr.addColorStop(0.5, '#ffe9a8'); gr.addColorStop(1, '#f4d27a');
      g.fillStyle = gr;
      ink = info.red ? '#9b1020' : '#3a2606';
    } else if (deck.face === 'holo') {
      const gr = g.createLinearGradient(0, 0, 256, 360);
      gr.addColorStop(0, '#f3fbff'); gr.addColorStop(0.35, '#f8eaff'); gr.addColorStop(0.7, '#e8fff6'); gr.addColorStop(1, '#fff3e6');
      g.fillStyle = gr;
    } else g.fillStyle = bg;
    g.fill();
    g.lineWidth = deck.face === 'gold' ? 8 : 4;
    g.strokeStyle = deck.face === 'gold' ? '#c9962a' : deck.face === 'neon' ? ink : 'rgba(0,0,0,.18)';
    g.stroke();
    if (deck.face === 'light' && deck.tier !== 'free') {
      // Cartas épicas: esquina de color con el tono de la baraja.
      const gr = g.createLinearGradient(0, 0, 256, 0);
      gr.addColorStop(0, deck.back[0]); gr.addColorStop(1, deck.back[1]);
      g.fillStyle = gr;
      g.globalAlpha = 0.9;
      g.fillRect(14, 330, 228, 10);
      g.globalAlpha = 1;
    }
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 64px Georgia, serif';
    g.fillText(info.rank, 44, 52);
    g.font = '50px Georgia, serif';
    g.fillText(info.symbol, 44, 108);
    g.font = '150px Georgia, serif';
    g.fillText(info.symbol, 128, 200);
    g.save();
    g.translate(212, 308);
    g.rotate(Math.PI);
    g.font = 'bold 64px Georgia, serif';
    g.fillText(info.rank, 0, 0);
    g.restore();
    return cv;
  }

  function cardBackCanvas(deck) {
    const cv = canvas(256, 360);
    const g = cv.getContext('2d');
    roundRect(g, 4, 4, 248, 352, 22);
    const gr = g.createLinearGradient(0, 0, 256, 360);
    gr.addColorStop(0, deck.back[0]); gr.addColorStop(1, deck.back[1]);
    g.fillStyle = gr;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(255,255,255,.16)';
    g.lineWidth = 2;
    for (let i = -360; i < 620; i += 22) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 360, 360); g.stroke();
      g.beginPath(); g.moveTo(i + 360, 0); g.lineTo(i, 360); g.stroke();
    }
    g.restore();
    roundRect(g, 20, 20, 216, 320, 14);
    g.lineWidth = 5;
    g.strokeStyle = deck.face === 'neon' ? '#fff' : '#f3d27a';
    g.stroke();
    g.fillStyle = deck.face === 'neon' ? '#fff' : '#f3d27a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '110px Georgia, serif';
    g.fillText('♠', 128, 180);
    return cv;
  }

  function feltCanvas(t) {
    const cv = canvas(1024, 600);
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(512, 300, 40, 512, 300, 600);
    gr.addColorStop(0, t.felt[0]); gr.addColorStop(1, t.felt[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 600);
    // Grano del tapete.
    const img = g.getImageData(0, 0, 1024, 600);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = t.accent;
    g.globalAlpha = 0.35;
    g.lineWidth = 4;
    g.beginPath(); g.ellipse(512, 300, 330, 180, 0, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 0.18;
    g.fillStyle = t.accent;
    g.font = 'bold 44px Oswald, Arial Narrow, sans-serif';
    g.textAlign = 'center';
    g.fillText('POKERVEGASPRO', 512, 410);
    g.globalAlpha = 1;
    return cv;
  }

  function gradientCanvas(top, bottom) {
    const cv = canvas(16, 512);
    const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 512);
    return cv;
  }

  function glowCanvas(color) {
    const cv = canvas(64, 64);
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color); gr.addColorStop(0.35, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return cv;
  }

  /* ---------- vista ---------- */
  const CARD_W = 0.56, CARD_H = 0.8;

  class Table3D {
    constructor(host, overlay, opts) {
      const THREE = root.THREE;
      this.T = THREE;
      this.host = host;
      this.overlay = overlay;
      this.opts = Object.assign({ heroSeat: 0, camera: 'player' }, opts);
      this.tweens = new Tweens();
      this.cards = new Map();
      this.texCache = new Map();
      this.peek = false;
      this.snap = null;
      this.dealCtx = null;

      const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }));
      r.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
      r.outputEncoding = THREE.sRGBEncoding;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.05;
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      r.domElement.className = 't3d-canvas';
      host.insertBefore(r.domElement, host.firstChild);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
      this.lookAt = new THREE.Vector3();
      this.camPos = new THREE.Vector3();
      this.pointer = { x: 0, y: 0 };
      this._v = new THREE.Vector3();

      this.cardGeo = new THREE.BoxGeometry(CARD_W, 0.012, CARD_H);
      this.edgeMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.6 });
      this.chipGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.055, 28);
      this.chipMats = new Map();

      this._buildLights();
      this.dynamic = new THREE.Group();
      this.scene.add(this.dynamic);
      this.betGroups = [];
      this.potGroup = new THREE.Group();
      this.dynamic.add(this.potGroup);

      this.setOrientation(this.opts.orientation || 'h', true);
      this.setTable(this.opts.table);
      this._buildDealer();

      this._onPointer = (e) => {
        const rect = host.getBoundingClientRect();
        this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      };
      host.addEventListener('pointermove', this._onPointer);
      this._resize = () => this.resize();
      if (root.ResizeObserver) { this._ro = new ResizeObserver(this._resize); this._ro.observe(host); }
      else root.addEventListener('resize', this._resize);
      this.resize();

      this._loop = this._loop.bind(this);
      this._raf = requestAnimationFrame(this._loop);
    }

    /* ----- escena estática ----- */

    _buildLights() {
      const THREE = this.T;
      this.hemi = new THREE.HemisphereLight(0xfff1dd, 0x1a0f18, 0.55);
      this.scene.add(this.hemi);
      const spot = (this.spot = new THREE.SpotLight(0xffe2b8, 1.6, 40, 0.75, 0.65, 1.2));
      spot.position.set(0, 13, 2);
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.0004;
      this.scene.add(spot, spot.target);
      this.accentLight = new THREE.PointLight(0xe8b54a, 0.8, 30, 2);
      this.accentLight.position.set(0, 4, -8);
      this.scene.add(this.accentLight);
    }

    _ellipseDims() {
      return this.orientation === 'v' ? { a: 2.75, b: 4.6 } : { a: 5.0, b: 2.75 };
    }

    _buildTable() {
      const THREE = this.T;
      if (this.tableGroup) { this.scene.remove(this.tableGroup); disposeTree(this.tableGroup); }
      const g = (this.tableGroup = new THREE.Group());
      const { a, b } = this._ellipseDims();
      const t = this.table;

      // Tapete
      const feltShape = new THREE.Shape();
      feltShape.absellipse(0, 0, a, b, 0, Math.PI * 2, false, 0);
      const feltGeo = new THREE.ExtrudeGeometry(feltShape, { depth: 0.25, bevelEnabled: false, curveSegments: 72 });
      feltGeo.rotateX(-Math.PI / 2);
      remapUV(feltGeo, a, b);
      const feltTex = new THREE.CanvasTexture(feltCanvas(t));
      feltTex.encoding = THREE.sRGBEncoding;
      feltTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      this.feltMat = new THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.92, metalness: 0 });
      const felt = new THREE.Mesh(feltGeo, this.feltMat);
      felt.position.y = -0.25;
      felt.receiveShadow = true;
      g.add(felt);

      // Ribete acolchado
      const rimShape = new THREE.Shape();
      rimShape.absellipse(0, 0, a + 0.62, b + 0.62, 0, Math.PI * 2, false, 0);
      const hole = new THREE.Path();
      hole.absellipse(0, 0, a, b, 0, Math.PI * 2, true, 0);
      rimShape.holes.push(hole);
      const rimGeo = new THREE.ExtrudeGeometry(rimShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 5, curveSegments: 72 });
      rimGeo.rotateX(-Math.PI / 2);
      const rimMat = new THREE.MeshStandardMaterial({
        color: t.three.rim, roughness: t.id === 'royale' ? 0.25 : 0.5, metalness: t.id === 'royale' ? 0.85 : t.id === 'space' ? 0.6 : 0.15,
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.y = -0.14;
      rim.castShadow = true;
      rim.receiveShadow = true;
      g.add(rim);

      // Filo emisivo (oro, neón, hielo…)
      const pts = [];
      for (let i = 0; i < 128; i++) {
        const ang = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(ang) * (a + 0.05), 0.08, Math.sin(ang) * (b + 0.05)));
      }
      const trimGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 256, 0.025, 8, true);
      const trim = new THREE.Mesh(trimGeo, new THREE.MeshStandardMaterial({
        color: t.three.accent, emissive: t.three.accent, emissiveIntensity: t.neon ? 2.2 : 0.6, metalness: 0.8, roughness: 0.3,
      }));
      g.add(trim);

      // Pedestal y suelo
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.1, 3.4, 40), new THREE.MeshStandardMaterial({ color: 0x0c0a0a, roughness: 0.4, metalness: 0.5 }));
      ped.position.y = -1.95;
      g.add(ped);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: t.three.floor, roughness: 0.85, metalness: 0.1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -3.6;
      floor.receiveShadow = true;
      g.add(floor);

      this.scene.add(g);
    }

    _buildFx() {
      const THREE = this.T;
      if (this.fxGroup) { this.scene.remove(this.fxGroup); disposeTree(this.fxGroup); }
      const g = (this.fxGroup = new THREE.Group());
      const t = this.table;
      this.fxUpdate = null;
      const points = (count, spread, color, size, yMin, yMax) => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2, rad = 8 + Math.random() * spread;
          pos[i * 3] = Math.cos(ang) * rad;
          pos[i * 3 + 1] = U.rand(yMin, yMax);
          pos[i * 3 + 2] = Math.sin(ang) * rad - 4;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const tex = new THREE.CanvasTexture(glowCanvas(color));
        const mat = new THREE.PointsMaterial({ size, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        const p = new THREE.Points(geo, mat);
        g.add(p);
        return p;
      };

      switch (t.fx) {
        case 'stars': {
          const p = points(900, 30, '#cfe6ff', 0.35, -6, 24);
          this.fxUpdate = (dt) => { p.rotation.y += dt * 0.01; };
          break;
        }
        case 'bubbles': {
          const p = points(260, 14, '#aef6ff', 0.25, -4, 12);
          const arr = p.geometry.attributes.position.array;
          this.fxUpdate = (dt) => {
            for (let i = 1; i < arr.length; i += 3) { arr[i] += dt * 0.9; if (arr[i] > 12) arr[i] = -4; }
            p.geometry.attributes.position.needsUpdate = true;
          };
          break;
        }
        case 'fireflies': {
          const p = points(120, 10, '#d8ff7a', 0.28, -1, 6);
          this.fxUpdate = (dt, time) => { p.position.y = Math.sin(time * 0.6) * 0.3; p.rotation.y += dt * 0.03; };
          break;
        }
        case 'clouds': {
          const tex = new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,.9)'));
          for (let i = 0; i < 26; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false }));
            const sc = U.rand(4, 9);
            s.scale.set(sc * 1.8, sc, 1);
            s.position.set(U.rand(-30, 30), U.rand(-8, -3), U.rand(-30, 5));
            g.add(s);
          }
          this.fxUpdate = (dt) => { g.children.forEach((s) => { s.position.x += dt * 0.4; if (s.position.x > 32) s.position.x = -32; }); };
          break;
        }
        case 'grid': {
          const grid = new THREE.GridHelper(80, 60, t.three.accent, 0x00f0ff);
          grid.position.y = -3.55;
          grid.material.transparent = true;
          grid.material.opacity = 0.45;
          g.add(grid);
          points(200, 20, '#ff2bd6', 0.3, 2, 14);
          break;
        }
        case 'marquee': {
          const { a, b } = this._ellipseDims();
          const bulbs = [];
          const geo = new THREE.SphereGeometry(0.055, 10, 8);
          for (let i = 0; i < 48; i++) {
            const ang = (i / 48) * Math.PI * 2;
            const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffe6a0, emissive: 0xffc94a, emissiveIntensity: 1 }));
            m.position.set(Math.cos(ang) * (a + 0.34), 0.2, Math.sin(ang) * (b + 0.34));
            g.add(m);
            bulbs.push(m);
          }
          this.fxUpdate = (dt, time) => {
            const k = Math.floor(time * 4);
            bulbs.forEach((m, i) => { m.material.emissiveIntensity = (i + k) % 3 === 0 ? 2.2 : 0.4; });
          };
          points(220, 26, '#ffcf6a', 0.6, 0, 16);
          break;
        }
        case 'waves':
          points(80, 22, '#ffd59a', 0.5, 0, 10);
          break;
        default:
          points(260, 26, '#ffbf6a', 0.7, -1, 14); // bokeh de luces de Las Vegas
      }
      this.scene.add(g);
    }

    _buildDealer() {
      const THREE = this.T;
      const d = (this.dealer = new THREE.Group());
      const black = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.55, metalness: 0.1 });
      const satin = new THREE.MeshStandardMaterial({ color: 0x24242b, roughness: 0.25, metalness: 0.3 });
      const white = new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.6 });
      const skin = new THREE.MeshStandardMaterial({ color: 0xe9b995, roughness: 0.7 });
      const hair = new THREE.MeshStandardMaterial({ color: 0x23160c, roughness: 0.45, metalness: 0.1 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xe8b54a, roughness: 0.3, metalness: 0.9 });

      // Torso: perfil girado (chaqueta entallada)
      const prof = [[0, 0], [0.82, 0], [0.86, 0.5], [0.9, 1.05], [0.98, 1.38], [0.9, 1.55], [0.55, 1.7], [0.2, 1.76], [0, 1.77]]
        .map(([x, y]) => new THREE.Vector2(x, y));
      const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), black);
      torso.scale.set(1, 1, 0.58);
      torso.castShadow = true;
      d.add(torso);

      // Camisa, solapas y pajarita
      const vShape = new THREE.Shape();
      vShape.moveTo(-0.26, 1.72); vShape.lineTo(0.26, 1.72); vShape.lineTo(0, 0.7); vShape.closePath();
      const shirt = new THREE.Mesh(new THREE.ShapeGeometry(vShape), white);
      shirt.position.z = 0.505;
      d.add(shirt);
      for (const side of [-1, 1]) {
        const lap = new THREE.Shape();
        lap.moveTo(side * 0.26, 1.72); lap.lineTo(side * 0.42, 1.6); lap.lineTo(side * 0.08, 0.72); lap.lineTo(0, 0.7); lap.closePath();
        const m = new THREE.Mesh(new THREE.ShapeGeometry(lap), satin);
        m.position.z = 0.51;
        d.add(m);
        const bow = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), black);
        bow.rotation.z = side * Math.PI / 2;
        bow.position.set(side * 0.1, 1.66, 0.53);
        d.add(bow);
      }
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.02), gold);
      badge.position.set(0.42, 1.22, 0.47);
      badge.rotation.y = 0.35;
      d.add(badge);

      // Cabeza
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.25, 16), skin);
      neck.position.y = 1.85;
      d.add(neck);
      const head = (this.dealerHead = new THREE.Group());
      head.position.y = 2.28;
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 24), skin);
      skull.scale.set(0.92, 1.12, 0.98);
      skull.castShadow = true;
      head.add(skull);
      const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.375, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
      hairMesh.scale.set(0.95, 0.9, 1.02);
      hairMesh.position.set(0, 0.07, -0.02);
      hairMesh.rotation.x = -0.2;
      head.add(hairMesh);
      this.eyes = [];
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: 0x1a120c }));
        eye.position.set(side * 0.12, 0.05, 0.32);
        head.add(eye);
        this.eyes.push(eye);
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), skin);
        ear.scale.set(0.5, 1, 0.8);
        ear.position.set(side * 0.33, 0, 0);
        head.add(ear);
      }
      const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8a3b2e }));
      smile.position.set(0, -0.16, 0.32);
      smile.rotation.z = Math.PI;
      head.add(smile);
      d.add(head);

      // Brazos: hombro → antebrazo → mano con puño blanco
      const makeArm = (side) => {
        const shoulder = new THREE.Group();
        shoulder.position.set(side * 0.85, 1.45, 0);
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.8, 16), black);
        upper.position.y = -0.4;
        shoulder.add(upper);
        const elbow = new THREE.Group();
        elbow.position.y = -0.8;
        const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.75, 16), black);
        fore.position.y = -0.37;
        elbow.add(fore);
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.1, 16), white);
        cuff.position.y = -0.75;
        elbow.add(cuff);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skin);
        hand.scale.set(1, 1.2, 0.7);
        hand.position.y = -0.88;
        elbow.add(hand);
        shoulder.add(elbow);
        shoulder.rotation.x = -0.9;
        shoulder.rotation.z = side * 0.25;
        elbow.rotation.x = -0.9;
        d.add(shoulder);
        return { shoulder, elbow, hand };
      };
      this.armL = makeArm(-1);
      this.armR = makeArm(1);
      // Baraja en la mano izquierda
      const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(CARD_W * 0.7, 0.12, CARD_H * 0.7), new THREE.MeshStandardMaterial({ color: 0xa3132b, roughness: 0.5 }));
      deckMesh.position.set(0, -0.92, 0.12);
      deckMesh.rotation.x = 0.9;
      this.armL.elbow.add(deckMesh);

      d.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(d);
      this._placeDealer();
    }

    _placeDealer() {
      if (!this.dealer) return;
      const { b } = this._ellipseDims();
      this.dealer.position.set(0, -1.15, -b - 1.05);
      this.dealer.scale.setScalar(this.orientation === 'v' ? 1.05 : 1.15);
    }

    _dealerHand() {
      const { b } = this._ellipseDims();
      return { x: 0.3, y: 0.55, z: -b + 0.25 };
    }

    /* ----- configuración ----- */

    setTable(t) {
      const THREE = this.T;
      this.table = t;
      const bg = new THREE.CanvasTexture(gradientCanvas(t.bg[0], t.bg[1]));
      bg.encoding = THREE.sRGBEncoding;
      if (this.scene.background && this.scene.background.dispose) this.scene.background.dispose();
      this.scene.background = bg;
      this.scene.fog = new THREE.Fog(t.three.fog, 16, 48);
      this.accentLight.color.setHex(t.three.accent);
      this.accentLight.intensity = t.neon ? 2.2 : 0.9;
      this.hemi.intensity = t.id === 'balloon' || t.id === 'beach' ? 0.85 : 0.55;
      this._buildTable();
      this._buildFx();
    }

    setDeck() {
      for (const tex of this.texCache.values()) tex.dispose();
      this.texCache.clear();
      for (const m of this.cards.values()) this._applyCardMaterials(m, m.userData.c);
    }

    setOrientation(o, silent) {
      this.orientation = o === 'v' ? 'v' : 'h';
      if (silent) return;
      this._buildTable();
      this._buildFx();
      this._placeDealer();
      for (const m of this.cards.values()) this._removeCard(m, true);
      this.cards.clear();
      this.resize();
      if (this.snap) this.sync(this.snap, false);
    }

    setCamera(preset) {
      this.opts.camera = preset;
      this.resize();
    }

    resize() {
      const w = this.host.clientWidth, h = this.host.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h, false);
      this.renderer.domElement.style.width = w + 'px';
      this.renderer.domElement.style.height = h + 'px';
      // Reserva inferior para la barra de acciones: la mesa se desplaza hacia arriba.
      this.reserve = parseFloat(getComputedStyle(this.host).getPropertyValue('--reserve')) || 0;
      this.camera.aspect = w / h;
      this.camera.setViewOffset(w, h, 0, this.reserve * 0.5, w, h);
      this.camera.updateProjectionMatrix();
      this._targetCamera(true);
    }

    _targetCamera(instant) {
      const v = this.orientation === 'v';
      const presets = {
        player: v ? { p: [0, 10.5, 9.2], l: [0, 0, 0.5] } : { p: [0, 7.6, 9.4], l: [0, -0.2, 0.45] },
        top: v ? { p: [0, 15.5, 2.2], l: [0, 0, 0.3] } : { p: [0, 14, 2.4], l: [0, 0, 0.3] },
        cinema: v ? { p: [7, 6.5, 9], l: [0, 0.2, 0] } : { p: [8.5, 5.2, 8], l: [0, 0.2, 0] },
      };
      const pr = presets[this.opts.camera] || presets.player;
      // Si la pantalla es más estrecha que la mesa, alejar la cámara para que quepa.
      const ideal = v ? 0.78 : 1.65;
      const h = this.host.clientHeight || 1;
      const k = Math.max(1, Math.pow(ideal / this.camera.aspect, 0.85)) * Math.pow(h / Math.max(1, h - (this.reserve || 0)), 0.8);
      const target = { x: pr.p[0] * k, y: pr.p[1] * k, z: pr.p[2] * k };
      this.lookAt.set(pr.l[0], pr.l[1], pr.l[2]);
      if (instant) this.camPos.set(target.x, target.y, target.z);
      else this.tweens.to(this.camPos, target, 1.2, { ease: 'inOut' });
    }

    /* ----- cartas ----- */

    _texture(key, make) {
      let tex = this.texCache.get(key);
      if (!tex) {
        tex = new this.T.CanvasTexture(make());
        tex.encoding = this.T.sRGBEncoding;
        tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.texCache.set(key, tex);
      }
      return tex;
    }

    _applyCardMaterials(mesh, c) {
      const THREE = this.T;
      const deck = PVP.Catalog.deck(this.overlay.opts.deck);
      const back = this._texture('back:' + deck.id, () => cardBackCanvas(deck));
      const front = c >= 0 ? this._texture('f:' + deck.id + ':' + c, () => cardFaceCanvas(c, deck)) : back;
      const lux = deck.tier === 'elite';
      const frontMat = new THREE.MeshStandardMaterial({ map: front, roughness: lux ? 0.3 : 0.55, metalness: deck.face === 'gold' ? 0.35 : 0 });
      const backMat = new THREE.MeshStandardMaterial({
        map: back, roughness: lux ? 0.25 : 0.5, metalness: deck.id === 'gold' ? 0.6 : 0.05,
        emissive: deck.id === 'neon' || deck.id === 'holo' ? 0xffffff : 0x000000, emissiveMap: deck.id === 'neon' || deck.id === 'holo' ? back : null,
        emissiveIntensity: deck.id === 'neon' ? 0.55 : 0.25,
      });
      if (mesh.material && Array.isArray(mesh.material)) { mesh.material[2].dispose(); mesh.material[3].dispose(); }
      mesh.material = [this.edgeMat, this.edgeMat, frontMat, backMat, this.edgeMat, this.edgeMat];
      mesh.userData.c = c;
      mesh.userData.holo = deck.id === 'holo';
    }

    _newCard(c) {
      const m = new this.T.Mesh(this.cardGeo, null);
      this._applyCardMaterials(m, c);
      m.castShadow = true;
      this.dynamic.add(m);
      return m;
    }

    _removeCard(m, instant) {
      if (instant) { this.dynamic.remove(m); m.material[2].dispose(); m.material[3].dispose(); return; }
      const h = this._dealerHand();
      this.tweens.to(m.position, { x: h.x * 0.5, y: 0.1, z: h.z + 0.6 }, 0.35, { ease: 'inOut', onDone: () => this._removeCard(m, true) });
    }

    _holeTarget(seat, k, lifted) {
      const { a, b } = this._ellipseDims();
      const ang = (this.overlay.angles[seat] * Math.PI) / 180;
      const hero = seat === this.opts.heroSeat;
      const rr = hero ? 0.66 : 0.72;
      const cx = Math.sin(ang) * a * rr, cz = -Math.cos(ang) * b * rr;
      // Desplazamiento tangencial para separar las dos cartas.
      const tx = Math.cos(ang), tz = Math.sin(ang);
      const off = (0.5 - k) * (hero ? 0.62 : 0.34);
      return {
        x: cx + tx * off, y: 0.02 + k * 0.004 + (lifted ? 0.35 : 0), z: cz + tz * off,
        ry: Math.PI - ang + (k - 0.5) * (hero ? -0.12 : -0.18), rx: lifted ? 0.75 : 0,
      };
    }

    _boardTarget(k) {
      return { x: (k - 2) * (CARD_W + 0.1), y: 0.02, z: this.orientation === 'v' ? 0.1 : 0.05, ry: 0, rx: 0 };
    }

    /** Sincroniza las mallas con el estado del motor. */
    sync(snap, animate) {
      this.snap = snap;
      const hero = this.opts.heroSeat;
      const want = new Map();
      const order = this.dealCtx;
      for (let i = 0; i < snap.seats.length; i++) {
        const p = snap.seats[i];
        if (!p || !p.inHand || !p.cards.length) continue;
        if (p.folded && i !== hero) continue;
        const isHero = i === hero;
        const visible = isHero || p.revealed;
        const up = isHero ? (this.peek || p.revealed || (snap.phase === 'ended' && !p.folded)) : p.revealed;
        p.cards.forEach((c, k) => {
          let delay = 0;
          if (order) {
            const idx = order.indexOf(i);
            delay = (k * order.length + Math.max(0, idx)) * 0.11;
          }
          want.set(`h${snap.handNo}s${i}k${k}`, { c: visible ? c : -1, up, hero: isHero, t: this._holeTarget(i, k, isHero && up && this.peek && snap.phase !== 'ended'), delay });
        });
      }
      let newBoard = 0;
      snap.board.forEach((c, k) => {
        const key = `h${snap.handNo}b${k}`;
        if (!this.cards.has(key)) newBoard++;
        want.set(key, { c, up: true, t: this._boardTarget(k), delay: (newBoard - 1) * 0.14, board: true });
      });

      for (const [key, m] of this.cards) {
        if (!want.has(key)) { this._removeCard(m, !animate); this.cards.delete(key); }
      }

      const hand = this._dealerHand();
      for (const [key, w] of want) {
        let m = this.cards.get(key);
        const rz = w.up ? 0 : Math.PI;
        if (!m) {
          m = this._newCard(w.c);
          this.cards.set(key, m);
          m.userData.up = w.up;
          if (w.hero) m.scale.setScalar(1.45);
          if (animate) {
            m.position.set(hand.x, hand.y, hand.z);
            m.rotation.set(0, 0, Math.PI);
            this.tweens.to(m.position, { x: w.t.x, y: w.t.y, z: w.t.z }, 0.45, { delay: w.delay, ease: 'out' });
            this.tweens.to(m.rotation, { x: w.t.rx, y: w.t.ry }, 0.45, { delay: w.delay });
            if (w.up) this.tweens.to(m.rotation, { z: 0 }, 0.35, { delay: w.delay + 0.4, ease: 'back' });
            this._gesture(w.t);
          } else {
            m.position.set(w.t.x, w.t.y, w.t.z);
            m.rotation.set(w.t.rx, w.t.ry, rz);
          }
          continue;
        }
        if (m.userData.c !== w.c) this._applyCardMaterials(m, w.c);
        if (m.userData.up !== w.up) {
          m.userData.up = w.up;
          this.tweens.to(m.rotation, { z: rz }, 0.4, { ease: 'back' });
        }
        if (!w.board) {
          this.tweens.to(m.position, { x: w.t.x, y: w.t.y, z: w.t.z }, 0.3);
          this.tweens.to(m.rotation, { x: w.t.rx, y: w.t.ry }, 0.3);
        }
      }
      this.dealCtx = null;
      this._syncChips(snap);
    }

    _gesture(target) {
      // El crupier gira cabeza y brazo hacia donde reparte.
      const ang = Math.atan2(target.x, target.z + 6);
      this.tweens.to(this.armR.shoulder.rotation, { x: -1.35, y: ang * 0.6 }, 0.18);
      clearTimeout(this._gT);
      this._gT = setTimeout(() => this.tweens.to(this.armR.shoulder.rotation, { x: -0.9, y: 0 }, 0.5, { ease: 'inOut' }), 450);
    }

    /* ----- fichas ----- */

    _chipMat(css) {
      let m = this.chipMats.get(css);
      if (!m) {
        m = new this.T.MeshStandardMaterial({ color: new this.T.Color(css), roughness: 0.35, metalness: 0.15 });
        this.chipMats.set(css, m);
      }
      return m;
    }

    _fillStack(group, amount, scale) {
      while (group.children.length) group.remove(group.children[0]);
      if (!amount) return;
      const [bg, fg] = PVP.Art.chipColor(amount / 4);
      const n = U.clamp(Math.ceil(Math.log10(amount + 1) * 1.6), 1, 9);
      const cols = scale > 1 ? 3 : 1;
      for (let c = 0; c < cols; c++) {
        const per = c === 0 ? n : Math.max(1, n - c * 2);
        for (let i = 0; i < per; i++) {
          const chip = new this.T.Mesh(this.chipGeo, this._chipMat(i % 3 === 2 ? fg : bg));
          chip.position.set((c - (cols - 1) / 2) * 0.36, i * 0.058 + 0.03, c === 1 ? 0.18 : 0);
          chip.rotation.y = Math.random();
          chip.castShadow = true;
          group.add(chip);
        }
      }
    }

    _betPos(seat) {
      const { a, b } = this._ellipseDims();
      const ang = (this.overlay.angles[seat] * Math.PI) / 180;
      return { x: Math.sin(ang) * a * 0.48, y: 0, z: -Math.cos(ang) * b * 0.45 };
    }

    _potPos() { return { x: 0, y: 0, z: this.orientation === 'v' ? -1.3 : -0.95 }; }

    _syncChips(snap) {
      for (let i = 0; i < snap.seats.length; i++) {
        let g = this.betGroups[i];
        if (!g) { g = this.betGroups[i] = new this.T.Group(); g.userData.k = 0; this.dynamic.add(g); }
        const p = snap.seats[i];
        const bet = p ? p.bet : 0;
        if (g.userData.k !== bet) {
          g.userData.k = bet;
          const bp = this._betPos(i);
          g.position.set(bp.x, bp.y, bp.z);
          this._fillStack(g, bet, 1);
        }
      }
      if (!this.holdPot && this.potGroup.userData.k !== snap.pot) {
        this.potGroup.userData.k = snap.pot;
        const pp = this._potPos();
        this.potGroup.position.set(pp.x, pp.y, pp.z);
        this._fillStack(this.potGroup, snap.pot, 2);
      }
      // Botón de dealer
      if (!this.dbtn) {
        const cv = canvas(128, 128);
        const g = cv.getContext('2d');
        g.fillStyle = '#f7f4ec'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#141418'; g.font = 'bold 76px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('D', 64, 68);
        const top = new this.T.MeshStandardMaterial({ map: new this.T.CanvasTexture(cv), roughness: 0.4 });
        const side = new this.T.MeshStandardMaterial({ color: 0xdedad0, roughness: 0.4 });
        this.dbtn = new this.T.Mesh(new this.T.CylinderGeometry(0.2, 0.2, 0.06, 32), [side, top, side]);
        this.dbtn.castShadow = true;
        this.dbtn.rotation.y = -Math.PI / 2;
        this.dynamic.add(this.dbtn);
      }
      if (snap.dealer >= 0) {
        const { a, b } = this._ellipseDims();
        const ang = ((this.overlay.angles[snap.dealer] + 16) * Math.PI) / 180;
        this.tweens.to(this.dbtn.position, { x: Math.sin(ang) * a * 0.62, y: 0.03, z: -Math.cos(ang) * b * 0.6 }, 0.6, { ease: 'inOut' });
      }
    }

    _collectChips() {
      const pp = this._potPos();
      for (const g of this.betGroups) {
        if (g && g.children.length) this.tweens.to(g.position, { x: pp.x, z: pp.z }, 0.4, { ease: 'inOut' });
      }
    }

    _potToWinners(seats) {
      if (!seats.length || !this.potGroup.children.length) return;
      const target = this._holeTarget(seats[0], 0, false);
      this.tweens.to(this.potGroup.position, { x: target.x, z: target.z }, 0.8, { ease: 'inOut', delay: 0.3 });
    }

    highlight(result) {
      if (!result || result.uncontested) return;
      const main = result.pots[0];
      const best = main && result.hands[main.winners[0]] ? result.hands[main.winners[0]].best : [];
      for (const m of this.cards.values()) {
        if (best.includes(m.userData.c)) {
          m.material[2].emissive.setHex(this.table.three.accent);
          m.material[2].emissiveIntensity = 0.28;
          this.tweens.to(m.position, { y: m.position.y + 0.08 }, 0.3);
        }
      }
    }

    setPeek(on) {
      this.peek = on;
      if (this.snap) this.sync(this.snap, true);
    }

    onEvent(type, payload, snap) {
      if (type === 'handStart') this.holdPot = false;
      if (type === 'showdown' || type === 'handEnd') this.holdPot = true;
      if (type === 'deal') this.dealCtx = payload.order;
      if (type === 'collect') { this._collectChips(); setTimeout(() => this.sync(this.overlay.snap || snap, true), 420); return; }
      if (type === 'handEnd' && payload.result) {
        const w = [];
        for (const pot of payload.result.pots) for (const s of pot.winners) if (!w.includes(s)) w.push(s);
        this._potToWinners(w);
      }
      this.sync(snap, true);
    }

    /* ----- bucle ----- */

    _loop(now) {
      this._raf = requestAnimationFrame(this._loop);
      const dt = Math.min(0.05, (now - (this._last || now)) / 1000);
      this._last = now;
      const time = now / 1000;
      this.tweens.update(now);
      if (this.fxUpdate) this.fxUpdate(dt, time);

      // Crupier: respiración, parpadeo y mirada al jugador en turno.
      if (this.dealer) {
        this.dealer.children[0].scale.y = 1 + Math.sin(time * 1.6) * 0.008;
        const blink = time % 4 < 0.12 ? 0.1 : 1;
        for (const e of this.eyes) e.scale.y = blink;
        const s = this.snap;
        let look = 0;
        if (s && s.toAct >= 0 && this.overlay.angles) {
          const t = this._holeTarget(s.toAct, 0, false);
          look = Math.atan2(t.x, t.z - this.dealer.position.z) * 0.6;
        }
        this.dealerHead.rotation.y += (look - this.dealerHead.rotation.y) * Math.min(1, dt * 3);
      }

      for (const m of this.cards.values()) {
        if (m.userData.holo) m.material[3].emissive.setHSL((time * 0.15 + m.position.x * 0.1) % 1, 0.8, 0.5);
      }

      // Cámara: preset + paralaje del puntero (y órbita lenta en modo cine).
      let cx = this.camPos.x, cz = this.camPos.z;
      if (this.opts.camera === 'cinema') {
        const r = Math.hypot(this.camPos.x, this.camPos.z);
        const a = time * 0.08;
        cx = Math.sin(a) * r; cz = Math.cos(a) * r;
      }
      this.camera.position.set(cx + this.pointer.x * 0.5, this.camPos.y - this.pointer.y * 0.3, cz);
      this.camera.lookAt(this.lookAt);

      this.renderer.render(this.scene, this.camera);
      this._project();
    }

    _toScreen(x, y, z) {
      const v = this._v.set(x, y, z).project(this.camera);
      return { x: ((v.x + 1) / 2) * this.host.clientWidth, y: ((1 - v.y) / 2) * this.host.clientHeight };
    }

    /** Coloca el HUD DOM sobre las posiciones 3D. */
    _project() {
      const ov = this.overlay;
      if (!ov.seatEls) return;
      const { a, b } = this._ellipseDims();
      for (let i = 0; i < ov.n; i++) {
        const ang = (ov.angles[i] * Math.PI) / 180;
        const hero = i === this.opts.heroSeat;
        const k = hero ? 1.0 : 1.12;
        const s = this._toScreen(Math.sin(ang) * (a + 0.4) * k, 0.4, -Math.cos(ang) * (b + 0.4) * k + (hero ? 0.6 : 0));
        ov.placeProjected('seat', i, s.x, s.y);
        const bp = this._betPos(i);
        const bs = this._toScreen(bp.x, 0.45, bp.z);
        ov.placeProjected('bet', i, bs.x, bs.y);
      }
      const pp = this._potPos();
      const ps = this._toScreen(pp.x, 0.9, pp.z);
      ov.placeProjected('pot', 0, ps.x, ps.y);
      const h = this._dealerHand();
      ov.dealerScreen = this._toScreen(h.x, h.y, h.z);
      const host = this.host.getBoundingClientRect();
      ov.dealerScreen.x += host.left;
      ov.dealerScreen.y += host.top;
    }

    destroy() {
      cancelAnimationFrame(this._raf);
      this.host.removeEventListener('pointermove', this._onPointer);
      if (this._ro) this._ro.disconnect();
      else root.removeEventListener('resize', this._resize);
      disposeTree(this.scene);
      for (const tex of this.texCache.values()) tex.dispose();
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }

  function remapUV(geo, a, b) {
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + a) / (2 * a), 1 - (pos.getZ(i) + b) / (2 * b));
    uv.needsUpdate = true;
  }

  function disposeTree(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }

  Table3D.supported = function () {
    if (!root.THREE) return false;
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  };

  PVP.Table3D = Table3D;
})(typeof window !== 'undefined' ? window : globalThis);
