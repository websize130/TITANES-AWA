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

  /* ---------- SECTORES (5 móviles) ---------- */
  const SECTORS = [
    {
      id: 'taller',
      label: 'Taller Mecánico',
      icon: '🔧',
      tag: 'Taller · Cita previa',
      title: 'Tu coche, a punto y sin esperas',
      sub: 'Diagnosis, ITV y mantenimiento con presupuesto al momento.',
      items: ['Pre-ITV y revisión', 'Cambio de aceite y frenos', 'Presupuesto en 24 h'],
      rating: '4,9',
      cta: 'Pedir cita al taller',
      accent: ['#ff7a00', '#b84f00', '#ffb066'],
      message: 'Hola Web Size 👋 Tengo un taller mecánico y quiero una web que me traiga más citas y presupuestos por WhatsApp. ¿Hablamos?',
    },
    {
      id: 'estetica',
      label: 'Centro de Estética',
      icon: '✨',
      tag: 'Estética · Bienestar',
      title: 'Reserva tu momento de belleza',
      sub: 'Tratamientos faciales, corporales y láser con agenda online.',
      items: ['Limpieza facial premium', 'Depilación láser', 'Bonos y packs'],
      rating: '5,0',
      cta: 'Reservar tratamiento',
      accent: ['#f472b6', '#9d174d', '#fbcfe8'],
      message: 'Hola Web Size 👋 Tengo un centro de estética y me interesa una web con reservas por WhatsApp. ¿Me contáis cómo funciona?',
    },
    {
      id: 'fontanero',
      label: 'Fontanero / Urgencias',
      icon: '🚰',
      tag: 'Urgencias 24 h',
      title: '¿Una fuga? Llegamos en 30 min',
      sub: 'Fontanería urgente, desatascos y calderas, todos los días.',
      items: ['Servicio 24/7', 'Desatascos y fugas', 'Precio cerrado'],
      rating: '4,8',
      cta: 'Urgencia por WhatsApp',
      accent: ['#38bdf8', '#075985', '#bae6fd'],
      message: 'Hola Web Size 👋 Soy fontanero y hago urgencias. Quiero una web que haga sonar mi WhatsApp con clientes de mi zona. ¿Hablamos?',
    },
    {
      id: 'dental',
      label: 'Clínica Dental',
      icon: '🦷',
      tag: 'Clínica dental',
      title: 'Sonríe con total confianza',
      sub: 'Implantes, ortodoncia invisible y primera visita gratuita.',
      items: ['Primera visita gratis', 'Ortodoncia invisible', 'Financiación a medida'],
      rating: '4,9',
      cta: 'Solicitar primera visita',
      accent: ['#2dd4bf', '#115e59', '#ccfbf1'],
      message: 'Hola Web Size 👋 Tengo una clínica dental y quiero captar más primeras visitas con una web profesional. ¿Podemos hablar?',
    },
    {
      id: 'fisio',
      label: 'Fisioterapia',
      icon: '💪',
      tag: 'Fisioterapia · Deporte',
      title: 'Vuelve a moverte sin dolor',
      sub: 'Fisioterapia deportiva, suelo pélvico y readaptación.',
      items: ['Valoración inicial', 'Punción seca y masaje', 'Bonos de sesiones'],
      rating: '5,0',
      cta: 'Reservar sesión',
      accent: ['#a3e635', '#3f6212', '#ecfccb'],
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

  /* ---------- Render de los 5 móviles ---------- */
  const row = document.getElementById('phoneRow');
  const center = (SECTORS.length - 1) / 2;

  SECTORS.forEach((s, i) => {
    const [accent, dark, light] = s.accent;
    const offset = i - center;

    const slot = el('div', 'phone-slot');
    slot.setAttribute('role', 'listitem');
    slot.style.setProperty('--offset', offset);
    slot.style.setProperty('--abs', Math.abs(offset));
    slot.style.setProperty('--accent', accent);
    slot.style.setProperty('--accent-dark', dark);
    slot.style.setProperty('--accent-light', light);
    slot.style.setProperty('--accent-soft', hexToRgba(accent, 0.28));
    slot.style.setProperty('--accent-glow', hexToRgba(accent, 0.55));
    slot.style.setProperty('--delay', `${(-i * 1.15).toFixed(2)}s`);

    const float = el('div', 'phone-float');
    const phone = el('div', 'phone');
    const screen = el('div', 'screen');

    screen.appendChild(el('div', 'notch'));

    const status = el('div', 'statusbar');
    status.appendChild(el('span', '', '9:41'));
    status.appendChild(el('span', '', '5G ▮▮▮'));
    screen.appendChild(status);

    const hero = el('div', 'mini-hero');
    hero.appendChild(el('div', 'mini-icon', s.icon));
    hero.appendChild(el('p', 'mini-tag', s.tag));
    hero.appendChild(el('h3', 'mini-title', s.title));
    hero.appendChild(el('p', 'mini-sub', s.sub));
    screen.appendChild(hero);

    const list = el('div', 'mini-list');
    s.items.forEach((t) => {
      const it = el('div', 'mini-item');
      it.appendChild(el('i'));
      it.appendChild(document.createTextNode(t));
      list.appendChild(it);
    });
    screen.appendChild(list);

    const rating = el('div', 'mini-rating');
    rating.innerHTML = `<b>★★★★★</b>`;
    rating.appendChild(document.createTextNode(`${s.rating} · reseñas de Google`));
    screen.appendChild(rating);

    const ctaWrap = el('div', 'mini-cta');
    const btn = el('a', 'wa-btn');
    btn.href = waLink(s.message);
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', `${s.cta} — enviar WhatsApp (${s.label})`);
    btn.innerHTML = WA_ICON;
    btn.appendChild(document.createTextNode(s.cta));
    btn.addEventListener('click', () => showToast(`Abriendo WhatsApp · ${s.label}`));
    ctaWrap.appendChild(btn);
    screen.appendChild(ctaWrap);
    screen.appendChild(el('div', 'home-bar'));

    phone.appendChild(screen);
    float.appendChild(phone);
    slot.appendChild(float);

    const label = el('p', 'phone-label');
    label.appendChild(el('span', '', `0${i + 1} · `));
    label.appendChild(document.createTextNode(s.label));
    slot.appendChild(label);

    const shadow = el('div', 'phone-shadow');
    slot.appendChild(shadow);

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

  /* ---------- Año del footer ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
