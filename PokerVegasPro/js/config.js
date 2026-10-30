/* PokerVegasPro — configuración pública (la descarga cada jugador: aquí no van secretos). */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  PVP.Config = {
    /* Supabase: URL del proyecto y clave publicable (pensada para el navegador; la seguridad la dan RLS y las funciones). */
    SUPABASE: {
      url: 'https://bwiiyqgrvsttedalyhdw.supabase.co',
      key: 'sb_publishable_xTa2trS-_PmMRkpWMD4kMw_2fIayEZX',
    },

    /* Pagos. Proveedor actual: PayPal.me (confirmación manual). Preparado para 'stripe' o 'paypal_checkout'. */
    PAYMENT_PROVIDER: 'paypal_me',
    PAYPAL_ME: 'https://www.paypal.me/Josue2698',
    CURRENCY: 'EUR',

    /* Packs de pago único y permanente. Los importes que cuentan son los del servidor (pvp_pack_info). */
    PACKS: {
      elite: {
        name: 'Pack Élite', price: 4.99, coins: 500000,
        perks: ['500.000 monedas para siempre', 'Mesas Espacio y Bajo el Agua (tiburón en All-In)', '5 barajas épicas a todo color'],
      },
      legend: {
        name: 'Pack Leyenda', price: 9.99, coins: 2000000,
        perks: ['2.000.000 de monedas para siempre', 'Las 8 mesas, incluidas Globo, Cyberpunk y Vegas Royale', 'Todas las barajas: épicas y de lujo (Oro, Holo, Neón)', 'Panel Coach: VPIP, PFR, agresividad y evolución'],
      },
    },

    /* Datos para los textos legales: complétalos con tu nombre/empresa y un correo de contacto. */
    LEGAL: { owner: '[Tu nombre o empresa]', taxId: '', email: '[correo de contacto]', updated: '30/10/2026' },

    /* Google AdSense (solo menú principal, solo con consentimiento). Ej.: client 'ca-pub-1234567890123456', slot '1234567890'. */
    ADSENSE: { client: '', slot: '' },

    /* Recompensa diaria semanal: lunes 4.000 y ×2 cada día hasta el domingo. El ciclo empieza cada lunes (hora de España). */
    DAILY: { base: 4000, factor: 2, timeZone: 'Europe/Madrid' },

    /* Modo invitado (sin cuenta): códigos que se validan en el navegador, solo por su hash SHA-256 en mayúsculas.
     * Con cuenta, los códigos se validan en Supabase (tabla pvp_codes). */
    LOCAL_CODES: [
      // damaocho: Pack Leyenda permanente. Límite global de 15 canjes (en Supabase); sin servidor, 15 por dispositivo.
      { hash: '2ae635cea8c6da7478e37e3bbf1f43eb1b26b2cc7dc932ef4a4a86e18282af9f', kind: 'creator', tier: 'legend', coins: 0, maxUses: 15 },
      { hash: 'ad0ca9c485746fef3e5dac765e05f2565d4c9e7ab4024aa2985ae3a301d0819b', kind: 'promo', coins: 10000 }, // BIENVENIDO
      { hash: '43e2816a707c1b39ccce4d11b297618acc302077086806d3c1c6751c8799b928', kind: 'promo', coins: 25000 }, // VEGASPRO
    ],
  };

  /** Enlace de PayPal.me con el importe ya puesto. */
  PVP.Config.paypalLink = function (packId) {
    const p = PVP.Config.PACKS[packId];
    return PVP.Config.PAYPAL_ME + '/' + p.price.toFixed(2) + PVP.Config.CURRENCY;
  };
})(typeof window !== 'undefined' ? window : globalThis);
