/* =========================================================
   Web Size — Landing · JavaScript vanilla
   ========================================================= */
(() => {
  'use strict';

  /* ---------- CONFIGURACIÓN ----------
     ⚠️ MARCADOR TEMPORAL: sustituye por tu número real en formato
     internacional, solo dígitos, sin "+", espacios ni guiones.
     Ejemplo España: 34612345678                                    */
  const WHATSAPP_NUMBER = '34600000000';

  const GENERAL_MESSAGE =
    'Hola Web Size 👋 He visto vuestra web y me gustaría hablar sobre un proyecto para mi negocio.';

  /* ---------- SECTORES (5 móviles · negocios ficticios de maqueta) ---------- */
  const SECTORS = [
    {
      id: 'taller', label: 'Taller Mecánico',
      brand: 'Turbo', brandAccent: 'Fix', brandSub: 'TALLER MECÁNICO', logo: 'gear',
      theme: 'dark', art: 'gear', skyline: true,
      acc: '#ff8a1f',
      bg: 'radial-gradient(90% 55% at 85% 12%, rgba(255,138,31,.35), transparent 60%), linear-gradient(180deg,#17110b,#0a0806)',
      cta: 'linear-gradient(180deg,#ffc061,#ff7a00)', ctaTxt: '#1a0b00', ctaIcon: 'wa',
      ctaLabel: 'Pedir cita ya',
      lines: [{ t: 'Tu coche' }, { t: 'a punto' }, { t: 'en 24 h', hl: true }, { t: 'sin sorpresas' }],
      services: [['wrench', 'Mecánica'], ['shield', 'Pre‑ITV'], ['car', 'Neumáticos']],
      trustStyle: 'list', trust: ['Diagnosis en el día', 'Presupuesto cerrado', 'Coche de sustitución'],
      location: 'Polígono Norte, nave 12',
      message: 'Hola Web Size 👋 Tengo un taller mecánico y quiero una web que me traiga más citas y presupuestos por WhatsApp. ¿Hablamos?',
    },
    {
      id: 'estetica', label: 'Centro de Estética',
      brand: 'Lumière', brandAccent: '', brandSub: 'CENTRO DE ESTÉTICA', logo: 'lotus',
      theme: 'dark', art: 'lotus', serif: true,
      acc: '#e9c49a',
      bg: 'radial-gradient(90% 55% at 80% 15%, rgba(233,196,154,.32), transparent 60%), linear-gradient(180deg,#2b1d16,#120b08)',
      cta: 'linear-gradient(180deg,#34d399,#059669)', ctaTxt: '#ffffff', ctaIcon: 'wa',
      ctaLabel: 'Reservar cita por WhatsApp',
      lines: [{ t: 'Belleza y' }, { t: 'bienestar', hl: true }, { t: 'en las mejores' }, { t: 'manos' }],
      svcStyle: 'tiles', services: [['sparkle', 'Faciales'], ['body', 'Corporales'], ['stones', 'Masajes']],
      trustStyle: 'row', trust: [['lotus', 'Centro profesional'], ['gem', 'Resultados visibles'], ['heart', 'Tu bienestar']],
      location: 'Calle Mayor 8 · Cita previa',
      message: 'Hola Web Size 👋 Tengo un centro de estética y me interesa una web con reservas por WhatsApp. ¿Me contáis cómo funciona?',
    },
    {
      id: 'fontanero', label: 'Fontanero / Urgencias',
      brand: 'Aqua', brandAccent: 'Pronto', brandSub: 'FONTANERÍA 24 H', logo: 'drop',
      theme: 'dark', art: 'faucet', skyline: true,
      acc: '#38bdf8',
      bg: 'radial-gradient(90% 55% at 85% 12%, rgba(56,189,248,.38), transparent 60%), linear-gradient(180deg,#0c1d42,#050b1c)',
      cta: 'linear-gradient(180deg,#ff5a5f,#d90429)', ctaTxt: '#ffffff', ctaIcon: 'wa',
      ctaLabel: '¡Urgencia ahora!',
      lines: [{ t: 'Fontaneros de' }, { t: 'Urgencia' }, { t: '24 Horas', hl: true }, { t: 'en tu ciudad' }],
      services: [['drop', 'Fugas'], ['pipe', 'Desatascos'], ['radiator', 'Calefacción']],
      trustStyle: 'row', trust: [['bolt', 'Llegada en 30 min'], ['shield', 'Servicio garantizado'], ['thumb', 'Precios justos']],
      location: 'Tu ciudad y alrededores',
      message: 'Hola Web Size 👋 Soy fontanero y hago urgencias. Quiero una web que haga sonar mi WhatsApp con clientes de mi zona. ¿Hablamos?',
    },
    {
      id: 'dental', label: 'Clínica Dental',
      brand: 'Denti', brandAccent: 'va', brandSub: 'CLÍNICA DENTAL', logo: 'tooth',
      theme: 'light', art: 'tooth',
      acc: '#2563eb',
      bg: 'radial-gradient(90% 50% at 85% 18%, rgba(147,197,253,.55), transparent 60%), linear-gradient(180deg,#f5f8ff,#e4ecfb)',
      cta: 'linear-gradient(180deg,#3b82f6,#1d4ed8)', ctaTxt: '#ffffff', ctaIcon: 'calendar',
      ctaLabel: 'Pedir cita online',
      lines: [{ t: 'Tu sonrisa,' }, { t: 'nuestra prioridad', hl: true }],
      lead: 'Odontología avanzada para toda la familia',
      svcStyle: 'tiles', services: [['tooth', 'Implantes'], ['braces', 'Ortodoncia'], ['smile', 'Estética dental']],
      trustStyle: 'card', trust: 'Sonríe con confianza',
      location: '1ª visita sin compromiso',
      message: 'Hola Web Size 👋 Tengo una clínica dental y quiero captar más primeras visitas con una web profesional. ¿Podemos hablar?',
    },
    {
      id: 'fisio', label: 'Fisioterapia',
      brand: 'Kinetic', brandAccent: 'Fisio', brandSub: 'FISIOTERAPIA DEPORTIVA', logo: 'run',
      theme: 'dark', art: 'runner',
      acc: '#a3e635',
      bg: 'radial-gradient(90% 55% at 85% 12%, rgba(163,230,53,.28), transparent 60%), linear-gradient(180deg,#0d1c14,#060f0a)',
      cta: 'linear-gradient(180deg,#d9f99d,#65a30d)', ctaTxt: '#0b1a05', ctaIcon: 'wa',
      ctaLabel: 'Reservar sesión',
      lines: [{ t: 'Vuelve a' }, { t: 'moverte' }, { t: 'sin dolor', hl: true }],
      lead: 'Lesiones, espalda y readaptación',
      services: [['spine', 'Espalda'], ['run', 'Deportiva'], ['hand', 'Masaje']],
      trustStyle: 'row', trust: [['clock', 'Sesión de 50 min'], ['target', 'Plan a medida'], ['calendar', 'Cita en 24h']],
      location: 'Junto al polideportivo',
      message: 'Hola Web Size 👋 Tengo un centro de fisioterapia y quiero una web que me llene la agenda por WhatsApp. ¿Hablamos?',
    },
  ];

  /* ---------- Utilidades ---------- */
  const waLink = (msg) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

  const el = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  };

  const hexToRgba = (hex, a) => {
    const v = parseInt(hex.slice(1), 16);
    return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${a})`;
  };

  const WA_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.93.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.4 9.4 0 0 1 2.77 6.7c0 5.23-4.25 9.47-9.47 9.47zm8.06-17.53A11.33 11.33 0 0 0 12.04.63C5.76.63.65 5.74.65 12.02c0 2 .53 3.96 1.52 5.69L.55 23.63l6.05-1.59a11.36 11.36 0 0 0 5.44 1.39c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.34-8.06z"/></svg>';

  /* ---------- Toast ---------- */
  const toast = el('div', 'toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };

  /* ---------- Enlaces generales de WhatsApp ---------- */
  document.querySelectorAll('[data-wa="general"]').forEach((a) => {
    a.href = waLink(GENERAL_MESSAGE);
  });

  /* ---------- Iconos de línea para las maquetas ---------- */
  const ICONS = {
    drop: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>',
    pipe: '<path d="M3 7h9a4 4 0 0 1 4 4v10"/><path d="M3 12h6a2 2 0 0 1 2 2v7"/><path d="M13.5 21h5"/>',
    radiator: '<path d="M6 5v14M10 5v14M14 5v14M18 5v14M4 8h16M4 16h16"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    car: '<path d="M3 13l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v5h-3v-2H6v2H3z"/><path d="M3 13h18"/><circle cx="7.5" cy="15.2" r=".6"/><circle cx="16.5" cy="15.2" r=".6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    thumb: '<path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 6.5a2 2 0 0 1-2 1.7H7"/>',
    lotus: '<path d="M12 19c-3-2-4.5-5-4-9 2 1 3.5 2.5 4 4.5.5-2 2-3.5 4-4.5.5 4-1 7-4 9z"/><path d="M12 19c-4 0-7.5-2-9-5.5 2.5-.5 5 .5 7 2.5M12 19c4 0 7.5-2 9-5.5-2.5-.5-5 .5-7 2.5"/><path d="M12 10.5C11 8 11 5.5 12 3c1 2.5 1 5 0 7.5"/>',
    sparkle: '<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
    body: '<path d="M8 3c0 4 1.5 6 1.5 9S7 17 8 21M16 3c0 4-1.5 6-1.5 9s2.5 5 1.5 9"/><path d="M9.5 12h5"/>',
    stones: '<ellipse cx="12" cy="18" rx="8" ry="3"/><ellipse cx="12" cy="12.5" rx="6" ry="2.5"/><ellipse cx="12" cy="7.5" rx="4" ry="2"/>',
    gem: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3L8 9l4 12 4-12-1-6"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
    tooth: '<path d="M7.5 3C5 3 3.5 5 3.5 8c0 3.5 1.8 5 2.3 8 .4 2.6 1 5 2.4 5 1.6 0 1.4-4.5 3.8-4.5s2.2 4.5 3.8 4.5c1.4 0 2-2.4 2.4-5 .5-3 2.3-4.5 2.3-8 0-3-1.5-5-4-5-2 0-3 1-4.5 1S9.5 3 7.5 3z"/>',
    braces: '<rect x="3" y="8" width="18" height="8" rx="3"/><path d="M8 8v8M12 8v8M16 8v8M3 12h18"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01"/>',
    spine: '<path d="M12 3v18"/><path d="M9 5h6M8.5 9h7M8 13h8M8.5 17h7"/>',
    run: '<circle cx="14" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2v4M6 12l3-4 4 1 3 3 3-1M11 15l1-6"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11V4a1.5 1.5 0 0 1 3 0v7V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.7 7-6.5 7-2.6 0-4.3-1.4-5.3-3.6L4 14a1.5 1.5 0 0 1 2.6-1.5L8 14"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  };
  const icon = (name, sw = 1.8) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const WA_PATH = WA_ICON.match(/ d="([^"]+)"/)[1];
  const waGlyph = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg>`;

  /* Ilustraciones del hero de cada maqueta (SVG vectorial, sin imágenes externas) */
  const metal = (id) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset=".45" stop-color="#a1a7b3"/><stop offset=".55" stop-color="#5b616c"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient>`;

  const artSVG = (kind, id, acc) => {
    switch (kind) {
      case 'faucet': return `
        <svg viewBox="0 0 100 130" aria-hidden="true"><defs>${metal(id + 'm')}
          <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bae6fd" stop-opacity=".95"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></linearGradient></defs>
          <rect x="58" y="4" width="40" height="10" rx="5" fill="url(#${id}m)"/>
          <rect x="73" y="12" width="10" height="16" fill="url(#${id}m)"/>
          <path d="M104 26H50a24 24 0 0 0-24 24v8h18v-8a6 6 0 0 1 6-6h54z" fill="url(#${id}m)"/>
          <rect x="22" y="56" width="26" height="7" rx="2" fill="#cbd5e1"/>
          <rect x="27" y="63" width="16" height="67" fill="url(#${id}w)"/>
          <path class="mk-flow" d="M30 63v67M35 63v67M40 63v67" stroke="#f0f9ff" stroke-width="1.4" stroke-dasharray="5 9" fill="none"/>
        </svg>`;
      case 'gear': return `
        <svg viewBox="0 0 100 110" aria-hidden="true"><defs>${metal(id + 'm')}</defs>
          <g class="mk-spin" style="transform-origin:60px 42px">
            <circle cx="60" cy="42" r="27" fill="none" stroke="url(#${id}m)" stroke-width="10" stroke-dasharray="7 7.1"/>
            <circle cx="60" cy="42" r="22" fill="url(#${id}m)"/>
            <circle cx="60" cy="42" r="8" fill="#17110b" stroke="${acc}" stroke-width="2.5"/>
          </g>
          <g transform="translate(4 40) scale(3)"><path d="${ICONS.wrench.match(/ d="([^"]+)"/)[1]}" fill="url(#${id}m)" stroke="rgba(0,0,0,.5)" stroke-width=".3"/></g>
        </svg>`;
      case 'lotus': return `
        <svg viewBox="0 0 100 110" aria-hidden="true"><defs>
          <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3e0"/><stop offset=".5" stop-color="${acc}"/><stop offset="1" stop-color="#a0703f"/></linearGradient></defs>
          <g fill="${acc}" fill-opacity=".1" stroke="url(#${id}g)" stroke-width="1.8" stroke-linejoin="round">
            <path d="M50 72C42 58 28 52 12 54 18 68 32 74 50 72z"/><path d="M50 72C58 58 72 52 88 54 82 68 68 74 50 72z"/>
            <path d="M50 72C54 52 48 36 32 28 28 48 36 64 50 72z"/><path d="M50 72C46 52 52 36 68 28 72 48 64 64 50 72z"/>
            <path d="M50 16C61 33 62 54 50 72 38 54 39 33 50 16z"/>
          </g>
          <g fill="#fff"><circle class="mk-twinkle" cx="20" cy="26" r="1.6"/><circle class="mk-twinkle d2" cx="84" cy="22" r="1.2"/><circle class="mk-twinkle d3" cx="78" cy="88" r="1.4"/><circle class="mk-twinkle" cx="26" cy="90" r="1"/></g>
        </svg>`;
      case 'tooth': return `
        <svg viewBox="0 0 100 110" aria-hidden="true"><defs>
          <linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c7dbff"/></linearGradient></defs>
          <circle cx="54" cy="50" r="40" fill="#bfdbfe" opacity=".45"/>
          <g transform="translate(18 14) scale(3)"><path d="${ICONS.tooth.match(/ d="([^"]+)"/)[1]}" fill="url(#${id}t)" stroke="#93c5fd" stroke-width=".5"/></g>
          <path class="mk-twinkle" d="M80 14l2.4 6.6L89 23l-6.6 2.4L80 32l-2.4-6.6L71 23l6.6-2.4z" fill="#fff" stroke="#93c5fd" stroke-width=".8"/>
          <path class="mk-twinkle d2" d="M24 76l1.4 3.6 3.6 1.4-3.6 1.4L24 86l-1.4-3.6L19 81l3.6-1.4z" fill="#fff" stroke="#93c5fd" stroke-width=".6"/>
        </svg>`;
      case 'runner': return `
        <svg viewBox="0 0 100 110" aria-hidden="true"><defs>
          <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecfccb"/><stop offset="1" stop-color="${acc}"/></linearGradient></defs>
          <g fill="none" stroke="${acc}" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="3 5"><path d="M10 40c10-18 30-28 52-26"/><path d="M6 66c8-10 18-16 30-18"/></g>
          <circle cx="62" cy="16" r="8" fill="url(#${id}r)"/>
          <g fill="none" stroke="url(#${id}r)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M58 28L50 58"/><path d="M56 36l20-12M56 36L34 42"/><path d="M50 58l18 20-2 22M50 58L36 78 22 84"/>
          </g>
        </svg>`;
      default: return '';
    }
  };

  /* Silueta de ciudad para el pie de algunas maquetas */
  const SKYLINE = (() => {
    const H = [14, 22, 10, 30, 18, 26, 12, 36, 20, 16, 28, 11, 24, 19, 33, 15, 21, 27, 13];
    let x = 0, d = 'M0 42';
    H.forEach((h, i) => { const w = i % 3 ? 6 : 9; d += `V${42 - h}H${x + w}`; x += w; });
    return { d: `${d}V42Z`, w: x };
  })();

  const trustHTML = (s) => {
    if (s.trustStyle === 'list') {
      return `<ul class="mk-trust list">${s.trust.map((t) => `<li>${icon('check', 3)}${t}</li>`).join('')}</ul>`;
    }
    if (s.trustStyle === 'card') {
      return `<div class="mk-trust card">${icon('tooth', 1.5)}<strong>${s.trust}</strong></div>`;
    }
    return `<div class="mk-trust row">${s.trust.map(([ic, t]) => `<div>${icon(ic)}<span>${t}</span></div>`).join('')}</div>`;
  };

  /* ---------- Render de los 5 móviles ---------- */
  const row = document.getElementById('phoneRow');
  const center = (SECTORS.length - 1) / 2;

  SECTORS.forEach((s, i) => {
    const offset = i - center;
    const light = s.theme === 'light';

    const slot = el('div', 'phone-slot');
    slot.setAttribute('role', 'listitem');
    const vars = {
      '--offset': offset, '--abs': Math.abs(offset), '--delay': `${(-i * 1.15).toFixed(2)}s`,
      '--accent': s.acc, '--accent-light': light ? '#93c5fd' : s.acc,
      '--accent-soft': hexToRgba(s.acc, 0.28), '--accent-glow': hexToRgba(s.acc, 0.55),
      '--acc': s.acc, '--glow': hexToRgba(s.acc, 0.6), '--soft': hexToRgba(s.acc, 0.16),
      '--bg': s.bg, '--cta': s.cta, '--cta-txt': s.ctaTxt,
      '--txt': light ? '#0f2a5c' : '#ffffff',
      '--muted': light ? 'rgba(15,42,92,.65)' : 'rgba(255,255,255,.7)',
      '--card': light ? '#ffffff' : 'rgba(255,255,255,.06)',
      '--line': light ? 'rgba(37,99,235,.14)' : 'rgba(255,255,255,.1)',
    };
    Object.keys(vars).forEach((k) => slot.style.setProperty(k, vars[k]));

    const float = el('div', 'phone-float');
    const phone = el('div', 'phone');
    const screen = el('div', `screen mk ${light ? 'is-light' : ''}`);

    const lines = s.lines.map((l) => `<span class="${l.hl ? 'hl' : ''}">${l.t}</span>`).join('');
    const services = s.services.map(([ic, t]) => `<div class="mk-svc"><i>${icon(ic)}</i><span>${t}</span></div>`).join('');

    screen.innerHTML = `
      <div class="notch"></div>
      <div class="statusbar"><span>9:41</span><span class="sb-ico" aria-hidden="true"><i></i><i></i><i></i><b></b></span></div>
      <div class="mk-app">
        <span class="mk-logo">${icon(s.logo, 2)}</span>
        <span class="mk-brand"><b>${s.brand}<i>${s.brandAccent}</i></b><small>${s.brandSub}</small></span>
        <span class="mk-burger">${icon('menu', 2.2)}</span>
      </div>
      <div class="mk-hero">
        <div class="mk-art">${artSVG(s.art, `art-${s.id}`, s.acc)}</div>
        <h3 class="mk-h1 ${s.serif ? 'is-serif' : ''}">${lines}</h3>
        ${s.lead ? `<p class="mk-lead">${s.lead}</p>` : ''}
      </div>
      <a class="mk-cta" href="${waLink(s.message)}" target="_blank" rel="noopener noreferrer"
         aria-label="${s.ctaLabel} — enviar WhatsApp (${s.label})">${s.ctaIcon === 'wa' ? waGlyph : icon(s.ctaIcon, 2.2)}<span>${s.ctaLabel}</span></a>
      <div class="mk-svcs ${s.svcStyle || ''}">${services}</div>
      ${trustHTML(s)}
      <div class="mk-foot">
        ${s.skyline ? `<svg class="mk-sky" viewBox="0 0 ${SKYLINE.w} 42" preserveAspectRatio="none" aria-hidden="true"><path d="${SKYLINE.d}"/></svg>` : ''}
        <span>${icon('pin', 2)}${s.location}</span>
      </div>
      <div class="home-bar"></div>`;

    screen.querySelector('.mk-cta').addEventListener('click', () => showToast(`Abriendo WhatsApp · ${s.label}`));

    phone.appendChild(screen);
    float.appendChild(phone);
    slot.appendChild(float);

    const label = el('p', 'phone-label');
    label.appendChild(el('span', '', `0${i + 1} · `));
    label.appendChild(document.createTextNode(s.label));
    slot.appendChild(label);
    slot.appendChild(el('div', 'phone-shadow'));

    row.appendChild(slot);
  });

  /* En móvil, centrar el carrusel en el móvil del medio */
  const centerCarousel = () => {
    if (window.innerWidth >= 1024) return;
    const mid = row.children[Math.floor(SECTORS.length / 2)];
    if (mid) row.scrollLeft = mid.offsetLeft - (row.clientWidth - mid.clientWidth) / 2;
  };
  requestAnimationFrame(centerCarousel);

  /* ---------- Inclinación 3D según el ratón (solo escritorio) ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const stage = document.getElementById('stage');

  if (finePointer && !reduceMotion) {
    let raf = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;   // -1..1
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (window.innerWidth < 1024) return;
          row.style.setProperty('--ry', `${(tx * 7).toFixed(2)}deg`);
          row.style.setProperty('--rx', `${(-ty * 5 + 4).toFixed(2)}deg`);
        });
      }
    }, { passive: true });
    stage.addEventListener('pointerleave', () => {
      row.style.setProperty('--ry', '0deg');
      row.style.setProperty('--rx', '0deg');
    });
  }

  /* ---------- Header con cristal al hacer scroll ---------- */
  const header = document.getElementById('siteHeader');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Revelado ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((n, i) => {
    n.style.transitionDelay = `${Math.min(i, 6) * 80}ms`;
    io.observe(n);
  });

  /* ---------- Chispas naranjas de fondo (canvas ligero) ---------- */
  const canvas = document.getElementById('sparks');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, sparks = [];

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, (w * h) / 22000));
      sparks = Array.from({ length: count }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.4 + 0.3,
      vy: Math.random() * 0.35 + 0.08,
      vx: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.6 + 0.2,
    });

    let running = true;
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(tick);
    });

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < sparks.length; i++) {
        const p = sparks[i];
        p.y -= p.vy; p.x += p.vx;
        if (p.y < -10) sparks[i] = spawn(false);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${120 + (p.r * 40) | 0}, 30, ${p.a})`;
        ctx.shadowColor = '#ff7a00';
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    window.addEventListener('resize', () => { resize(); centerCarousel(); });
    resize();
    requestAnimationFrame(tick);
  }

  /* =========================================================
     SOFTWARE & DASHBOARDS — datos de demostración en tiempo real
     ========================================================= */
  const rand = (min, max) => Math.random() * (max - min) + min;
  const fmt = new Intl.NumberFormat('es-ES');

  const kpiState = {
    revenue:  { value: 0, target: 48250, step: [120, 640], decimals: 0 },
    leads:    { value: 0, target: 312,   step: [1, 4],     decimals: 0 },
    bookings: { value: 0, target: 27,    step: [0, 1],     decimals: 0 },
    conv:     { value: 0, target: 6.8,   step: [-0.15, 0.2], decimals: 1 },
  };

  const kpiEls = {};
  Object.keys(kpiState).forEach((k) => {
    kpiEls[k] = {
      val: document.querySelector(`[data-kpi="${k}"]`),
      delta: document.querySelector(`[data-kpi-delta="${k}"]`),
    };
  });

  const renderKpi = (k) => {
    const s = kpiState[k];
    const e = kpiEls[k];
    if (!e.val) return;
    e.val.textContent = s.decimals
      ? s.value.toFixed(s.decimals).replace('.', ',')
      : fmt.format(Math.round(s.value));
  };

  /* Cuenta progresiva inicial */
  const countUp = (duration = 1600) => {
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      Object.keys(kpiState).forEach((k) => {
        kpiState[k].value = kpiState[k].target * ease;
        renderKpi(k);
      });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    Object.keys(kpiState).forEach((k) => {
      const d = kpiEls[k].delta;
      if (d) d.textContent = `▲ ${rand(4, 24).toFixed(1).replace('.', ',')}%`;
    });
  };

  /* Gráfico de línea */
  const LINE_POINTS = 24;
  const W = 400, H = 140;
  const series = Array.from({ length: LINE_POINTS }, (_, i) => 50 + Math.sin(i / 3) * 18 + rand(-8, 8));
  const series2 = series.map((v) => v * 0.55 + rand(-4, 4));
  const lineStroke = document.getElementById('lineStroke');
  const lineStroke2 = document.getElementById('lineStroke2');
  const lineArea = document.getElementById('lineArea');
  const lineDot = document.getElementById('lineDot');

  const toPath = (arr) => {
    const dx = W / (arr.length - 1);
    const pts = arr.map((v, i) => [i * dx, H - (v / 100) * H]);
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {      // curva suave (Catmull-Rom → Bézier)
      const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p2 = pts[i], p3 = pts[i + 1] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return { d, last: pts[pts.length - 1] };
  };

  const renderLine = () => {
    if (!lineStroke) return;
    const a = toPath(series);
    lineStroke.setAttribute('d', a.d);
    lineArea.setAttribute('d', `${a.d} L${W} ${H} L0 ${H} Z`);
    lineStroke2.setAttribute('d', toPath(series2).d);
    lineDot.setAttribute('cx', a.last[0]);
    lineDot.setAttribute('cy', a.last[1]);
  };

  /* Barras */
  const barChart = document.getElementById('barChart');
  const bars = [];
  if (barChart) {
    for (let i = 0; i < 6; i++) { const b = el('span'); barChart.appendChild(b); bars.push(b); }
  }
  const renderBars = () => bars.forEach((b) => { b.style.height = `${rand(22, 96).toFixed(0)}%`; });

  /* Donut */
  const donutArc = document.getElementById('donutArc');
  const donutPct = document.getElementById('donutPct');
  const CIRC = 2 * Math.PI * 48;
  let donut = 0;
  const renderDonut = (pct) => {
    donut = Math.max(0, Math.min(100, pct));
    if (donutArc) donutArc.style.strokeDashoffset = (CIRC * (1 - donut / 100)).toFixed(1);
    if (donutPct) donutPct.textContent = `${Math.round(donut)}%`;
  };

  /* CRM: pipeline + feed de leads */
  const stageEls = [...document.querySelectorAll('[data-stage]')];
  const stages = [18, 11, 7, 4];
  const renderStages = () => stageEls.forEach((s, i) => { s.textContent = stages[i]; });

  const leadFeed = document.getElementById('leadFeed');
  const LEADS = [
    ['Laura M.', 'Clínica dental · vía WhatsApp', 'hot', 'Caliente'],
    ['Taller R. Ortiz', 'Presupuesto web + CRM', 'new', 'Nuevo'],
    ['Estética Nova', 'Reservas online', 'won', 'Ganado'],
    ['Fisio Activa', 'Dashboard de métricas', 'hot', 'Caliente'],
    ['Fontanería Sur', 'Agente IA 24/7', 'new', 'Nuevo'],
    ['Carlos P.', 'Landing + automatización', 'won', 'Ganado'],
  ];
  let leadIdx = 0;
  const pushLead = () => {
    if (!leadFeed) return;
    const [name, sub, cls, tag] = LEADS[leadIdx++ % LEADS.length];
    const li = el('li');
    li.appendChild(el('span', 'av', name.split(' ').map((w) => w[0]).join('').slice(0, 2)));
    const meta = el('div', 'meta');
    meta.appendChild(el('b', '', name));
    meta.appendChild(el('span', '', sub));
    li.appendChild(meta);
    li.appendChild(el('span', `tag ${cls}`, tag));
    leadFeed.prepend(li);
    while (leadFeed.children.length > 4) leadFeed.lastChild.remove();
  };

  /* Notificación flotante */
  const NOTIFS = [
    ['Nueva reserva confirmada', 'Automatización IA · hace 2 s'],
    ['Lead respondido por la IA', 'WhatsApp · hace 1 s'],
    ['Factura enviada al cliente', 'CRM · ahora mismo'],
    ['Recordatorio de cita enviado', 'Automatización · hace 3 s'],
  ];
  let notifIdx = 0;
  const notifPanel = document.querySelector('.panel-notif');
  const notifTitle = document.getElementById('notifTitle');
  const notifSub = document.getElementById('notifSub');

  /* Bucle de "tiempo real": solo corre mientras la sección es visible */
  let liveTimer = 0, liveTick = 0, dashStarted = false;
  const liveStep = () => {
    liveTick++;
    series.shift(); series.push(Math.max(12, Math.min(92, series[series.length - 1] + rand(-14, 14))));
    series2.shift(); series2.push(series[series.length - 1] * 0.55 + rand(-4, 4));
    renderLine();

    Object.keys(kpiState).forEach((k) => {
      const s = kpiState[k];
      s.value = Math.max(0, s.value + rand(s.step[0], s.step[1]));
      renderKpi(k);
    });
    const flashKey = Object.keys(kpiState)[liveTick % 4];
    const kpiCard = kpiEls[flashKey].val && kpiEls[flashKey].val.closest('.kpi');
    if (kpiCard) { kpiCard.classList.remove('flash'); void kpiCard.offsetWidth; kpiCard.classList.add('flash'); }

    if (liveTick % 2 === 0) renderBars();
    if (liveTick % 3 === 0) {
      pushLead();
      const i = Math.floor(rand(0, 3));
      stages[i] = Math.max(0, stages[i] - 1); stages[i + 1]++; stages[0] += Math.random() < 0.6 ? 1 : 0;
      renderStages();
    }
    if (liveTick % 4 === 0 && notifPanel) {
      const [t, s] = NOTIFS[++notifIdx % NOTIFS.length];
      notifTitle.textContent = t; notifSub.textContent = s;
      notifPanel.classList.remove('pop'); void notifPanel.offsetWidth; notifPanel.classList.add('pop');
    }
    renderDonut(donut >= 96 ? 58 : donut + rand(1, 4));
  };

  const dashSection = document.getElementById('software');
  if (dashSection) {
    renderLine(); renderStages();
    for (let i = 0; i < 3; i++) pushLead();
    new IntersectionObserver((entries) => {
      const visible = entries[0].isIntersecting;
      if (visible && !dashStarted) {
        dashStarted = true;
        countUp(); renderBars(); renderDonut(72);
      }
      clearInterval(liveTimer);
      if (visible && !reduceMotion) liveTimer = setInterval(liveStep, 1600);
    }, { threshold: 0.2 }).observe(dashSection);
  }

  /* Inclinación de la escena de paneles según el ratón */
  const dashScene = document.querySelector('.dash-scene');
  if (dashScene && finePointer && !reduceMotion) {
    const dashStage = document.getElementById('dashStage');
    dashStage.addEventListener('pointermove', (e) => {
      if (window.innerWidth < 1024) return;
      const r = dashStage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      dashScene.style.setProperty('--dry', `${(x * 12).toFixed(2)}deg`);
      dashScene.style.setProperty('--drx', `${(-y * 8).toFixed(2)}deg`);
    });
    dashStage.addEventListener('pointerleave', () => {
      dashScene.style.setProperty('--dry', '0deg');
      dashScene.style.setProperty('--drx', '0deg');
    });
  }

  /* =========================================================
     CATÁLOGO DE PRECIOS (fuente única para tarifas y configurador)
     ========================================================= */
  const PLANS = [
    { id: 'basico', icon: '⚡', title: 'Plan Básico', short: 'Landing express 1 página · 24–48 h', min: 200, max: 200 },
    { id: 'pro',    icon: '🔥', title: 'Plan Pro', short: '3 secciones · catálogo · reservas WhatsApp', min: 350, max: 350, badge: 'El más vendido' },
    { id: 'elite',  icon: '👑', title: 'Plan Élite / 3D', short: 'Superweb 3D inmersiva · < 0.8 s', min: 699, max: 699 },
  ];

  const MODULES = [
    { id: 'wa',    icon: '💬', title: 'Automatización de WhatsApp', min: 250, max: 350,
      desc: 'Embudos de bienvenida y filtro de leads 24/7.', feats: ['Bienvenida automática', 'Filtro de leads', '24/7'] },
    { id: 'voz',   icon: '🎙️', title: 'Agente / Automatización de Voz', min: 400, max: 500,
      desc: 'Centralita inteligente para atenciones y recados fuera de horario.', feats: ['Centralita IA', 'Recados', 'Fuera de horario'] },
    { id: 'citas', icon: '📅', title: 'Sistema de Citas y Reservas', min: 250, max: 250,
      desc: 'Calendario interactivo sincronizado con recordatorios.', feats: ['Calendario', 'Sincronizado', 'Recordatorios'] },
    { id: 'dash',  icon: '📊', title: 'Dashboard / Panel de Control 3D', min: 600, max: 900,
      desc: 'Visualización de métricas, ventas y stock en tiempo real.', feats: ['Métricas', 'Ventas', 'Stock en vivo'] },
    { id: 'crm',   icon: '🗂️', title: 'CRM a Medida', min: 900, max: 1500, open: true,
      desc: 'Gestión centralizada de leads, presupuestos en 1 clic y pipeline comercial.', feats: ['Leads', 'Presupuestos 1 clic', 'Pipeline'] },
  ];

  const PACKS = [
    { id: 'impulso', icon: '🚀', title: 'Pack Impulso Local', price: 550, plan: 'pro', modules: ['wa'],
      tagline: 'Web Pro + Automatización de WhatsApp' },
    { id: 'autoridad', icon: '🏆', title: 'Pack 360º Autoridad', price: 899, plan: 'elite', modules: ['wa', 'citas'],
      tagline: 'Web Élite 3D + Automatización de WhatsApp + Sistema de Reservas', featured: true },
  ];

  const byId = (list, id) => list.find((x) => x.id === id);

  /* 1.500 € — agrupa miles con punto como en el resto de la web */
  const eur = (n) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
  const range = (min, max, open) =>
    (min === max ? eur(min) : `${eur(min).replace(' €', '')} – ${eur(max)}`) + (open ? '+' : '');

  const packParts = (p) => [byId(PLANS, p.plan), ...p.modules.map((m) => byId(MODULES, m))];
  const packValue = (p) => packParts(p).reduce((a, x) => ({ min: a.min + x.min, max: a.max + x.max }), { min: 0, max: 0 });

  /* ---------- Render de módulos y packs en la sección de tarifas ---------- */
  const modulePriceGrid = document.getElementById('modulePriceGrid');
  if (modulePriceGrid) {
    MODULES.forEach((m) => {
      const card = el('article', 'mod-price reveal in');
      card.innerHTML = `
        <span class="mod-ico" aria-hidden="true">${m.icon}</span>
        <h4>${m.title}</h4>
        <p class="mod-desc">${m.desc}</p>
        <p class="mod-range">${range(m.min, m.max, m.open)}</p>
        <button type="button" class="mod-add" data-preset="mod:${m.id}">+ Añadir al configurador</button>`;
      modulePriceGrid.appendChild(card);
    });
  }

  const packGrid = document.getElementById('packGrid');
  if (packGrid) {
    PACKS.forEach((p) => {
      const v = packValue(p);
      const card = el('article', `pack reveal in ${p.featured ? 'pack-featured' : ''}`);
      const msg = `Hola Web Size 👋 Me interesa el ${p.title} (${eur(p.price)}): ${p.tagline}. ¿Me contáis los siguientes pasos?`;
      card.innerHTML = `
        <div class="pack-head">
          <span class="pack-ico" aria-hidden="true">${p.icon}</span>
          <div><p class="plan-name">${p.featured ? 'Máxima autoridad' : 'Ideal para empezar fuerte'}</p><h4>${p.title}</h4></div>
          <span class="pack-save">Ahorras desde ${eur(v.min - p.price)}</span>
        </div>
        <ul class="pack-items">${packParts(p).map((x) => `<li><span>${x.title}</span><em>${range(x.min, x.max)}</em></li>`).join('')}</ul>
        <div class="pack-foot">
          <div>
            <p class="pack-was">Por separado: <s>${range(v.min, v.max)}</s></p>
            <p class="pack-price"><span class="${p.featured ? 'text-neon-grad' : 'text-metal'}">${eur(p.price).replace(' €', '')}</span><small>€</small></p>
          </div>
          <div class="pack-actions">
            <a class="plan-cta ${p.featured ? 'is-primary' : ''}" href="${waLink(msg)}" target="_blank" rel="noopener noreferrer">Quiero este pack</a>
            <button type="button" class="plan-add" data-preset="plan:${p.plan},${p.modules.map((m) => `mod:${m}`).join(',')}">Configurarlo →</button>
          </div>
        </div>
        <p class="micro mt-3">Sin llamadas de ventas eternas · Respuesta en &lt;15 min por WhatsApp</p>`;
      packGrid.appendChild(card);
    });
  }

  /* =========================================================
     CONFIGURADOR MODULAR + PRESUPUESTO EN TIEMPO REAL
     ========================================================= */
  const planGrid = document.getElementById('planGrid');
  const moduleGrid = document.getElementById('moduleGrid');
  const state = { plan: '', mods: new Set() };

  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

  const addTilt = (label, inner) => {
    if (!finePointer || reduceMotion) return;
    label.addEventListener('pointermove', (e) => {
      const r = label.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      inner.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      inner.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      inner.style.setProperty('--mry', `${((x - 0.5) * 8).toFixed(2)}deg`);
      inner.style.setProperty('--mrx', `${((0.5 - y) * 8).toFixed(2)}deg`);
    });
    label.addEventListener('pointerleave', () => {
      inner.style.setProperty('--mry', '0deg');
      inner.style.setProperty('--mrx', '0deg');
    });
  };

  /* Paso 1: plan web (radio, opcional) */
  [{ id: '', icon: '🌐', title: 'Ya tengo web', short: 'Solo automatización / software', min: 0, max: 0 }, ...PLANS].forEach((p) => {
    const label = el('label', 'module-card plan-option');
    const input = el('input');
    input.type = 'radio';
    input.name = 'plan';
    input.value = p.id;
    if (!p.id) input.checked = true;
    const inner = el('div', 'module-inner');
    inner.innerHTML = `
      <div class="module-top"><span class="module-ico">${p.icon}</span><span class="check radio">${CHECK_SVG}</span></div>
      <h3 class="module-title">${p.title}</h3>
      <p class="module-desc">${p.short}</p>
      <p class="opt-price">${p.id ? eur(p.min) : '0 €'}${p.badge ? `<span class="opt-badge">${p.badge}</span>` : ''}</p>`;
    label.appendChild(input);
    label.appendChild(inner);
    planGrid.appendChild(label);
    input.addEventListener('change', () => { state.plan = p.id; updateConfigurator(true); });
    addTilt(label, inner);
  });

  /* Paso 2: módulos (checkbox) */
  MODULES.forEach((m) => {
    const label = el('label', 'module-card');
    const input = el('input');
    input.type = 'checkbox';
    input.value = m.id;
    input.setAttribute('aria-describedby', `desc-${m.id}`);
    const inner = el('div', 'module-inner');
    inner.innerHTML = `
      <div class="module-top"><span class="module-ico">${m.icon}</span><span class="check">${CHECK_SVG}</span></div>
      <h3 class="module-title">${m.title}</h3>
      <p class="module-desc" id="desc-${m.id}">${m.desc}</p>
      <div class="module-feats">${m.feats.map((f) => `<span>${f}</span>`).join('')}</div>
      <p class="opt-price">${range(m.min, m.max, m.open)}</p>`;
    label.appendChild(input);
    label.appendChild(inner);
    moduleGrid.appendChild(label);
    input.addEventListener('change', () => {
      if (input.checked) state.mods.add(m.id); else state.mods.delete(m.id);
      updateConfigurator(true);
    });
    addTilt(label, inner);
  });

  /* Cálculo: aplica el pack más grande que encaje y suma el resto */
  const computeQuote = () => {
    const packsBySize = PACKS.slice().sort((a, b) => b.modules.length - a.modules.length);
    const pack = packsBySize.find((p) => state.plan === p.plan && p.modules.every((id) => state.mods.has(id))) || null;

    const lines = [];
    if (pack) lines.push({ key: `pack:${pack.id}`, icon: pack.icon, title: pack.title, sub: pack.tagline, min: pack.price, max: pack.price, pack });
    const plan = byId(PLANS, state.plan);
    if (plan && !pack) lines.push({ key: `plan:${plan.id}`, icon: plan.icon, title: plan.title, min: plan.min, max: plan.max });
    MODULES.forEach((m) => {
      if (!state.mods.has(m.id) || (pack && pack.modules.includes(m.id))) return;
      lines.push({ key: `mod:${m.id}`, icon: m.icon, title: m.title, min: m.min, max: m.max, open: m.open });
    });

    const total = lines.reduce((a, l) => ({ min: a.min + l.min, max: a.max + l.max, open: a.open || !!l.open }), { min: 0, max: 0, open: false });
    const saving = pack ? packValue(pack).min - pack.price : 0;
    const items = (plan ? 1 : 0) + state.mods.size;
    return { lines, total, pack, saving, items };
  };

  /* Sugerencia de pack cuando falta una sola pieza */
  const findUpsell = (q) => {
    if (q.pack) return null;
    for (const p of PACKS) {
      const missingPlan = state.plan !== p.plan;
      if (missingPlan && state.plan) continue; // nunca proponer cambiar un plan ya elegido
      const missingMods = p.modules.filter((id) => !state.mods.has(id));
      const missing = (missingPlan ? 1 : 0) + missingMods.length;
      const hasSome = !missingPlan || missingMods.length < p.modules.length;
      if (missing === 1 && hasSome) {
        const what = missingPlan ? byId(PLANS, p.plan) : byId(MODULES, missingMods[0]);
        const preset = missingPlan ? `plan:${p.plan}` : `mod:${missingMods[0]}`;
        return { p, what, preset };
      }
    }
    return null;
  };

  const buildQuoteMessage = (q) => {
    const L = [
      'Hola Web Size 👋',
      'He calculado mi presupuesto en vuestro configurador:',
      '',
      ...q.lines.map((l) => `• ${l.title}${l.sub ? ` (${l.sub})` : ''}: ${range(l.min, l.max, l.open)}`),
      '',
      `💰 Presupuesto estimado: ${range(q.total.min, q.total.max, q.total.open)}`,
    ];
    if (q.pack) L.push(`✅ Ahorro por pack: desde ${eur(q.saving)}`);
    L.push('', '¿Me confirmáis el presupuesto final? ¡Gracias!');
    return L.join('\n');
  };

  const sumCount = document.getElementById('sumCount');
  const sumCountLabel = document.getElementById('sumCountLabel');
  const sumPrice = document.getElementById('sumPrice');
  const sumSaving = document.getElementById('sumSaving');
  const sumList = document.getElementById('sumList');
  const sumEmpty = document.getElementById('sumEmpty');
  const upsellBox = document.getElementById('upsell');
  const msgPreview = document.getElementById('msgPreview');
  const sumSend = document.getElementById('sumSend');
  const sumReset = document.getElementById('sumReset');
  const fab = document.getElementById('waFab');
  const fabBadge = document.getElementById('fabBadge');
  const fabTitle = document.getElementById('fabTitle');
  const fabSub = document.getElementById('fabSub');

  /* Animación del total (cuenta hacia el nuevo valor) */
  const shown = { min: 0, max: 0 };
  let priceRaf = 0;
  const animatePrice = (to) => {
    cancelAnimationFrame(priceRaf);
    const from = { min: shown.min, max: shown.max };
    const t0 = performance.now();
    const D = reduceMotion ? 0 : 450;
    const step = (t) => {
      const k = D ? Math.min(1, (t - t0) / D) : 1;
      const e = 1 - Math.pow(1 - k, 3);
      shown.min = from.min + (to.min - from.min) * e;
      shown.max = from.max + (to.max - from.max) * e;
      sumPrice.textContent = range(Math.round(shown.min), Math.round(shown.max), to.open && k === 1);
      if (k < 1) priceRaf = requestAnimationFrame(step);
      else sumPrice.textContent = range(to.min, to.max, to.open);
    };
    priceRaf = requestAnimationFrame(step);
  };

  const syncInputs = () => {
    planGrid.querySelectorAll('input').forEach((i) => { i.checked = i.value === state.plan; });
    moduleGrid.querySelectorAll('input').forEach((i) => { i.checked = state.mods.has(i.value); });
  };

  const removeLine = (key) => {
    const [kind, id] = key.split(':');
    if (kind === 'plan') state.plan = '';
    if (kind === 'mod') state.mods.delete(id);
    if (kind === 'pack') { const p = byId(PACKS, id); state.plan = ''; p.modules.forEach((m) => state.mods.delete(m)); }
    syncInputs();
    updateConfigurator(true);
  };

  function updateConfigurator(bump) {
    const q = computeQuote();
    const n = q.items;

    sumCount.textContent = n;
    sumCountLabel.textContent = n === 1 ? 'ítem' : 'ítems';
    sumEmpty.hidden = n > 0;
    animatePrice(q.total);

    sumSaving.hidden = !q.pack;
    if (q.pack) sumSaving.textContent = `✅ ${q.pack.title} aplicado · ahorras desde ${eur(q.saving)}`;

    sumList.textContent = '';
    q.lines.forEach((l) => {
      const li = el('li', l.pack ? 'is-pack' : '');
      li.appendChild(el('span', 'li-ico', l.icon));
      const txt = el('span', 'li-txt');
      txt.appendChild(el('b', '', l.title));
      if (l.sub) txt.appendChild(el('small', '', l.sub));
      li.appendChild(txt);
      li.appendChild(el('span', 'li-price', range(l.min, l.max, l.open)));
      const rm = el('button', '', '×');
      rm.type = 'button';
      rm.setAttribute('aria-label', `Quitar ${l.title}`);
      rm.addEventListener('click', () => removeLine(l.key));
      li.appendChild(rm);
      sumList.appendChild(li);
    });

    const up = findUpsell(q);
    upsellBox.hidden = !up;
    upsellBox.textContent = '';
    if (up) {
      const v = packValue(up.p);
      upsellBox.appendChild(el('p', '', `💡 Añade ${up.what.title} y activa el ${up.p.title} por ${eur(up.p.price)} (ahorras desde ${eur(v.min - up.p.price)}).`));
      const b = el('button', '', `+ Añadir ${up.what.title}`);
      b.type = 'button';
      b.addEventListener('click', () => applyPreset(up.preset, false));
      upsellBox.appendChild(b);
    }

    const msg = n ? buildQuoteMessage(q) : GENERAL_MESSAGE;
    msgPreview.textContent = msg;
    const priceTxt = range(q.total.min, q.total.max, q.total.open);

    if (n) {
      const href = waLink(msg);
      sumSend.href = href;
      sumSend.classList.remove('is-disabled');
      sumSend.setAttribute('aria-disabled', 'false');
      sumSend.textContent = 'Enviar presupuesto';

      fab.href = href;
      fab.target = '_blank';
      fab.rel = 'noopener noreferrer';
      fab.classList.add('active');
      fabTitle.textContent = `Enviar presupuesto (${n})`;
      fabSub.textContent = `Estimado: ${priceTxt}`;
      fab.setAttribute('aria-label', `Enviar por WhatsApp el presupuesto estimado de ${priceTxt}`);
    } else {
      sumSend.href = '#';
      sumSend.classList.add('is-disabled');
      sumSend.setAttribute('aria-disabled', 'true');
      sumSend.textContent = 'Enviar presupuesto';

      fab.href = '#configurador';
      fab.removeAttribute('target');
      fab.classList.remove('active');
      fabTitle.textContent = 'Calcula tu presupuesto';
      fabSub.textContent = 'Configurador a la carta';
      fab.setAttribute('aria-label', 'Ir al configurador de presupuesto');
    }

    fabBadge.textContent = n;
    if (bump && n) { fabBadge.classList.remove('bump'); void fabBadge.offsetWidth; fabBadge.classList.add('bump'); }
  }

  /* Presets desde tarifas / packs: "plan:pro,mod:wa" */
  function applyPreset(preset, replace) {
    if (replace) { state.plan = ''; state.mods.clear(); }
    preset.split(',').forEach((tok) => {
      const [kind, id] = tok.split(':');
      if (kind === 'plan') state.plan = id;
      if (kind === 'mod') state.mods.add(id);
    });
    syncInputs();
    updateConfigurator(true);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-preset]');
    if (!t) return;
    const isPack = t.dataset.preset.includes(',');
    applyPreset(t.dataset.preset, isPack);
    document.getElementById('configurador').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    showToast(isPack ? 'Pack cargado en el configurador' : 'Añadido al configurador');
  });

  sumReset.addEventListener('click', () => {
    state.plan = '';
    state.mods.clear();
    syncInputs();
    updateConfigurator(false);
  });
  [sumSend, fab].forEach((a) => a.addEventListener('click', () => {
    if (computeQuote().items) showToast('Abriendo WhatsApp con tu presupuesto…');
  }));

  updateConfigurator(false);

  /* Oculta el botón flotante mientras el resumen o el footer (con su propio botón de WhatsApp) están a la vista: evita duplicados */
  const tuckTargets = new Map();
  const tuckIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => tuckTargets.set(en.target, en.isIntersecting));
    let any = false;
    tuckTargets.forEach((v) => { any = any || v; });
    fab.classList.toggle('tucked', any);
  }, { threshold: 0.25 });
  tuckIO.observe(sumSend.closest('.summary'));
  const footerEl = document.querySelector('.site-footer');
  if (footerEl) tuckIO.observe(footerEl);

  /* =========================================================
     TARIFAS — enlaces de WhatsApp con mensaje propio por plan
     ========================================================= */
  document.querySelectorAll('[data-wa-msg]').forEach((a) => {
    a.href = waLink(a.dataset.waMsg);
    a.addEventListener('click', () => showToast('Abriendo WhatsApp…'));
  });

  /* =========================================================
     STACK — medidores animados al entrar en pantalla
     ========================================================= */
  const gauges = document.querySelectorAll('.gauge-arc');
  if (gauges.length) {
    const GAUGE_C = 2 * Math.PI * 50;
    const go = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const pct = Number(en.target.dataset.gauge) || 0;
        en.target.style.strokeDashoffset = (GAUGE_C * (1 - pct / 100)).toFixed(1);
        go.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    gauges.forEach((g) => go.observe(g));
  }

  /* =========================================================
     REDES SOCIALES (footer)
     Rellena "url" para mostrar cada red; las que estén vacías no se muestran.
     ========================================================= */
  const SOCIAL_LINKS = [
    { name: 'LinkedIn',  url: 'https://www.linkedin.com/in/joshua-p%C3%A9rez-7a8523449',
      path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z' },
    { name: 'WhatsApp',  url: waLink(GENERAL_MESSAGE),
      path: WA_ICON.match(/ d=\"([^\"]+)\"/)[1] },
    { name: 'Instagram', url: '',  // ⚠️ añade tu URL de Instagram
      path: 'M12 2.2c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85C2.42 3.92 3.94 2.37 7.15 2.27 8.42 2.21 8.8 2.2 12 2.2zm0 4.76a5.04 5.04 0 1 0 0 10.08 5.04 5.04 0 0 0 0-10.08zm0 8.31a3.27 3.27 0 1 1 0-6.54 3.27 3.27 0 0 1 0 6.54zm5.24-9.69a1.18 1.18 0 1 0 0 2.36 1.18 1.18 0 0 0 0-2.36z' },
    { name: 'TikTok',    url: '',  // ⚠️ añade tu URL de TikTok
      path: 'M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.79a5.68 5.68 0 1 0 4.91 5.62V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48z' },
    { name: 'GitHub',    url: '',  // ⚠️ añade tu URL de GitHub (opcional)
      path: 'M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z' },
  ];

  const socialList = document.getElementById('socialLinks');
  if (socialList) {
    SOCIAL_LINKS.filter((s) => s.url).forEach((s) => {
      const li = el('li');
      const a = el('a', 'icon-btn');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', s.name);
      a.title = s.name;
      a.innerHTML = `<svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="${s.path}"/></svg>`;
      li.appendChild(a);
      socialList.appendChild(li);
    });
  }

  /* =========================================================
     ÉLITE · Títulos con revelación enmascarada
     Cada palabra se envuelve en una máscara (overflow hidden) y emerge al entrar en pantalla.
     ========================================================= */
  const GRADIENT_CLASSES = ['text-metal', 'text-neon-grad'];
  const splitHeading = (h) => {
    let i = 0;
    const walk = (node, inherit) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = el('span', 'w');
            const wi = el('span', `wi${inherit ? ` ${inherit}` : ''}`, part);
            wi.style.setProperty('--i', i++);
            w.appendChild(wi);
            frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          // El degradado pasa a cada palabra: background-clip:text no funciona bien sobre hijos transformados
          const grad = GRADIENT_CLASSES.filter((c) => n.classList.contains(c));
          grad.forEach((c) => n.classList.remove(c));
          walk(n, [inherit, ...grad].filter(Boolean).join(' '));
        }
      });
    };
    walk(h, '');
  };

  const splitTargets = document.querySelectorAll('[data-split]');
  splitTargets.forEach(splitHeading);
  if (reduceMotion) {
    splitTargets.forEach((h) => h.classList.add('is-in'));
  } else {
    const splitIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        splitIO.unobserve(en.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    splitTargets.forEach((h) => splitIO.observe(h));
  }

  /* =========================================================
     ÉLITE · Spotlight que sigue al cursor (solo escritorio)
     ========================================================= */
  const spotlight = document.getElementById('spotlight');
  if (spotlight && finePointer && !reduceMotion) {
    const bgLayer = spotlight.parentElement;
    document.documentElement.classList.add('has-spot');
    document.querySelectorAll('.plan:not(.plan-elite), .mod-price, .pack, .badge-card, .proof, .summary')
      .forEach((c) => c.classList.add('spot-card'));

    let px = 0, py = 0, target = null, spotRaf = 0;
    const paint = () => {
      spotRaf = 0;
      bgLayer.style.setProperty('--sx', `${px}px`);
      bgLayer.style.setProperty('--sy', `${py}px`);
      if (target) {
        const r = target.getBoundingClientRect();
        target.style.setProperty('--cx', `${px - r.left}px`);
        target.style.setProperty('--cy', `${py - r.top}px`);
      }
    };
    window.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      target = e.target.closest ? e.target.closest('.spot-card') : null;
      spotlight.classList.add('on');
      if (!spotRaf) spotRaf = requestAnimationFrame(paint);
    }, { passive: true });
    document.addEventListener('pointerleave', () => spotlight.classList.remove('on'));
  }

  /* =========================================================
     ÉLITE · Avisos en vivo dentro de las maquetas
     ========================================================= */
  ICONS.bell = '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>';
  const PHONE_ALERTS = {
    taller:    [['calendar', 'Nueva cita', 'Mañana 9:30 · Cambio de aceite'], ['wa', 'WhatsApp', 'Carlos: ¿Tenéis hueco para la pre‑ITV?'], ['check', 'Presupuesto aceptado', 'Frenos delanteros']],
    estetica:  [['calendar', 'Reserva confirmada', 'Hoy 17:00 · Limpieza facial'], ['wa', 'WhatsApp', 'Lucía: ¿Queda hueco el sábado?'], ['bell', 'Recordatorio enviado', 'Citas de mañana · 3 clientas']],
    fontanero: [['bolt', '¡Urgencia entrante!', 'Fuga en cocina · a 2,4 km'], ['wa', 'WhatsApp', 'Ana: Se me ha roto la caldera'], ['check', 'Servicio completado', 'Desatasco · cliente satisfecho']],
    dental:    [['calendar', 'Primera visita', 'Jueves 11:00 · Revisión'], ['wa', 'WhatsApp', 'Pedro: Info sobre ortodoncia invisible'], ['bell', 'Recordatorio', 'Limpieza dental mañana 10:00']],
    fisio:     [['calendar', 'Sesión reservada', 'Lunes 19:00 · Espalda'], ['wa', 'WhatsApp', 'Marta: ¿Tratáis lesiones de rodilla?'], ['check', 'Bono renovado', '10 sesiones']],
  };

  const phoneSlots = row.querySelectorAll('.phone-slot');
  phoneSlots.forEach((slot, i) => {
    const s = SECTORS[i];
    const screen = slot.querySelector('.screen');
    const notif = el('div', 'mk-notif');
    notif.setAttribute('role', 'status');
    notif.setAttribute('aria-live', 'polite');
    screen.appendChild(notif);

    let n = 0, hideTimer = 0;
    const fire = () => {
      const [ic, title, sub] = PHONE_ALERTS[s.id][n++ % PHONE_ALERTS[s.id].length];
      notif.innerHTML = `
        <span class="n-ico">${ic === 'wa' ? waGlyph : icon(ic, 2.2)}</span>
        <span class="n-txt"><span class="n-app"><span>${s.brand}${s.brandAccent}</span><span>ahora</span></span><b>${title}</b><small>${sub}</small></span>`;
      notif.classList.remove('show');
      void notif.offsetWidth;
      notif.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => notif.classList.remove('show'), 3400);
    };
    slot._fireAlert = fire;

    const btn = el('button', 'sim-btn');
    btn.type = 'button';
    btn.innerHTML = '<span class="sim-dot" aria-hidden="true"></span>';
    btn.appendChild(document.createTextNode('Simular aviso'));
    btn.setAttribute('aria-label', `Simular un aviso en vivo en la maqueta de ${s.label}`);
    btn.addEventListener('click', () => {
      fire();
      if (navigator.vibrate) navigator.vibrate(18);
    });
    slot.insertBefore(btn, slot.querySelector('.phone-shadow'));
  });

  /* Primer aviso automático en el móvil central al ver la sección */
  const stageEl = document.getElementById('stage');
  if (stageEl && !reduceMotion) {
    const autoIO = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      autoIO.disconnect();
      const mid = phoneSlots[Math.floor(phoneSlots.length / 2)];
      setTimeout(() => mid && mid._fireAlert(), 1400);
    }, { threshold: 0.45 });
    autoIO.observe(stageEl);
  }

  /* Botón de aviso en vivo del dashboard */
  const simDash = document.getElementById('simDashAlert');
  if (simDash && notifPanel) {
    let forceTimer = 0;
    simDash.addEventListener('click', () => {
      const [t, sub] = NOTIFS[++notifIdx % NOTIFS.length];
      notifTitle.textContent = t;
      notifSub.textContent = sub;
      notifPanel.classList.remove('pop', 'force');
      void notifPanel.offsetWidth;
      notifPanel.classList.add('pop', 'force');
      clearTimeout(forceTimer);
      forceTimer = setTimeout(() => notifPanel.classList.remove('force'), 3200);
      pushLead();
      stages[0]++; renderStages();
      if (navigator.vibrate) navigator.vibrate(18);
    });
  }

  /* =========================================================
     ÉLITE · Micro-interacciones en los CTAs (escala + onda)
     ========================================================= */
  const CTA_SEL = '.btn-wa, .btn-primary, .plan-cta, .mk-cta, .wa-fab, .proof-cta, .upsell button';
  let pressed = null;
  const release = () => {
    if (!pressed) return;
    const b = pressed;
    pressed = null;
    b.classList.remove('is-pressed');
    if (reduceMotion) return;
    b.classList.add('is-released');
    b.addEventListener('animationend', () => b.classList.remove('is-released'), { once: true });
  };
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest(CTA_SEL);
    if (!b || b.classList.contains('is-disabled')) return;
    pressed = b;
    b.classList.add('cta-press', 'is-pressed');
    if (reduceMotion || getComputedStyle(b).overflow !== 'hidden') return;
    const r = b.getBoundingClientRect();
    const rp = el('span', 'ripple');
    rp.style.left = `${e.clientX - r.left}px`;
    rp.style.top = `${e.clientY - r.top}px`;
    b.appendChild(rp);
    rp.addEventListener('animationend', () => rp.remove(), { once: true });
  }, { passive: true });
  ['pointerup', 'pointercancel', 'dragstart'].forEach((t) => document.addEventListener(t, release, { passive: true }));

  /* =========================================================
     ÉLITE · Móvil: el botón flotante se aparta al bajar y vuelve al subir
     ========================================================= */
  let lastY = window.scrollY, fabRaf = 0;
  window.addEventListener('scroll', () => {
    if (fabRaf) return;
    fabRaf = requestAnimationFrame(() => {
      fabRaf = 0;
      const y = window.scrollY;
      if (window.innerWidth >= 1024) { fab.classList.remove('fab-hidden'); lastY = y; return; }
      if (y > lastY + 10 && y > 400) fab.classList.add('fab-hidden');
      else if (y < lastY - 10) fab.classList.remove('fab-hidden');
      lastY = y;
    });
  }, { passive: true });

  /* ---------- Año del footer ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
