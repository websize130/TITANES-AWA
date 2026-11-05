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
     CONFIGURADOR MODULAR + GENERADOR DINÁMICO DE WHATSAPP
     ========================================================= */
  const MODULES = [
    { id: 'web',    icon: '🌐', title: 'Web Corporativa',
      desc: 'Web premium, rápida y optimizada para SEO local y conversión.',
      feats: ['Mobile‑first', 'SEO local', 'Carga < 2 s'] },
    { id: 'dash',   icon: '📊', title: 'Dashboard de Métricas',
      desc: 'Panel en tiempo real con ventas, leads, citas y rendimiento de tu negocio.',
      feats: ['KPIs en vivo', 'Gráficos', 'Exportación'] },
    { id: 'crm',    icon: '🗂️', title: 'CRM a Medida',
      desc: 'Gestiona clientes, presupuestos y seguimiento en un pipeline visual.',
      feats: ['Pipeline', 'Historial', 'Recordatorios'] },
    { id: 'ia',     icon: '🤖', title: 'Automatización WhatsApp / IA',
      desc: 'Agente que responde, cualifica leads y deriva a una persona cuando hace falta.',
      feats: ['Respuestas 24/7', 'Cualificación', 'Derivación humana'] },
    { id: 'book',   icon: '📅', title: 'Sistema de Reservas',
      desc: 'Agenda online con confirmaciones y recordatorios automáticos.',
      feats: ['Calendario', 'Recordatorios', 'Menos ausencias'] },
  ];

  const moduleGrid = document.getElementById('moduleGrid');
  const selected = new Set();

  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

  MODULES.forEach((m) => {
    const label = el('label', 'module-card');
    const input = el('input');
    input.type = 'checkbox';
    input.value = m.id;
    input.setAttribute('aria-describedby', `desc-${m.id}`);

    const inner = el('div', 'module-inner');
    const top = el('div', 'module-top');
    top.appendChild(el('span', 'module-ico', m.icon));
    const check = el('span', 'check');
    check.innerHTML = CHECK_SVG;
    top.appendChild(check);
    inner.appendChild(top);
    inner.appendChild(el('h3', 'module-title', m.title));
    const d = el('p', 'module-desc', m.desc);
    d.id = `desc-${m.id}`;
    inner.appendChild(d);
    const feats = el('div', 'module-feats');
    m.feats.forEach((f) => feats.appendChild(el('span', '', f)));
    inner.appendChild(feats);

    label.appendChild(input);
    label.appendChild(inner);
    moduleGrid.appendChild(label);

    input.addEventListener('change', () => {
      if (input.checked) selected.add(m.id); else selected.delete(m.id);
      updateConfigurator(true);
    });

    if (finePointer && !reduceMotion) {
      label.addEventListener('pointermove', (e) => {
        const r = label.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        inner.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        inner.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        inner.style.setProperty('--mry', `${((x - 0.5) * 10).toFixed(2)}deg`);
        inner.style.setProperty('--mrx', `${((0.5 - y) * 10).toFixed(2)}deg`);
      });
      label.addEventListener('pointerleave', () => {
        inner.style.setProperty('--mry', '0deg');
        inner.style.setProperty('--mrx', '0deg');
      });
    }
  });

  const sumCount = document.getElementById('sumCount');
  const sumTotal = document.getElementById('sumTotal');
  const sumBar = document.getElementById('sumBar');
  const sumList = document.getElementById('sumList');
  const sumEmpty = document.getElementById('sumEmpty');
  const msgPreview = document.getElementById('msgPreview');
  const sumSend = document.getElementById('sumSend');
  const sumReset = document.getElementById('sumReset');
  const fab = document.getElementById('waFab');
  const fabBadge = document.getElementById('fabBadge');
  const fabTitle = document.getElementById('fabTitle');
  const fabSub = document.getElementById('fabSub');
  sumTotal.textContent = MODULES.length;

  const buildMessage = (mods) => {
    const lines = [
      'Hola Web Size 👋',
      'He configurado mi solución a la carta en vuestra web y me interesan estos módulos:',
      '',
      ...mods.map((m, i) => `${i + 1}. ${m.icon} ${m.title}`),
      '',
      `Total: ${mods.length} ${mods.length === 1 ? 'módulo' : 'módulos'}.`,
      '¿Me preparáis una propuesta? ¡Gracias!',
    ];
    return lines.join('\n');
  };

  const setSelected = (id, on) => {
    const input = moduleGrid.querySelector(`input[value="${id}"]`);
    if (input) input.checked = on;
    if (on) selected.add(id); else selected.delete(id);
  };

  function updateConfigurator(bump) {
    const mods = MODULES.filter((m) => selected.has(m.id)); // mantiene el orden del catálogo
    const n = mods.length;

    sumCount.textContent = n;
    sumBar.style.width = `${(n / MODULES.length) * 100}%`;
    sumEmpty.hidden = n > 0;

    sumList.textContent = '';
    mods.forEach((m) => {
      const li = el('li');
      li.appendChild(el('span', '', m.icon));
      li.appendChild(el('span', 'text-silver-200', m.title));
      const rm = el('button', '', '×');
      rm.type = 'button';
      rm.setAttribute('aria-label', `Quitar ${m.title}`);
      rm.addEventListener('click', () => { setSelected(m.id, false); updateConfigurator(true); });
      li.appendChild(rm);
      sumList.appendChild(li);
    });

    const msg = n ? buildMessage(mods) : GENERAL_MESSAGE;
    msgPreview.textContent = msg;

    if (n) {
      const href = waLink(msg);
      sumSend.href = href;
      sumSend.classList.remove('is-disabled');
      sumSend.setAttribute('aria-disabled', 'false');
      sumSend.textContent = 'Enviar por WhatsApp';

      fab.href = href;
      fab.target = '_blank';
      fab.rel = 'noopener noreferrer';
      fab.classList.add('active');
      fabTitle.textContent = `Enviar mi combinación (${n})`;
      fabSub.textContent = mods.map((m) => m.title).join(' · ');
      fab.setAttribute('aria-label', `Enviar por WhatsApp la combinación: ${mods.map((m) => m.title).join(', ')}`);
    } else {
      sumSend.href = '#';
      sumSend.classList.add('is-disabled');
      sumSend.setAttribute('aria-disabled', 'true');
      sumSend.textContent = 'Enviar por WhatsApp';

      fab.href = '#configurador';
      fab.removeAttribute('target');
      fab.classList.remove('active');
      fabTitle.textContent = 'Configura tu solución';
      fabSub.textContent = 'Elige módulos a la carta';
      fab.setAttribute('aria-label', 'Ir al configurador de módulos');
    }

    fabBadge.textContent = n;
    if (bump && n) { fabBadge.classList.remove('bump'); void fabBadge.offsetWidth; fabBadge.classList.add('bump'); }
  }

  sumReset.addEventListener('click', () => {
    MODULES.forEach((m) => setSelected(m.id, false));
    updateConfigurator(false);
  });
  [sumSend, fab].forEach((a) => a.addEventListener('click', () => {
    if (selected.size) showToast(`Abriendo WhatsApp · ${selected.size} ${selected.size === 1 ? 'módulo' : 'módulos'}`);
  }));

  updateConfigurator(false);

  /* Oculta el botón flotante mientras el resumen (con su propio botón de envío) está a la vista: evita duplicados */
  new IntersectionObserver((entries) => {
    fab.classList.toggle('tucked', entries[0].isIntersecting);
  }, { threshold: 0.25 }).observe(sumSend.closest('.summary'));

  /* ---------- Año del footer ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
