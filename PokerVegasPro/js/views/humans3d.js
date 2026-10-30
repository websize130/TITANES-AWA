/* PokerVegasPro — personajes 3D procedurales (crupier y jugadores) a partir de un «look» de PVP.Avatars.
 * Proporciones de busto adulto (cabeza ≈ 1/7,5 de la altura), cabeza esculpida con mandíbula, pómulos y mentón,
 * ojos con iris, párpados, nariz, labios y orejas; tejidos y piel con texturas generadas en canvas.
 * Unidades: 1 ≈ 1 m. El origen del grupo está a la altura de la cintura; mira hacia +Z.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const cache = { geo: new Map(), tex: new Map() };

  function noiseCanvas(w, h, base, amp, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * amp;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    if (draw) draw(g, w, h);
    return c;
  }

  function texture(THREE, key, make) {
    let t = cache.tex.get(key);
    if (!t) {
      t = new THREE.CanvasTexture(make());
      t.encoding = THREE.sRGBEncoding;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      cache.tex.set(key, t);
    }
    return t;
  }

  /** Tejido de sarga fina (traje) en escala de grises; el color lo pone el material. */
  function fabricTex(THREE) {
    return texture(THREE, 'fabric', () => noiseCanvas(256, 256, '#d8d8d8', 18, (g, w, h) => {
      g.globalAlpha = 0.07;
      g.strokeStyle = '#000';
      for (let i = -h; i < w; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
      g.globalAlpha = 1;
    }));
  }
  function skinTex(THREE) {
    return texture(THREE, 'skin', () => noiseCanvas(128, 128, '#e9e9e9', 10));
  }
  function hairTex(THREE) {
    return texture(THREE, 'hair', () => noiseCanvas(256, 64, '#cfcfcf', 30, (g, w, h) => {
      g.globalAlpha = 0.25;
      for (let i = 0; i < 400; i++) {
        g.strokeStyle = Math.random() < 0.5 ? '#000' : '#fff';
        const x = Math.random() * w;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 6, h); g.stroke();
      }
    }));
  }

  function geo(key, make) {
    let g = cache.geo.get(key);
    if (!g) { g = make(); cache.geo.set(key, g); }
    return g;
  }

  /** Torso: perfil girado con pecho, cintura y hombros; aplanado en profundidad. */
  function torsoGeo(THREE, f) {
    return geo('torso' + (f ? 'f' : 'm'), () => {
      const pts = f
        ? [[0, 0], [0.165, 0], [0.155, 0.12], [0.15, 0.2], [0.172, 0.3], [0.182, 0.38], [0.188, 0.46], [0.19, 0.5], [0.16, 0.54], [0.08, 0.565], [0.0, 0.57]]
        : [[0, 0], [0.19, 0], [0.188, 0.12], [0.194, 0.24], [0.205, 0.34], [0.215, 0.44], [0.222, 0.52], [0.21, 0.56], [0.15, 0.6], [0.07, 0.62], [0.0, 0.625]];
      const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 48);
      // Más ancho que profundo, y pecho ligeramente adelantado.
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        let z = p.getZ(i) * (f ? 0.6 : 0.58);
        if (z > 0) z *= 1 + 0.12 * Math.sin(Math.min(1, y / 0.55) * Math.PI);
        p.setZ(i, z);
      }
      g.computeVertexNormals();
      return g;
    });
  }

  /** Cabeza: esfera esculpida (cráneo, pómulos, mandíbula que se estrecha y mentón). */
  function headGeo(THREE, f) {
    return geo('head' + (f ? 'f' : 'm'), () => {
      const g = new THREE.SphereGeometry(0.1, 48, 36);
      const p = g.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const y = v.y / 0.1; // -1 (mentón) .. 1 (coronilla)
        let sx = f ? 0.8 : 0.84, sz = 0.95, sy = 1.18;
        if (y < 0) {
          const t = -y; // estrechamiento de la mandíbula hacia el mentón
          sx *= 1 - t * t * (f ? 0.42 : 0.34);
          sz *= 1 - t * t * 0.18;
        }
        if (y > 0.2 && y < 0.6) sx *= 1.02; // sienes
        v.x *= sx; v.y *= sy; v.z *= sz;
        if (v.z > 0 && y < -0.55) v.z += (f ? 0.006 : 0.01) * (-y - 0.55) * 3; // mentón
        if (v.z > 0 && y > -0.15 && y < 0.15) v.z -= 0.004; // cuencas
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return g;
    });
  }

  function makeMaterials(THREE, L) {
    const sh = PVP.Avatars.shade;
    const Phys = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;
    const suit = new Phys({ color: L.suit, map: fabricTex(THREE), roughness: 0.78, metalness: 0.02 });
    if ('sheen' in suit && suit.sheen && suit.sheen.isColor) suit.sheen.set(sh(L.suit, 0.35));
    return {
      suit,
      satin: new THREE.MeshStandardMaterial({ color: sh(L.suit, -0.45), roughness: 0.28, metalness: 0.25 }),
      shirt: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, map: fabricTex(THREE), roughness: 0.7 }),
      // Un toque emisivo del propio tono simula la dispersión subsuperficial y evita la piel «gris».
      skin: new THREE.MeshStandardMaterial({ color: sh(L.skin, -0.26), map: skinTex(THREE), roughness: 0.62, metalness: 0, emissive: new THREE.Color(sh(L.skin, -0.3)), emissiveIntensity: 0.12 }),
      lip: new THREE.MeshStandardMaterial({ color: L.sex === 'f' ? sh('#a8404a', PVP.Avatars.SKIN.deep === L.skin ? -0.35 : 0) : sh(L.skin, -0.28), roughness: 0.45 }),
      hair: new THREE.MeshStandardMaterial({ color: L.hairColor, map: hairTex(THREE), roughness: 0.42, metalness: 0.08 }),
      sclera: new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.2 }),
      iris: new THREE.MeshStandardMaterial({ color: L.eyes || '#3a2414', roughness: 0.3 }),
      pupil: new THREE.MeshBasicMaterial({ color: 0x050403 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xe8b54a, roughness: 0.22, metalness: 0.95 }),
      black: new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.35, metalness: 0.2 }),
      pearl: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.15, metalness: 0.1 }),
      lens: new THREE.MeshStandardMaterial({ color: 0x08080c, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.88 }),
      vest: new THREE.MeshStandardMaterial({ color: 0x5a1220, map: fabricTex(THREE), roughness: 0.65 }),
    };
  }

  function mesh(THREE, g, m, x, y, z) {
    const o = new THREE.Mesh(g, m);
    o.position.set(x || 0, y || 0, z || 0);
    o.castShadow = true;
    return o;
  }

  function buildHead(THREE, L, M) {
    const f = L.sex === 'f';
    const head = new THREE.Group();
    head.add(mesh(THREE, headGeo(THREE, f), M.skin));

    // Orejas
    const earG = geo('ear', () => new THREE.SphereGeometry(0.022, 16, 12));
    for (const s of [-1, 1]) {
      const e = mesh(THREE, earG, M.skin, s * (f ? 0.079 : 0.083), 0.0, -0.005);
      e.scale.set(0.45, 1.15, 0.8);
      head.add(e);
    }
    // Ojos (esclerótica, iris, pupila) y párpados para parpadear
    const eyes = [];
    const scG = geo('sclera', () => new THREE.SphereGeometry(0.0125, 20, 14));
    const irG = geo('iris', () => new THREE.CircleGeometry(0.0072, 24));
    const puG = geo('pupil', () => new THREE.CircleGeometry(0.0034, 16));
    const lidG = geo('lid', () => new THREE.SphereGeometry(0.0138, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5));
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(s * 0.032, 0.018, 0.082);
      const sc = mesh(THREE, scG, M.sclera); sc.scale.set(1, 0.78, 0.9); eye.add(sc);
      const ir = mesh(THREE, irG, M.iris, 0, 0, 0.0115); eye.add(ir);
      const pu = mesh(THREE, puG, M.pupil, 0, 0, 0.0117); eye.add(pu);
      const lid = mesh(THREE, lidG, M.skin, 0, 0.001, 0); lid.scale.set(1.05, 0.55, 0.8); eye.add(lid);
      eye.userData.lid = lid;
      head.add(eye);
      eyes.push(eye);
      // Ceja
      const brow = mesh(THREE, geo('brow' + (f ? 'f' : 'm'), () => new THREE.BoxGeometry(f ? 0.028 : 0.032, f ? 0.0035 : 0.0065, 0.006)), M.hair, s * 0.033, 0.043, 0.082);
      brow.rotation.z = s * (f ? -0.18 : -0.08);
      head.add(brow);
    }
    // Nariz (perfil girado), labios
    const nose = mesh(THREE, geo('nose' + (f ? 'f' : 'm'), () => new THREE.LatheGeometry(
      [[0, -0.034], [0.011, -0.03], [0.013, -0.022], [0.007, 0.0], [0.004, 0.012], [0, 0.014]].map(([x, y]) => new THREE.Vector2(x * (f ? 0.85 : 1), y)), 16)), M.skin, 0, -0.012, 0.086);
    nose.scale.set(1, 1, 0.9);
    nose.rotation.x = -0.12;
    head.add(nose);
    // Expresión: comisuras ligeramente hacia arriba (sonrisa contenida) y pestañas en los ojos femeninos.
    const smile = mesh(THREE, geo('smile', () => new THREE.TorusGeometry(0.02, 0.0018, 6, 18, Math.PI * 0.8)), M.lip, 0, -0.052, 0.08);
    smile.rotation.z = Math.PI + Math.PI * 0.1;
    smile.scale.set(1, 0.45, 1);
    head.add(smile);
    if (f) {
      const lash = geo('lash', () => new THREE.BoxGeometry(0.03, 0.0025, 0.004));
      for (const s of [-1, 1]) { const l = mesh(THREE, lash, M.black, s * 0.032, 0.028, 0.092); l.rotation.z = s * -0.12; head.add(l); }
    }
    const lipG = geo('lip', () => new THREE.SphereGeometry(0.018, 20, 10));
    const up = mesh(THREE, lipG, M.lip, 0, -0.054, 0.079); up.scale.set(f ? 1.05 : 1, f ? 0.32 : 0.22, 0.4); head.add(up);
    const lo = mesh(THREE, lipG, M.lip, 0, -0.063, 0.077); lo.scale.set(f ? 0.95 : 0.9, f ? 0.36 : 0.24, 0.42); head.add(lo);

    if (L.beard && !f) {
      const beard = mesh(THREE, geo('beard', () => new THREE.SphereGeometry(0.098, 32, 16, 0, Math.PI * 2, Math.PI * 0.66, Math.PI * 0.34)), M.hair, 0, -0.004, 0.008);
      beard.scale.set(0.84, 1.18, 0.97);
      head.add(beard);
      const mus = mesh(THREE, lipG, M.hair, 0, -0.045, 0.084); mus.scale.set(1.25, 0.25, 0.4); head.add(mus);
    }
    buildHair(THREE, L, M, head);
    buildFaceAccessories(THREE, L, M, head);
    return { head, eyes };
  }

  function cap(THREE, key, theta, sx, sy, sz) {
    return geo(key, () => {
      const g = new THREE.SphereGeometry(0.104, 40, 24, 0, Math.PI * 2, 0, theta);
      g.scale(sx, sy, sz);
      return g;
    });
  }

  function buildHair(THREE, L, M, head) {
    const add = (g, x, y, z, rx) => { const o = mesh(THREE, g, M.hair, x, y, z); if (rx) o.rotation.x = rx; head.add(o); return o; };
    switch (L.hair) {
      case 'bald': break;
      // Casquetes inclinados hacia atrás: el nacimiento del pelo queda en la frente y la nuca queda cubierta.
      case 'buzz': add(cap(THREE, 'hbuzz', Math.PI * 0.42, 0.855, 1.2, 0.98), 0, 0.004, -0.004, -0.5); break;
      case 'short': add(cap(THREE, 'hshort', Math.PI * 0.44, 0.87, 1.22, 1.0), 0, 0.008, -0.006, -0.5); break;
      case 'slick': {
        add(cap(THREE, 'hslick', Math.PI * 0.45, 0.875, 1.24, 1.02), 0, 0.01, -0.008, -0.52);
        add(geo('quiff', () => new THREE.SphereGeometry(0.05, 24, 12)), 0, 0.106, 0.02).scale.set(1.25, 0.42, 0.95);
        break;
      }
      case 'side': {
        add(cap(THREE, 'hside', Math.PI * 0.45, 0.88, 1.22, 1.0), 0, 0.01, -0.006, -0.5).rotation.z = 0.06;
        break;
      }
      case 'wavy': {
        add(cap(THREE, 'hwavy', Math.PI * 0.46, 0.89, 1.25, 1.02), 0, 0.01, -0.006, -0.5);
        const blob = geo('wave', () => new THREE.SphereGeometry(0.03, 16, 10));
        for (let i = 0; i < 9; i++) {
          const a = -1 + (i / 8) * 2;
          add(blob, a * 0.06, 0.1 - Math.abs(a) * 0.02, 0.05 - Math.abs(a) * 0.03).scale.set(1, 0.7, 1);
        }
        break;
      }
      case 'curly': {
        add(cap(THREE, 'hcurly', Math.PI * 0.5, 1.02, 1.28, 1.06), 0, 0.016, -0.01, -0.45);
        const curlG = geo('curl', () => new THREE.SphereGeometry(0.024, 10, 8));
        const inst = new THREE.InstancedMesh(curlG, M.hair, 70);
        const m4 = new THREE.Matrix4();
        for (let i = 0; i < 70; i++) {
          const th = Math.random() * Math.PI * 0.55, ph = Math.PI + (Math.random() - 0.5) * Math.PI * 1.7;
          const r = 0.118;
          const z = Math.sin(th) * Math.cos(ph) * r * 1.05;
          m4.makeTranslation(Math.sin(th) * Math.sin(ph) * r * 1.02, Math.cos(th) * r * 1.3 + 0.02, z - 0.012);
          inst.setMatrixAt(i, m4);
        }
        inst.castShadow = true;
        head.add(inst);
        break;
      }
      case 'bun': {
        add(cap(THREE, 'hbun', Math.PI * 0.46, 0.86, 1.22, 1.0), 0, 0.008, -0.006, -0.5);
        add(geo('bunball', () => new THREE.SphereGeometry(0.045, 24, 16)), 0, 0.12, -0.06);
        break;
      }
      case 'ponytail': {
        add(cap(THREE, 'hpony', Math.PI * 0.46, 0.86, 1.22, 1.0), 0, 0.008, -0.006, -0.5);
        const tail = add(geo('tail', () => new THREE.CylinderGeometry(0.02, 0.008, 0.2, 12)), 0, -0.02, -0.11);
        tail.rotation.x = 0.35;
        break;
      }
      case 'bob': {
        add(cap(THREE, 'hbob', Math.PI * 0.6, 0.94, 1.14, 1.06), 0, 0.006, -0.012, -0.55);
        break;
      }
      case 'long':
      default: {
        add(cap(THREE, 'hlong', Math.PI * 0.52, 0.9, 1.22, 1.03), 0, 0.008, -0.008, -0.52);
        const back = add(geo('hairback', () => {
          const g = new THREE.CylinderGeometry(0.1, 0.12, 0.3, 24, 1, true, Math.PI * 0.55, Math.PI * 0.9);
          return g;
        }), 0, -0.1, -0.02);
        back.material = M.hair;
        back.material.side = THREE.DoubleSide;
      }
    }
  }

  function buildFaceAccessories(THREE, L, M, head) {
    if (L.acc === 'glasses' || L.acc === 'shades') {
      const ring = geo('ring', () => new THREE.TorusGeometry(0.017, 0.0022, 8, 28));
      for (const s of [-1, 1]) {
        const r = mesh(THREE, ring, L.acc === 'shades' ? M.black : M.gold, s * 0.032, 0.018, 0.094);
        r.scale.set(1.15, 0.85, 1);
        head.add(r);
        if (L.acc === 'shades') {
          const lens = mesh(THREE, geo('lens', () => new THREE.CircleGeometry(0.017, 24)), M.lens, s * 0.032, 0.018, 0.095);
          lens.scale.set(1.15, 0.85, 1);
          head.add(lens);
        }
      }
      head.add(mesh(THREE, geo('bridge', () => new THREE.BoxGeometry(0.03, 0.003, 0.003)), M.gold, 0, 0.022, 0.096));
    }
    if (L.acc === 'hat') {
      head.add(mesh(THREE, geo('brim', () => new THREE.CylinderGeometry(0.17, 0.17, 0.008, 40)), M.black, 0, 0.1, 0));
      head.add(mesh(THREE, geo('crown', () => new THREE.CylinderGeometry(0.085, 0.1, 0.1, 32)), M.black, 0, 0.15, 0));
      head.add(mesh(THREE, geo('band', () => new THREE.CylinderGeometry(0.101, 0.101, 0.018, 32)), M.gold, 0, 0.112, 0));
    }
    if (L.acc === 'earrings') {
      const ball = geo('earring', () => new THREE.SphereGeometry(0.008, 12, 8));
      for (const s of [-1, 1]) head.add(mesh(THREE, ball, M.gold, s * 0.08, -0.03, 0));
    }
  }

  function buildArm(THREE, M, side, f) {
    const shoulder = new THREE.Group();
    const up = mesh(THREE, geo('upper' + (f ? 'f' : 'm'), () => new THREE.CylinderGeometry(f ? 0.048 : 0.058, f ? 0.04 : 0.048, 0.3, 20)), M.suit, 0, -0.15, 0);
    shoulder.add(up);
    const delt = mesh(THREE, geo('delt' + (f ? 'f' : 'm'), () => new THREE.SphereGeometry(f ? 0.044 : 0.052, 20, 14)), M.suit, side * -0.012, -0.012, 0);
    delt.scale.set(1, 1.1, 0.95);
    shoulder.add(delt);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    elbow.add(mesh(THREE, geo('fore' + (f ? 'f' : 'm'), () => new THREE.CylinderGeometry(f ? 0.04 : 0.047, f ? 0.032 : 0.038, 0.27, 20)), M.suit, 0, -0.135, 0));
    elbow.add(mesh(THREE, geo('cuff', () => new THREE.CylinderGeometry(0.036, 0.036, 0.03, 18)), M.shirt, 0, -0.275, 0));
    // Mano: palma, cuatro dedos y pulgar
    const hand = new THREE.Group();
    hand.position.y = -0.33;
    const palm = mesh(THREE, geo('palm', () => new THREE.SphereGeometry(0.04, 18, 12)), M.skin);
    palm.scale.set(f ? 0.85 : 1, 1.1, 0.5);
    hand.add(palm);
    const fingerG = geo('finger', () => new THREE.CylinderGeometry(0.0085, 0.0075, 0.06, 8));
    for (let i = 0; i < 4; i++) {
      const fi = mesh(THREE, fingerG, M.skin, (i - 1.5) * 0.017 * (f ? 0.9 : 1), -0.065, 0.004);
      fi.rotation.x = 0.35;
      hand.add(fi);
    }
    const th = mesh(THREE, fingerG, M.skin, side * -0.035, -0.022, 0.015);
    th.rotation.z = side * 0.9;
    hand.add(th);
    elbow.add(hand);
    shoulder.add(elbow);
    return { shoulder, elbow, hand };
  }

  /**
   * Crea un personaje.
   * @param {object} look    look de PVP.Avatars (se resuelve con su modelo base)
   * @param {object} opts    { role: 'dealer' | 'player' }
   * @returns {{ group, torso, head, eyes, armL, armR, update(time, dt) }}
   */
  function create(THREE, look, opts) {
    const L = PVP.Avatars.resolve(look);
    const f = L.sex === 'f';
    const M = makeMaterials(THREE, L);
    const g = new THREE.Group();
    const dealer = opts && opts.role === 'dealer';
    const H = f ? 0.57 : 0.625; // altura del torso
    const SW = f ? 0.19 : 0.215; // semiancho de hombros

    const torso = mesh(THREE, torsoGeo(THREE, f), M.suit);
    g.add(torso);

    // Pechera: camisa (o escote), solapas de raso y chaleco del crupier
    const depth = (f ? 0.6 : 0.58) * (f ? 0.188 : 0.222);
    if (!f) {
      const v = new THREE.Shape();
      v.moveTo(-0.07, H - 0.02); v.lineTo(0.07, H - 0.02); v.lineTo(0, H - 0.3); v.closePath();
      g.add(mesh(THREE, new THREE.ShapeGeometry(v), M.shirt, 0, 0, depth * 1.1));
      if (dealer) {
        const vest = new THREE.Shape();
        vest.moveTo(-0.06, H - 0.12); vest.lineTo(0.06, H - 0.12); vest.lineTo(0.035, H - 0.42); vest.lineTo(-0.035, H - 0.42); vest.closePath();
        g.add(mesh(THREE, new THREE.ShapeGeometry(vest), M.vest, 0, 0, depth * 1.11));
      }
      for (const s of [-1, 1]) {
        const lap = new THREE.Shape();
        lap.moveTo(s * 0.07, H - 0.02); lap.lineTo(s * 0.12, H - 0.06); lap.lineTo(s * 0.03, H - 0.36); lap.lineTo(0, H - 0.31); lap.closePath();
        g.add(mesh(THREE, new THREE.ShapeGeometry(lap), M.satin, 0, 0, depth * 1.12));
      }
    } else {
      const neck = new THREE.Shape();
      neck.moveTo(-0.075, H - 0.015); neck.quadraticCurveTo(0, H - 0.2, 0.075, H - 0.015); neck.closePath();
      g.add(mesh(THREE, new THREE.ShapeGeometry(neck, 12), M.skin, 0, 0, depth * 1.12));
    }

    // Accesorios de pecho
    if (L.acc === 'tie' && !f) {
      g.add(mesh(THREE, geo('knot', () => new THREE.BoxGeometry(0.026, 0.024, 0.012)), M.gold, 0, H - 0.04, depth * 1.16));
      const tie = new THREE.Shape();
      tie.moveTo(-0.012, 0); tie.lineTo(0.012, 0); tie.lineTo(0.026, -0.24); tie.lineTo(0, -0.27); tie.lineTo(-0.026, -0.24); tie.closePath();
      g.add(mesh(THREE, new THREE.ShapeGeometry(tie), M.gold, 0, H - 0.052, depth * 1.15));
    }
    if ((L.acc === 'bowtie' || dealer) && !f) {
      const bow = geo('bow', () => new THREE.ConeGeometry(0.022, 0.045, 4));
      for (const s of [-1, 1]) {
        const b = mesh(THREE, bow, M.black, s * 0.022, H - 0.035, depth * 1.17);
        b.rotation.z = s * Math.PI / 2;
        g.add(b);
      }
    }
    if (L.acc === 'necklace' || L.acc === 'pearls') {
      const n = 13;
      const bead = geo(L.acc === 'pearls' ? 'pearl' : 'chain', () => new THREE.SphereGeometry(L.acc === 'pearls' ? 0.008 : 0.0045, 10, 8));
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = (t - 0.5) * 0.15;
        const y = H - 0.02 - Math.sin(t * Math.PI) * 0.1;
        g.add(mesh(THREE, bead, L.acc === 'pearls' ? M.pearl : M.gold, x, y, depth * 1.16));
      }
    }
    if (dealer) {
      g.add(mesh(THREE, geo('badge', () => new THREE.BoxGeometry(0.07, 0.018, 0.004)), M.gold, 0.11, H - 0.2, depth * 1.12));
    }
    if (!f) {
      // Botones de la chaqueta, pañuelo de bolsillo y puntas del cuello de la camisa.
      const btn = geo('button', () => new THREE.SphereGeometry(0.0085, 10, 8));
      for (const y of [H - 0.37, H - 0.45]) g.add(mesh(THREE, btn, M.black, 0, y, depth * 1.1));
      const sq = new THREE.Shape();
      sq.moveTo(-0.022, 0); sq.lineTo(0.022, 0); sq.lineTo(0.012, 0.022); sq.lineTo(0, 0.012); sq.lineTo(-0.012, 0.024); sq.closePath();
      const pocket = mesh(THREE, new THREE.ShapeGeometry(sq), L.acc === 'tie' || dealer ? M.shirt : M.gold, -0.115, H - 0.17, depth * 1.08);
      pocket.rotation.y = -0.35;
      g.add(pocket);
      for (const s of [-1, 1]) {
        const pt = new THREE.Shape();
        pt.moveTo(0, 0); pt.lineTo(s * 0.04, -0.008); pt.lineTo(s * 0.012, -0.05); pt.closePath();
        g.add(mesh(THREE, new THREE.ShapeGeometry(pt), M.shirt, s * 0.012, H - 0.006, depth * 1.135));
      }
    } else {
      // Tirantes del vestido sobre los hombros.
      for (const s of [-1, 1]) {
        const strap = mesh(THREE, geo('strap', () => new THREE.BoxGeometry(0.022, 0.12, 0.012)), M.satin, s * 0.085, H - 0.03, depth * 0.95);
        strap.rotation.z = s * 0.12;
        g.add(strap);
      }
    }

    // Cuello y cabeza
    g.add(mesh(THREE, geo('neck' + (f ? 'f' : 'm'), () => new THREE.CylinderGeometry(f ? 0.04 : 0.05, f ? 0.046 : 0.058, 0.1, 20)), M.skin, 0, H + 0.025, 0.005));
    if (!f) g.add(mesh(THREE, geo('collar', () => new THREE.CylinderGeometry(0.058, 0.062, 0.04, 24, 1, true)), M.shirt, 0, H - 0.005, 0.004));
    const { head, eyes } = buildHead(THREE, L, M);
    head.position.set(0, H + 0.152, 0.012);
    g.add(head);

    const armL = buildArm(THREE, M, -1, f);
    const armR = buildArm(THREE, M, 1, f);
    armL.shoulder.position.set(-SW + 0.01, H - 0.06, 0);
    armR.shoulder.position.set(SW - 0.01, H - 0.06, 0);
    // Postura sentada: antebrazos apoyados hacia la mesa
    for (const [a, s] of [[armL, -1], [armR, 1]]) {
      a.shoulder.rotation.set(-0.42, 0, s * 0.1);
      a.elbow.rotation.set(-0.95, 0, 0);
      g.add(a.shoulder);
    }

    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    const seed = Math.random() * 10;
    function update(time) {
      torso.scale.y = 1 + Math.sin(time * 1.5 + seed) * 0.006;
      const blink = (time + seed) % 4.2 < 0.12;
      for (const e of eyes) e.scale.y = blink ? 0.12 : 1;
    }

    return { group: g, torso, head, eyes, armL, armR, look: L, update, height: H };
  }

  PVP.Humans = { create };
})(typeof window !== 'undefined' ? window : globalThis);
