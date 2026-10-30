/* PokerVegasPro — textos legales, consentimiento de cookies y banner de Google AdSense (solo en el menú principal). */
(function (root) {
  'use strict';

  const PVP = root.PVP;
  const $ = (s, r) => (r || document).querySelector(s);
  const KEY = 'pvp.consent.v1';
  const C = () => PVP.Config;

  function consent() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function setConsent(ads) {
    try { localStorage.setItem(KEY, JSON.stringify({ ads: !!ads, t: Date.now() })); } catch (e) { /* sin almacenamiento */ }
    $('#cookie-banner').classList.remove('show');
    refreshAds();
  }

  /* ---------- textos ---------- */
  function texts() {
    const L = C().LEGAL;
    const who = `<b>${L.owner}</b>${L.taxId ? ' (' + L.taxId + ')' : ''}, contacto: <b>${L.email}</b>`;
    const updated = L.updated;
    return {
      terms: `
        <h4>1. Qué es PokerVegasPro</h4>
        <p>PokerVegasPro es un juego social de póker Texas Hold'em ofrecido por ${who}. Es solo entretenimiento:
          <b>no hay apuestas con dinero real ni premios en dinero</b>. Las monedas y fichas son virtuales, no tienen valor económico
          y no se pueden canjear, transferir ni vender.</p>
        <h4>2. Edad</h4>
        <p>Para jugar debes tener al menos 18 años o la edad mínima que exija la ley de tu país para juegos de casino social.</p>
        <h4>3. Cuentas</h4>
        <p>Debes dar datos veraces y custodiar tu contraseña. Podemos suspender cuentas que hagan trampas, manipulen el juego o abusen de otros jugadores.</p>
        <h4>4. Rivales</h4>
        <p>Las mesas se completan con <b>rivales virtuales</b> controlados por el juego cuando no hay suficientes jugadores conectados. Su comportamiento simula estilos de juego humanos.</p>
        <h4>5. Compras (pago único)</h4>
        <p>El Pack Élite (4,99 €) y el Pack Leyenda (9,99 €) son pagos únicos por contenido digital: monedas virtuales y desbloqueos permanentes
          de mesas, barajas y funciones. El pago se realiza a través de PayPal. Tras confirmar el pago, el contenido se activa en tu cuenta.
          Al comprar aceptas que el suministro del contenido digital empiece de inmediato y reconoces que, una vez activado, pierdes el derecho de desistimiento,
          según el artículo 103.m del Real Decreto Legislativo 1/2007. Si no recibes lo comprado, escríbenos y lo resolveremos o te devolveremos el importe.</p>
        <h4>6. Códigos promocionales</h4>
        <p>Los códigos son personales o promocionales, tienen las condiciones indicadas al publicarse y pueden retirarse si se detecta un uso fraudulento.</p>
        <h4>7. Responsabilidad</h4>
        <p>El servicio se presta «tal cual». Haremos lo posible por mantenerlo disponible, pero no garantizamos que funcione sin interrupciones.</p>
        <h4>8. Ley aplicable</h4>
        <p>Se aplica la legislación española y, si eres consumidor, también las normas imperativas de tu país de residencia.</p>
        <p class="legal-date">Última actualización: ${updated}</p>`,
      privacy: `
        <h4>Responsable</h4><p>${who}.</p>
        <h4>Qué datos tratamos</h4>
        <p>Correo electrónico y contraseña (gestionada de forma cifrada por Supabase Auth), nombre de usuario, avatar o foto que subas,
          monedas, desbloqueos, estadísticas de juego, historial de compras (importe, fecha, referencia y estado) y datos técnicos necesarios para el servicio.</p>
        <h4>Para qué y con qué base</h4>
        <p>Prestar el juego y tu cuenta (ejecución del contrato); gestionar las compras (contrato y obligaciones legales);
          mostrar publicidad de Google AdSense solo si das tu consentimiento.</p>
        <h4>Proveedores</h4>
        <p>Supabase (base de datos y autenticación, servidores en la UE, Irlanda), PayPal (pagos, como responsable independiente)
          y Google (publicidad, solo con tu consentimiento).</p>
        <h4>Conservación</h4>
        <p>Mientras mantengas la cuenta. Los datos de compras se guardan el tiempo que exige la normativa fiscal.</p>
        <h4>Tus derechos</h4>
        <p>Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a <b>${L.email}</b>,
          y reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
        <p class="legal-date">Última actualización: ${updated}</p>`,
      cookies: `
        <p>Usamos almacenamiento local del navegador para mantener tu sesión y tus preferencias; es imprescindible para que el juego funcione.</p>
        <p>Con tu consentimiento, Google AdSense puede usar cookies para mostrar y medir anuncios, solo en el menú principal.
          Más información en <b>policies.google.com/technologies/ads</b>.</p>
        <div class="cookie-opts">
          <label class="toggle-field"><input type="checkbox" checked disabled /><span class="tg"></span><span>Necesarias (sesión y preferencias)</span></label>
          <label class="toggle-field"><input type="checkbox" id="consent-ads" /><span class="tg"></span><span>Publicidad (Google AdSense)</span></label>
        </div>
        <button class="lux-btn sm mt-3" id="consent-save" type="button"><span>Guardar preferencias</span></button>`,
    };
  }

  let tab = 'terms';
  function openLegal(which) {
    tab = which || 'terms';
    renderLegal();
    PVP.ui.open('modal-legal');
  }
  function renderLegal() {
    const t = texts();
    document.querySelectorAll('#legal-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === tab));
    $('#legal-body').innerHTML = t[tab];
    const ads = $('#consent-ads');
    if (ads) ads.checked = !!(consent() && consent().ads);
  }

  /* ---------- AdSense ---------- */
  let screen = null;
  let adPushed = false;
  function refreshAds() {
    const slot = $('#ad-menu');
    if (!slot) return;
    const A = C().ADSENSE;
    const allowed = screen === 'menu' && A && A.client && consent() && consent().ads;
    slot.hidden = !allowed;
    if (!allowed) return;
    if (!document.getElementById('adsbygoogle-js')) {
      const s = document.createElement('script');
      s.id = 'adsbygoogle-js';
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(A.client);
      document.head.appendChild(s);
    }
    if (!adPushed) {
      slot.innerHTML = `<span class="ad-label">Publicidad</span><ins class="adsbygoogle" style="display:block" data-ad-client="${A.client}" data-ad-slot="${A.slot}" data-ad-format="horizontal" data-full-width-responsive="true"></ins>`;
      try { (root.adsbygoogle = root.adsbygoogle || []).push({}); adPushed = true; } catch (e) { /* bloqueador de anuncios */ }
    }
  }

  /** Llamar en cada cambio de pantalla: el anuncio solo existe en el menú principal. */
  function onScreen(name) {
    screen = name;
    refreshAds();
  }

  function init() {
    document.addEventListener('click', (e) => {
      const l = e.target.closest('[data-legal]');
      if (l) { e.preventDefault(); openLegal(l.dataset.legal); }
      const t = e.target.closest('#legal-tabs button');
      if (t) { tab = t.dataset.v; renderLegal(); }
      if (e.target.closest('#consent-save')) { setConsent($('#consent-ads').checked); PVP.ui.toast('Preferencias de cookies guardadas'); }
      if (e.target.closest('#cookie-accept')) setConsent(true);
      if (e.target.closest('#cookie-reject')) setConsent(false);
      if (e.target.closest('#cookie-config')) openLegal('cookies');
    });
    if (!consent()) $('#cookie-banner').classList.add('show');
  }

  PVP.Legal = { init, onScreen, openLegal, consent };
})(window);
