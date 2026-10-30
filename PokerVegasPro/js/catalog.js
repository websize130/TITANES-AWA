/* PokerVegasPro — catálogo de mesas, barajas, niveles de suscripción, apuestas y torneos. */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  // free < elite (Pack Élite, 4,99 €/mes) < legend (Pack Leyenda, 9,99 €/mes: acceso total + Coach).
  const TIERS = {
    free: { id: 'free', name: 'Gratis', short: 'Gratis', price: 0, rank: 0 },
    elite: { id: 'elite', name: 'Pack Élite', short: 'Élite', price: 4.99, rank: 1 },
    legend: { id: 'legend', name: 'Pack Leyenda', short: 'Leyenda', price: 9.99, rank: 2 },
  };

  /* Cada mesa define colores para la vista 2D (CSS) y la 3D (Three.js). */
  const TABLES = [
    {
      id: 'classic', name: 'Casino Clásico', tier: 'free', desc: 'Tapete verde esmeralda y madera noble con ribete dorado.',
      felt: ['#1f7a4d', '#0b3d26'], rim: ['#4a2a14', '#1d0f06'], accent: '#e8b54a', bg: ['#14070f', '#050307'],
      fx: 'none', three: { felt: 0x1a6b43, rim: 0x3a1e0c, accent: 0xe8b54a, fog: 0x07040a, floor: 0x120a08 },
    },
    {
      id: 'beach', name: 'Playa', tier: 'free', desc: 'Atardecer en la costa, tapete turquesa y borde de arena.',
      felt: ['#1aa3a3', '#0b5560'], rim: ['#d8b98a', '#8a6a3e'], accent: '#ffcf7a', bg: ['#ff9a5a', '#3a1d4f'],
      fx: 'waves', three: { felt: 0x168c8c, rim: 0xc9a675, accent: 0xffcf7a, fog: 0x4a2a52, floor: 0xd9b98a },
    },
    {
      id: 'forest', name: 'Bosque', tier: 'free', desc: 'Musgo profundo, roble tallado y luciérnagas.',
      felt: ['#3f6b35', '#1a3017'], rim: ['#5a3d22', '#2a1a0c'], accent: '#c9e27a', bg: ['#0d1f12', '#030905'],
      fx: 'fireflies', three: { felt: 0x365d2d, rim: 0x4a3018, accent: 0xc9e27a, fog: 0x06120a, floor: 0x0f1a0c },
    },
    {
      id: 'space', name: 'Espacio', tier: 'elite', desc: 'Nebulosa violeta flotando entre estrellas.',
      felt: ['#3b2a7a', '#120a33'], rim: ['#7f8aa3', '#2a2f3d'], accent: '#9ad7ff', bg: ['#140b33', '#020108'],
      fx: 'stars', three: { felt: 0x34246e, rim: 0x737d94, accent: 0x9ad7ff, fog: 0x05020f, floor: 0x0a0618 },
    },
    {
      id: 'underwater', name: 'Bajo el Agua', tier: 'elite', desc: 'Arrecife y burbujas. Un tiburón cruza la mesa en cada All-In.',
      felt: ['#0f6f8f', '#062a45'], rim: ['#3a8f8a', '#0e3b3f'], accent: '#7ff3ff', bg: ['#04406b', '#010d1f'],
      fx: 'bubbles', shark: true, three: { felt: 0x0d6280, rim: 0x2f7c78, accent: 0x7ff3ff, fog: 0x032a48, floor: 0x062038 },
    },
    {
      id: 'balloon', name: 'Globo Aerostático', tier: 'legend', desc: 'Una mesa suspendida sobre las nubes al amanecer.',
      felt: ['#b8434d', '#5a1520'], rim: ['#c79a5b', '#6b4a22'], accent: '#ffe2a8', bg: ['#ffb58a', '#5f7fc4'],
      fx: 'clouds', three: { felt: 0xa63a45, rim: 0xb88a50, accent: 0xffe2a8, fog: 0x9fb6e0, floor: 0xf2e6d6 },
    },
    {
      id: 'cyberpunk', name: 'Cyberpunk', tier: 'legend', desc: 'Neón magenta y cian sobre fibra de carbono.',
      felt: ['#1b1030', '#07040f'], rim: ['#16161d', '#050508'], accent: '#ff2bd6', bg: ['#1a0630', '#000000'],
      fx: 'grid', neon: true, three: { felt: 0x150c26, rim: 0x101016, accent: 0xff2bd6, fog: 0x0a0214, floor: 0x050208 },
    },
    {
      id: 'royale', name: 'Vegas Royale', tier: 'legend', desc: 'Mesa VIP de acceso total: terciopelo negro y oro de 24K.',
      felt: ['#2a1a1f', '#0a0507'], rim: ['#d4a63a', '#6b4a10'], accent: '#ffd76a', bg: ['#2a0a18', '#050205'],
      fx: 'marquee', three: { felt: 0x24151a, rim: 0xc79a2e, accent: 0xffd76a, fog: 0x0a0306, floor: 0x0d0607 },
    },
  ];

  /* Barajas: 2 gratuitas, 5 épicas (Pack Élite) y 3 de lujo (Pack Leyenda). */
  const DECKS = [
    { id: 'classic', name: 'Clásica', tier: 'free', rarity: 'Estándar', back: ['#b3122e', '#5e0716'], face: 'light' },
    { id: 'noir', name: 'Noir', tier: 'free', rarity: 'Estándar', back: ['#1d1d22', '#050506'], face: 'dark' },
    { id: 'ruby', name: 'Rubí', tier: 'elite', rarity: 'Épica', back: ['#ff3d6e', '#7a0030'], face: 'light' },
    { id: 'emerald', name: 'Esmeralda', tier: 'elite', rarity: 'Épica', back: ['#2fe39a', '#05613f'], face: 'light' },
    { id: 'sapphire', name: 'Zafiro', tier: 'elite', rarity: 'Épica', back: ['#4d8bff', '#0b2a7a'], face: 'light' },
    { id: 'amethyst', name: 'Amatista', tier: 'elite', rarity: 'Épica', back: ['#b06bff', '#3d0b7a'], face: 'light' },
    { id: 'sunset', name: 'Atardecer', tier: 'elite', rarity: 'Épica', back: ['#ffb347', '#ff3d7f'], face: 'light' },
    { id: 'gold', name: 'Oro 24K', tier: 'legend', rarity: 'Lujo', back: ['#ffe08a', '#a8740f'], face: 'gold', fx: 'Brillo dorado' },
    { id: 'holo', name: 'Holográfica', tier: 'legend', rarity: 'Lujo', back: ['#9ff', '#f9f'], face: 'holo', fx: 'Reflejo holográfico' },
    { id: 'neon', name: 'Neón', tier: 'legend', rarity: 'Lujo', back: ['#ff2bd6', '#00f0ff'], face: 'neon', fx: 'Brillo neón' },
  ];

  /* Mesas públicas (cash): compra de entrada con monedas. */
  const STAKES = [
    { id: 'micro', name: 'Micro', sb: 25, bb: 50, buyIn: 5000 },
    { id: 'low', name: 'Baja', sb: 100, bb: 200, buyIn: 20000 },
    { id: 'mid', name: 'Media', sb: 500, bb: 1000, buyIn: 100000 },
    { id: 'high', name: 'High Roller', sb: 2500, bb: 5000, buyIn: 500000 },
  ];

  /* Torneos por rangos: ciegas que suben cada `handsPerLevel` manos. */
  const TOURNAMENTS = [
    { id: 'bronze', name: 'Bronce', fee: 1000, prize: 10000, stack: 10000, players: 6, bot: 'easy', handsPerLevel: 8, sb: 50, color: ['#e0a77a', '#7a4320'] },
    { id: 'silver', name: 'Plata', fee: 10000, prize: 100000, stack: 50000, players: 8, bot: 'medium', handsPerLevel: 8, sb: 250, color: ['#eef2f7', '#7d8796'] },
    { id: 'gold', name: 'Oro', fee: 100000, prize: 1000000, stack: 200000, players: 9, bot: 'mixed', handsPerLevel: 7, sb: 1000, color: ['#ffe08a', '#a8740f'] },
    { id: 'diamond', name: 'Diamante', fee: 1000000, prize: 10000000, stack: 1000000, players: 10, bot: 'hard', handsPerLevel: 7, sb: 5000, color: ['#c9f6ff', '#4aa8d8'] },
  ];
  const PAYOUTS = [0.6, 0.25, 0.15];

  /* Escalera de ciegas progresivas (multiplicadores sobre la ciega pequeña inicial). */
  const BLIND_LADDER = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 40, 60, 80, 100, 150, 200, 300, 400];

  const EMOTES = ['😀', '😂', '😎', '🤔', '😱', '😡', '👏', '🔥', '💰', '🍀', '🦈', '👑'];

  function tierAllows(userTier, itemTier) {
    return (TIERS[userTier] || TIERS.free).rank >= TIERS[itemTier].rank;
  }

  function table(id) { return TABLES.find((t) => t.id === id) || TABLES[0]; }
  function deck(id) { return DECKS.find((d) => d.id === id) || DECKS[0]; }

  PVP.Catalog = { TIERS, TABLES, DECKS, STAKES, TOURNAMENTS, PAYOUTS, BLIND_LADDER, EMOTES, tierAllows, table, deck };
})(typeof window !== 'undefined' ? window : globalThis);
