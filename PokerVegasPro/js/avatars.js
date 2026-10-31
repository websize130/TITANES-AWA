/* PokerVegasPro — personajes: 10 modelos base (7 hombres y 3 mujeres de distintas etnias), opciones de vestuario
 * y retratos vectoriales SVG que se usan en el menú, el perfil y los asientos de la mesa.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  const SKIN = {
    porcelain: '#edc6aa', light: '#dfae8a', tan: '#c98f68', olive: '#b67d55', brown: '#8a5a3c', deep: '#5d3a27',
  };

  /** Modelos base. look = { base, suit, hair, hairColor, acc, beard, eyes } */
  const ROSTER = [
    { id: 'marco', name: 'Marco', sex: 'm', origin: 'Mediterráneo', skin: SKIN.light, look: { suit: '#1d2a44', hair: 'slick', hairColor: '#3b2416', acc: 'tie', beard: false, eyes: '#5a3b22' } },
    { id: 'darnell', name: 'Darnell', sex: 'm', origin: 'Afroamericano', skin: SKIN.deep, look: { suit: '#2a2a2e', hair: 'buzz', hairColor: '#111', acc: 'glasses', beard: true, eyes: '#2b1a10' } },
    { id: 'kenji', name: 'Kenji', sex: 'm', origin: 'Japonés', skin: SKIN.porcelain, look: { suit: '#0c0c10', hair: 'side', hairColor: '#0e0e10', acc: 'bowtie', beard: false, eyes: '#24170f' } },
    { id: 'rafael', name: 'Rafael', sex: 'm', origin: 'Latino', skin: SKIN.tan, look: { suit: '#5a1624', hair: 'wavy', hairColor: '#1a120c', acc: 'none', beard: true, eyes: '#3a2414' } },
    { id: 'arjun', name: 'Arjun', sex: 'm', origin: 'Indio', skin: SKIN.brown, look: { suit: '#d8cbb0', hair: 'short', hairColor: '#0f0b08', acc: 'tie', beard: false, eyes: '#2a190d' } },
    { id: 'omar', name: 'Omar', sex: 'm', origin: 'Árabe', skin: SKIN.olive, look: { suit: '#11402f', hair: 'slick', hairColor: '#15100c', acc: 'none', beard: true, eyes: '#3b2716' } },
    { id: 'viktor', name: 'Viktor', sex: 'm', origin: 'Europa del Este', skin: SKIN.porcelain, look: { suit: '#4a4d55', hair: 'buzz', hairColor: '#c9a86a', acc: 'glasses', beard: false, eyes: '#4b6e8c' } },
    { id: 'amara', name: 'Amara', sex: 'f', origin: 'Africana', skin: SKIN.deep, look: { suit: '#b88a2c', hair: 'curly', hairColor: '#120c08', acc: 'earrings', beard: false, eyes: '#2a170c' } },
    { id: 'sofia', name: 'Sofía', sex: 'f', origin: 'Latina', skin: SKIN.tan, look: { suit: '#8f1022', hair: 'long', hairColor: '#2c1a10', acc: 'necklace', beard: false, eyes: '#3d2614' } },
    { id: 'mei', name: 'Mei', sex: 'f', origin: 'China', skin: SKIN.light, look: { suit: '#0f3d36', hair: 'bun', hairColor: '#0b0b0d', acc: 'pearls', beard: false, eyes: '#22150c' } },
  ];

  const SUIT_COLORS = [
    ['#0c0c10', 'Negro'], ['#1d2a44', 'Marino'], ['#2a2a2e', 'Carbón'], ['#4a4d55', 'Gris'], ['#5a1624', 'Burdeos'],
    ['#8f1022', 'Rojo'], ['#11402f', 'Esmeralda'], ['#0f3d36', 'Jade'], ['#2b1d4f', 'Púrpura'], ['#b88a2c', 'Oro'], ['#d8cbb0', 'Marfil'], ['#f1ede6', 'Blanco'],
  ];
  const HAIR_STYLES = {
    m: [['slick', 'Peinado atrás'], ['short', 'Corto'], ['side', 'Raya al lado'], ['wavy', 'Ondulado'], ['buzz', 'Rapado'], ['bald', 'Afeitado']],
    f: [['long', 'Melena'], ['bun', 'Moño'], ['curly', 'Rizos'], ['bob', 'Bob'], ['ponytail', 'Coleta']],
  };
  const HAIR_COLORS = [['#0b0b0d', 'Negro'], ['#2c1a10', 'Castaño'], ['#5b3a1e', 'Avellana'], ['#c9a86a', 'Rubio'], ['#8a2e1a', 'Pelirrojo'], ['#b9b6b0', 'Plata']];
  const ACCESSORIES = {
    m: [['none', 'Ninguno'], ['tie', 'Corbata'], ['bowtie', 'Pajarita'], ['glasses', 'Gafas'], ['hat', 'Fedora'], ['shades', 'Gafas de sol']],
    f: [['none', 'Ninguno'], ['earrings', 'Pendientes'], ['necklace', 'Collar de oro'], ['pearls', 'Perlas'], ['glasses', 'Gafas'], ['shades', 'Gafas de sol']],
  };

  const base = (id) => ROSTER.find((r) => r.id === id) || ROSTER[0];

  /** Look completo (modelo base + personalización). */
  function resolve(look) {
    look = look || {};
    const b = base(look.base);
    return Object.assign({ base: b.id, sex: b.sex, skin: b.skin, name: b.name }, b.look, look, { sex: b.sex, skin: b.skin });
  }

  /** Look aleatorio para un rival virtual. */
  function randomLook() {
    const b = ROSTER[Math.floor(Math.random() * ROSTER.length)];
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const l = { base: b.id };
    if (Math.random() < 0.5) l.suit = pick(SUIT_COLORS)[0];
    if (Math.random() < 0.35) l.acc = pick(ACCESSORIES[b.sex])[0];
    if (Math.random() < 0.25) l.hair = pick(HAIR_STYLES[b.sex])[0];
    if (Math.random() < 0.15) l.hairColor = pick(HAIR_COLORS)[0];
    return l;
  }

  /* ---------- color ---------- */
  function shade(hex, amt) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const n = parseInt(c, 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
    return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  const luminance = (hex) => {
    const n = parseInt(hex.replace('#', '').padEnd(6, '0'), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  };

  /* ---------- retrato SVG ---------- */
  let uid = 0;

  function hairBack(L, hc) {
    switch (L.hair) {
      case 'long': return `<path d="M35 50 C31 16 89 16 85 50 L90 100 C82 106 72 102 70 94 L50 94 C48 102 38 106 30 100 Z" fill="${hc}"/>`;
      case 'curly': {
        let d = '';
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2;
          d += `<circle cx="${(60 + Math.cos(a) * 29).toFixed(1)}" cy="${(46 + Math.sin(a) * 27).toFixed(1)}" r="9" fill="${hc}"/>`;
        }
        return `<ellipse cx="60" cy="46" rx="31" ry="29" fill="${hc}"/>${d}`;
      }
      case 'ponytail': return `<path d="M76 30 C96 34 98 64 86 84 C84 66 80 50 74 40 Z" fill="${hc}"/>`;
      case 'bob': return `<path d="M36 48 C33 18 87 18 84 48 L86 72 C80 76 74 74 72 70 L48 70 C46 74 40 76 34 72 Z" fill="${hc}"/>`;
      default: return '';
    }
  }

  function hairFront(L, hc, hl) {
    switch (L.hair) {
      case 'slick': return `<path d="M38 45 C35 21 52 15 62 16 C77 17 86 27 82 45 C80 31 72 26 60 27 C49 27 41 33 38 45 Z" fill="${hc}"/><path d="M48 22 C56 18 68 18 76 24" stroke="${hl}" stroke-width="1.4" fill="none" opacity=".55"/>`;
      case 'short': return `<path d="M38 46 C37 24 50 18 60 18 C72 18 84 24 82 46 C79 35 71 30 60 30 C50 30 42 35 38 46 Z" fill="${hc}"/>`;
      case 'side': return `<path d="M38 47 C36 22 52 17 61 17 C75 17 85 25 82 46 C78 34 64 28 52 31 C46 33 41 38 38 47 Z" fill="${hc}"/><path d="M50 19 C48 24 47 28 47 32" stroke="${shade(hc, -0.4)}" stroke-width="1" fill="none"/>`;
      case 'wavy': return `<path d="M37 47 C34 22 50 14 61 15 C76 15 88 25 83 47 C81 38 77 33 72 34 C69 29 63 29 59 32 C55 28 48 29 46 34 C41 34 38 40 37 47 Z" fill="${hc}"/>`;
      case 'buzz': return `<path d="M39 43 C40 25 52 21 60 21 C70 21 80 25 81 43 C76 33 68 30 60 30 C52 30 44 33 39 43 Z" fill="${hc}" opacity=".85"/>`;
      case 'bald': return `<ellipse cx="53" cy="27" rx="7" ry="3" fill="#fff" opacity=".18"/>`;
      case 'long': return `<path d="M37 48 C36 22 52 16 61 16 C74 16 86 24 83 48 C78 34 70 28 62 30 C56 31 50 36 46 44 C44 38 40 40 37 48 Z" fill="${hc}"/>`;
      case 'bun': return `<circle cx="60" cy="16" r="9" fill="${hc}"/><path d="M38 46 C36 23 50 19 60 19 C71 19 84 23 82 46 C79 33 70 28 60 28 C50 28 41 33 38 46 Z" fill="${hc}"/>`;
      case 'curly': return `<path d="M38 44 C40 30 50 26 60 26 C70 26 80 30 82 44 C76 36 68 34 60 34 C52 34 44 36 38 44 Z" fill="${hc}"/>`;
      case 'bob': return `<path d="M37 48 C36 22 52 17 61 17 C74 17 86 24 83 48 C80 36 72 31 61 32 C50 32 41 37 37 48 Z" fill="${hc}"/>`;
      case 'ponytail': return `<path d="M38 46 C36 22 51 18 61 18 C73 18 85 24 82 46 C79 33 70 28 60 28 C50 28 41 33 38 46 Z" fill="${hc}"/>`;
      default: return '';
    }
  }

  /** Retrato de busto en SVG (fondo, traje, cara, pelo y accesorios). */
  function portraitSVG(look, opts) {
    const L = resolve(look);
    opts = opts || {};
    const id = 'pv' + uid++;
    const f = L.sex === 'f';
    const skin = L.skin, skinD = shade(skin, -0.22), skinL = shade(skin, 0.12);
    const suit = L.suit, suitD = shade(suit, -0.35), suitL = shade(suit, 0.18);
    const hc = L.hairColor, hl = shade(hc, 0.45);
    const rx = f ? 19.5 : 21, jw = f ? 8 : 10.5;
    const lip = f ? shade('#b4434e', luminance(skin) < 0.4 ? -0.35 : 0) : shade(skin, -0.3);
    const bg = opts.bg !== false;
    const lightSuit = luminance(suit) > 0.6;

    let s = `<svg viewBox="0 0 120 120" class="portrait" aria-hidden="true"><defs>
      <radialGradient id="${id}b" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="${shade(suit, 0.25)}"/><stop offset="1" stop-color="#07050a"/></radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${suitL}"/><stop offset="1" stop-color="${suitD}"/></linearGradient>
      <radialGradient id="${id}f" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="${skinL}"/><stop offset=".75" stop-color="${skin}"/><stop offset="1" stop-color="${skinD}"/></radialGradient>
    </defs>`;
    if (bg) s += `<rect width="120" height="120" fill="url(#${id}b)"/>`;
    s += hairBack(L, hc);

    // Cuello y hombros
    s += `<path d="M${f ? 53.5 : 52} 64 L${f ? 66.5 : 68} 64 L${f ? 67 : 69} 88 L${f ? 53 : 51} 88 Z" fill="${skinD}"/>`;
    if (f) {
      s += `<path d="M18 120 C20 101 34 90 50 87 C54 96 66 96 70 87 C86 90 100 101 102 120 Z" fill="url(#${id}s)"/>`;
      s += `<path d="M50 87 C54 98 66 98 70 87" fill="${skin}" opacity=".95"/>`;
    } else {
      s += `<path d="M8 120 C11 100 30 88 50 85 L70 85 C90 88 109 100 112 120 Z" fill="url(#${id}s)"/>`;
      s += `<path d="M50 85 L60 106 L70 85 Z" fill="#f5f2ec"/>`;
      s += `<path d="M50 85 L60 107 L54 120 L41 120 L45 93 Z M70 85 L60 107 L66 120 L79 120 L75 93 Z" fill="${lightSuit ? shade(suit, -0.12) : suitD}" opacity=".9"/>`;
      s += `<path d="M50 85 L60 107 L54 120" stroke="${shade(suit, 0.3)}" stroke-width=".6" fill="none" opacity=".6"/><path d="M70 85 L60 107 L66 120" stroke="${shade(suit, 0.3)}" stroke-width=".6" fill="none" opacity=".6"/>`;
    }

    // Cabeza
    s += `<ellipse cx="${60 - rx}" cy="52" rx="3.4" ry="6" fill="${skinD}"/><ellipse cx="${60 + rx}" cy="52" rx="3.4" ry="6" fill="${skinD}"/>`;
    s += `<path d="M${60 - rx} 48 C${60 - rx} 18 ${60 + rx} 18 ${60 + rx} 48 C${60 + rx} 66 ${60 + jw} 76 60 78 C${60 - jw} 76 ${60 - rx} 66 ${60 - rx} 48 Z" fill="url(#${id}f)"/>`;
    if (f) s += `<ellipse cx="49" cy="60" rx="5" ry="3" fill="#e0707a" opacity=".16"/><ellipse cx="71" cy="60" rx="5" ry="3" fill="#e0707a" opacity=".16"/>`;
    // Ojos
    for (const x of [51.5, 68.5]) {
      s += `<ellipse cx="${x}" cy="51" rx="${f ? 4.3 : 4}" ry="2.3" fill="#f7f4ef"/><circle cx="${x}" cy="51" r="1.9" fill="${L.eyes || '#3a2414'}"/><circle cx="${x}" cy="51" r=".9" fill="#0a0806"/><circle cx="${x + 0.6}" cy="50.4" r=".45" fill="#fff"/>`;
      s += `<path d="M${x - 4.6} 50.6 Q${x} 47.6 ${x + 4.6} 50.6" stroke="${shade(skin, -0.55)}" stroke-width="${f ? 1.3 : 0.9}" fill="none"/>`;
      s += `<path d="M${x - 5} 45 Q${x} ${f ? 41.8 : 42.6} ${x + 5} 45" stroke="${shade(hc, 0.05)}" stroke-width="${f ? 1.1 : 1.8}" fill="none" stroke-linecap="round"/>`;
    }
    // Nariz y boca
    s += `<path d="M60 53 Q58.4 60 56.8 62.2 Q60 64.2 63.2 62.2" stroke="${shade(skin, -0.32)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    s += f
      ? `<path d="M54.5 69 Q57 67.2 60 68.2 Q63 67.2 65.5 69 Q60 73 54.5 69 Z" fill="${lip}"/>`
      : `<path d="M54.5 69.2 Q60 71.6 65.5 69.2" stroke="${lip}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    if (L.beard && !f) {
      s += `<path d="M${60 - rx + 1} 56 C${60 - rx + 3} 74 50 81 60 81 C70 81 ${60 + rx - 3} 74 ${60 + rx - 1} 56 C${60 + rx - 4} 66 70 70 60 70 C50 70 ${60 - rx + 4} 66 ${60 - rx + 1} 56 Z" fill="${hc}" opacity=".88"/>`;
      s += `<path d="M53 66.5 Q60 63.5 67 66.5 Q60 65.6 53 66.5 Z" fill="${hc}" stroke="${hc}" stroke-width="1.6"/>`;
    }
    s += hairFront(L, hc, hl);

    // Accesorios
    const gold = '#e8b54a';
    switch (L.acc) {
      case 'tie': s += `<path d="M57.5 87 L62.5 87 L61.6 92 L58.4 92 Z" fill="${shade(gold, -0.35)}"/><path d="M58.4 92 L61.6 92 L64 112 L60 117 L56 112 Z" fill="${shade(gold, -0.25)}"/>`; break;
      case 'bowtie': s += `<path d="M60 89 L50 84.5 L50 93.5 Z M60 89 L70 84.5 L70 93.5 Z" fill="#0b0b0e"/><rect x="58" y="87" width="4" height="4" rx="1" fill="#1b1b20"/>`; break;
      case 'glasses': s += `<g fill="none" stroke="${gold}" stroke-width="1.1"><rect x="45" y="47" width="13" height="8.5" rx="3"/><rect x="62" y="47" width="13" height="8.5" rx="3"/><path d="M58 50 Q60 48.6 62 50"/></g>`; break;
      case 'shades': s += `<g fill="#0b0b10" stroke="#1d1d24" stroke-width=".8"><rect x="44.5" y="46.5" width="14" height="9" rx="3.5"/><rect x="61.5" y="46.5" width="14" height="9" rx="3.5"/></g><path d="M58.5 49.5 L61.5 49.5" stroke="#1d1d24" stroke-width="1"/><path d="M47 48.5 L52 48.5" stroke="#fff" stroke-width=".7" opacity=".4"/>`; break;
      case 'hat': s += `<ellipse cx="60" cy="27" rx="33" ry="5.5" fill="#141418"/><path d="M42 27 C42 10 78 10 78 27 Z" fill="#1d1d22"/><path d="M42.6 24 L77.4 24 L77.8 27 L42.2 27 Z" fill="${gold}" opacity=".85"/>`; break;
      case 'earrings': s += `<circle cx="${60 - rx}" cy="60" r="2.2" fill="${gold}"/><circle cx="${60 + rx}" cy="60" r="2.2" fill="${gold}"/>`; break;
      case 'necklace': s += `<path d="M50 89 Q60 101 70 89" stroke="${gold}" stroke-width="1.3" fill="none"/><circle cx="60" cy="96" r="2.2" fill="${gold}"/>`; break;
      case 'pearls': {
        let p = '';
        for (let i = 0; i <= 10; i++) { const t = i / 10; const x = 50 + t * 20; const y = 89 + Math.sin(t * Math.PI) * 9; p += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="#f4f1ea"/>`; }
        s += p; break;
      }
      default:
    }
    return s + '</svg>';
  }

  /** Avatar listo para el DOM: foto subida o retrato del personaje. */
  function avatarHTML(look, img, extra) {
    const inner = img ? `<img src="${img}" alt="" draggable="false"/>` : portraitSVG(look);
    return `<span class="pv-avatar${extra ? ' ' + extra : ''}">${inner}</span>`;
  }

  /** Reduce una imagen subida a 160×160 JPEG (≈10 KB) para guardarla en el perfil. */
  function processUpload(file) {
    return new Promise((resolveP, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Elige una imagen (JPG, PNG o WebP).'));
      if (file.size > 8 * 1024 * 1024) return reject(new Error('La imagen supera 8 MB.'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const S = 160;
        const c = document.createElement('canvas');
        c.width = c.height = S;
        const g = c.getContext('2d');
        const side = Math.min(img.width, img.height);
        g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
        URL.revokeObjectURL(url);
        resolveP(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }

  PVP.Avatars = { ROSTER, SKIN, SUIT_COLORS, HAIR_STYLES, HAIR_COLORS, ACCESSORIES, resolve, randomLook, portraitSVG, avatarHTML, processUpload, shade, base };
})(typeof window !== 'undefined' ? window : globalThis);
