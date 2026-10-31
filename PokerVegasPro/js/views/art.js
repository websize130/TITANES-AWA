/* PokerVegasPro — arte vectorial compartido: crupier, cartas, fichas y avatares (DOM/SVG). */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const U = PVP.util;

  /** Crupier con traje formal (SVG animado por CSS: respiración, parpadeo y brazo de reparto). */
  function dealerSVG() {
    return `
<svg class="dealer-svg" viewBox="0 0 220 190" aria-label="Crupier" role="img">
  <defs>
    <linearGradient id="dl-jacket" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26262c"/><stop offset="1" stop-color="#08080a"/></linearGradient>
    <linearGradient id="dl-satin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4a55"/><stop offset=".5" stop-color="#16161b"/><stop offset="1" stop-color="#3a3a44"/></linearGradient>
    <linearGradient id="dl-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1c7a2"/><stop offset="1" stop-color="#d49f78"/></linearGradient>
    <linearGradient id="dl-hair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2618"/><stop offset="1" stop-color="#120a05"/></linearGradient>
    <linearGradient id="dl-vest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f1d2c"/><stop offset="1" stop-color="#4a0b14"/></linearGradient>
    <linearGradient id="dl-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8740f"/><stop offset=".5" stop-color="#ffe08a"/><stop offset="1" stop-color="#a8740f"/></linearGradient>
  </defs>
  <g class="dl-body">
    <!-- torso y chaqueta -->
    <path d="M30 190 C34 140 58 120 88 112 L132 112 C162 120 186 140 190 190 Z" fill="url(#dl-jacket)"/>
    <path d="M92 112 L110 168 L128 112 Z" fill="#f6f3ee"/>
    <path d="M96 128 L110 168 L124 128 L118 190 L102 190 Z" fill="url(#dl-vest)"/>
    <path d="M88 112 L110 172 L96 190 L70 190 L76 132 Z" fill="url(#dl-satin)" opacity=".95"/>
    <path d="M132 112 L110 172 L124 190 L150 190 L144 132 Z" fill="url(#dl-satin)" opacity=".95"/>
    <circle cx="110" cy="150" r="1.6" fill="#d9b25a"/><circle cx="110" cy="160" r="1.6" fill="#d9b25a"/>
    <rect x="138" y="140" width="30" height="9" rx="2" fill="url(#dl-gold)"/>
    <text x="153" y="147" font-size="6" text-anchor="middle" fill="#2a1a05" font-family="Oswald, sans-serif" letter-spacing=".5">DEALER</text>
    <!-- cuello y pajarita -->
    <rect x="99" y="96" width="22" height="20" rx="6" fill="url(#dl-skin)"/>
    <path d="M94 110 L110 116 L126 110 L126 116 L110 122 L94 116 Z" fill="#f6f3ee"/>
    <path d="M96 114 L108 119 L96 125 Z M124 114 L112 119 L124 125 Z" fill="#0b0b0e"/>
    <rect x="106" y="116" width="8" height="6" rx="2" fill="#1d1d22"/>
    <!-- cabeza -->
    <g class="dl-head">
      <ellipse cx="82" cy="72" rx="5" ry="8" fill="#e2b089"/>
      <ellipse cx="138" cy="72" rx="5" ry="8" fill="#e2b089"/>
      <ellipse cx="110" cy="68" rx="27" ry="33" fill="url(#dl-skin)"/>
      <path d="M82 62 C80 34 98 26 112 27 C130 27 142 38 139 62 C134 48 124 42 108 43 C96 44 88 50 82 62 Z" fill="url(#dl-hair)"/>
      <path d="M96 56 Q102 53 106 56 M114 56 Q119 53 125 56" stroke="#2a1a10" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <g class="dl-eyes">
        <ellipse cx="101" cy="65" rx="3.4" ry="3.8" fill="#fff"/><circle cx="101.5" cy="65.5" r="2" fill="#2a1a10"/>
        <ellipse cx="119" cy="65" rx="3.4" ry="3.8" fill="#fff"/><circle cx="119.5" cy="65.5" r="2" fill="#2a1a10"/>
      </g>
      <path d="M110 68 Q107 78 110 80 Q112 81 113 79" stroke="#b9805a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M100 87 Q110 94 120 87" stroke="#8a3b2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M97 84 Q110 88 123 84" stroke="#2a1a10" stroke-width="1.2" fill="none" opacity=".35"/>
    </g>
  </g>
  <!-- brazo izquierdo con la baraja -->
  <g class="dl-arm-l">
    <path d="M52 150 C60 170 78 178 92 176" stroke="url(#dl-jacket)" stroke-width="20" fill="none" stroke-linecap="round"/>
    <rect x="84" y="168" width="12" height="12" rx="3" fill="#f6f3ee"/>
    <rect x="92" y="164" width="22" height="14" rx="2" fill="#7a0d1e" stroke="#e8b54a" stroke-width="1"/>
    <rect x="93" y="162" width="22" height="14" rx="2" fill="#a3132b" stroke="#e8b54a" stroke-width="1"/>
    <ellipse cx="100" cy="174" rx="8" ry="6" fill="url(#dl-skin)"/>
  </g>
  <!-- brazo derecho: reparte -->
  <g class="dl-arm-r">
    <path d="M168 150 C162 170 146 178 132 178" stroke="url(#dl-jacket)" stroke-width="20" fill="none" stroke-linecap="round"/>
    <rect x="124" y="171" width="12" height="12" rx="3" fill="#f6f3ee"/>
    <ellipse cx="122" cy="177" rx="8" ry="6" fill="url(#dl-skin)"/>
    <rect class="dl-card" x="108" y="170" width="13" height="18" rx="2" fill="#a3132b" stroke="#e8b54a" stroke-width="1"/>
  </g>
</svg>`;
  }

  /* Palos vectoriales en una caja de 100×100 (♠ ♥ ♦ ♣, mismo orden que PVP.Cards.SUITS).
   * Las fuentes del sistema dibujan el trébol con proporciones distintas en cada plataforma; estos trazados no. */
  const SUIT_PATHS = [
    ['M50 4 C58 18 72 28 84 40 C96 52 97 70 84 79 C74 86 61 83 54 74 C55 84 58 91 66 96 L34 96 C42 91 45 84 46 74 C39 83 26 86 16 79 C3 70 4 52 16 40 C28 28 42 18 50 4 Z'],
    ['M50 92 C38 80 6 62 6 34 C6 17 19 6 32 6 C41 6 47 11 50 18 C53 11 59 6 68 6 C81 6 94 17 94 34 C94 62 62 80 50 92 Z'],
    ['M50 3 C59 18 72 35 88 50 C72 65 59 82 50 97 C41 82 28 65 12 50 C28 35 41 18 50 3 Z'],
    [
      'M31 27 a19 19 0 1 0 38 0 a19 19 0 1 0 -38 0 Z', 'M8 58 a19 19 0 1 0 38 0 a19 19 0 1 0 -38 0 Z',
      'M54 58 a19 19 0 1 0 38 0 a19 19 0 1 0 -38 0 Z', 'M50 30 L28 60 L72 60 Z',
      'M46.5 56 C46.5 76 42 88 32 96 L68 96 C58 88 53.5 76 53.5 56 Z',
    ],
  ];

  function suitSVG(suit, cls) {
    return `<svg class="suit${cls ? ' ' + cls : ''}" viewBox="0 0 100 100" aria-hidden="true">${SUIT_PATHS[suit].map((d) => `<path d="${d}"/>`).join('')}</svg>`;
  }

  /** Carta HTML. `c` < 0 = carta desconocida (nunca se pone su valor en el DOM). */
  function cardHTML(c, deckId, faceUp, extra) {
    const known = c >= 0;
    let front = '';
    let red = '';
    if (known) {
      const i = PVP.Cards.cardInfo(c);
      const s = PVP.Cards.suitOf(c);
      red = i.red ? ' red' : '';
      const label = `${i.rank} de ${['picas', 'corazones', 'diamantes', 'tréboles'][s]}`;
      front = `<span class="pc-corner tl">${i.rank}${suitSVG(s)}</span><span class="pc-pip">${suitSVG(s)}</span><span class="pc-corner br">${i.rank}${suitSVG(s)}</span><span class="sr-only">${label}</span>`;
    }
    return `<div class="pcard deck-${deckId}${red}${faceUp && known ? ' up' : ''}${extra ? ' ' + extra : ''}" data-c="${known ? c : ''}">
      <div class="pc-inner"><div class="pc-face pc-front">${front}</div><div class="pc-face pc-back"><span class="pc-emblem">${suitSVG(0)}</span></div></div></div>`;
  }

  /** Emblema grabado en el centro del tapete (trazo con el color de acento de la mesa). */
  const EMBLEMS = {
    space: '<circle cx="50" cy="50" r="18"/><ellipse cx="50" cy="50" rx="40" ry="11" transform="rotate(-18 50 50)"/><circle cx="80" cy="22" r="2.5"/><circle cx="18" cy="76" r="1.8"/>',
    underwater: '<path d="M50 14v72M50 14l-7 12M50 14l7 12M30 30v18a20 20 0 0 0 40 0V30M30 30l-5 9M30 30l5 9M70 30l-5 9M70 30l5 9"/><path d="M38 86h24"/>',
    balloon: '<path d="M50 12c-17 0-28 13-28 28 0 17 16 28 22 36h12c6-8 22-19 22-36 0-15-11-28-28-28Z"/><path d="M50 12c-8 10-10 22-10 28 0 14 4 26 4 36M50 12c8 10 10 22 10 28 0 14-4 26-4 36"/><path d="M44 76l-2 8h16l-2-8"/><rect x="42" y="84" width="16" height="8" rx="1"/>',
    cyberpunk: '<path d="M50 12C40 30 20 38 20 56c0 10 8 17 17 17 5 0 9-2 11-5-1 6-3 11-8 16h20c-5-5-7-10-8-16 2 3 6 5 11 5 9 0 17-7 17-17 0-18-20-26-30-44Z"/><path d="M10 50h8M82 50h8M50 2v6" opacity=".7"/>',
    royale: '<path d="M18 70l-4-36 20 16 16-26 16 26 20-16-4 36Z"/><path d="M18 80h64"/><circle cx="14" cy="32" r="3"/><circle cx="50" cy="22" r="3"/><circle cx="86" cy="32" r="3"/><path d="M40 58h20M50 48v20" opacity=".7"/>',
    beach: '<circle cx="50" cy="44" r="16"/><path d="M14 70c8-6 14-6 22 0s14 6 22 0 14-6 22 0M22 82c6-4 12-4 18 0s12 4 18 0 12-4 18 0"/>',
    forest: '<path d="M50 12c18 14 26 30 20 46-4 10-12 16-20 18-8-2-16-8-20-18-6-16 2-32 20-46Z"/><path d="M50 30v62M50 48l-10-8M50 60l12-9"/>',
  };
  function tableEmblem(id) {
    return EMBLEMS[id] ? `<svg viewBox="0 0 100 100" aria-hidden="true">${EMBLEMS[id]}</svg>` : '';
  }

  /** Mini vista previa de una mesa para el catálogo. */
  function tableSwatch(t) {
    return `<div class="swatch-table" data-t="${t.id}" style="--f1:${t.felt[0]};--f2:${t.felt[1]};--r1:${t.rim[0]};--r2:${t.rim[1]};--acc:${t.accent};--bg1:${t.bg[0]};--bg2:${t.bg[1]}">
      <div class="swatch-felt"><span>♠</span></div></div>`;
  }

  const CHIP_COLORS = [
    [1e6, '#1c1c1c', '#ffd76a'], [1e5, '#7a1fa2', '#fff'], [1e4, '#e8b54a', '#2a1a05'],
    [1e3, '#111', '#e8b54a'], [500, '#6b2bd9', '#fff'], [100, '#1d1d22', '#fff'],
    [25, '#1f8a4c', '#fff'], [5, '#c1121f', '#fff'], [0, '#eaeaea', '#c1121f'],
  ];
  function chipColor(v) {
    for (const [min, bg, fg] of CHIP_COLORS) if (v >= min) return [bg, fg];
    return CHIP_COLORS[CHIP_COLORS.length - 1].slice(1);
  }

  /** Pila de fichas proporcional a la cantidad apostada. */
  function chipStackHTML(amount) {
    if (!amount) return '';
    const n = U.clamp(Math.ceil(Math.log10(amount + 1) * 1.4), 1, 6);
    const [bg, fg] = chipColor(amount / 4);
    let chips = '';
    for (let i = 0; i < n; i++) chips += `<i class="chip" style="--cb:${bg};--cf:${fg};--i:${i}"></i>`;
    return `<span class="chip-stack">${chips}</span><span class="chip-amt">${U.short(amount)}</span>`;
  }

  function avatarHTML(p, isHero) {
    if (PVP.Avatars && (p.look || p.img)) return PVP.Avatars.avatarHTML(p.look, p.img, 'avatar' + (isHero ? ' hero' : ''));
    const hue = isHero ? 42 : p.hue || 200;
    return `<div class="avatar${isHero ? ' hero' : ''}" style="--h:${hue}"><span>${U.esc(U.initials(p.name))}</span></div>`;
  }

  /** Tiburón SVG para la animación de All-In en la mesa "Bajo el Agua". */
  function sharkSVG() {
    return `<svg viewBox="0 0 300 120" class="shark-svg"><path d="M10 64 C60 30 150 26 220 46 L262 18 L254 54 C270 58 284 64 296 72 C284 80 270 84 254 88 L262 110 L222 92 C150 108 70 104 10 64 Z" fill="#5d7f97"/>
      <path d="M40 70 C100 92 170 94 230 84 C170 100 90 96 40 70 Z" fill="#dfeaf2"/><path d="M130 40 L150 6 L168 40 Z" fill="#4c6a80"/>
      <circle cx="52" cy="58" r="3.5" fill="#0b1a24"/><path d="M30 72 L54 76 L36 80" stroke="#fff" stroke-width="2" fill="none"/></svg>`;
  }

  PVP.Art = { SUIT_PATHS, suitSVG, dealerSVG, cardHTML, tableSwatch, tableEmblem, chipStackHTML, chipColor, avatarHTML, sharkSVG };
})(typeof window !== 'undefined' ? window : globalThis);
