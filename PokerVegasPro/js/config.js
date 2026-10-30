/* PokerVegasPro — configuración de monetización.
 * Este archivo es público (lo descarga cada jugador): aquí solo van datos que se pueden publicar.
 * ADMIN y CREATOR_CODE se generan en admin.html → «Configuración inicial» y se pegan aquí.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  PVP.Config = {
    PAYPAL_ME: 'https://www.paypal.me/Josue2698',
    CURRENCY: 'EUR',

    /* Suscripciones mensuales: cada pago verificado activa 30 días y entrega las monedas del mes. */
    PACKS: {
      elite: {
        name: 'Pack Élite', price: 4.99, coins: 500000, days: 30,
        perks: ['500.000 monedas cada mes', 'Mesas Espacio y Bajo el Agua (tiburón en All-In)', '5 barajas épicas a todo color'],
      },
      legend: {
        name: 'Pack Leyenda', price: 9.99, coins: 2000000, days: 30,
        perks: ['2.000.000 de monedas cada mes', 'Las 8 mesas, incluidas Globo, Cyberpunk y Vegas Royale', 'Todas las barajas: épicas y de lujo (Oro, Holo, Neón)', 'Panel Coach: VPIP, PFR, agresividad y evolución'],
      },
    },

    /* Llave pública del admin + llave privada cifrada con su contraseña (generado en admin.html). */
    ADMIN: null,

    /* Hash PBKDF2 del código secreto de creador (generado en admin.html). El texto nunca va aquí. */
    CREATOR_CODE: null,

    /* Códigos promocionales públicos de fichas: sha256('pvp-promo:' + CÓDIGO). Un canje por cuenta. */
    PROMO_CODES: [
      { hash: 'c83739b907526e2e4c4174ffee6e2eb3dc742bdd938b49b98ae065d2d52eaeee', coins: 10000, until: 0 }, // BIENVENIDO
      { hash: '8d5e63bae255b6b2596a3588d5edc4a6ed02ed08d25e0624ea351324ccc3c156', coins: 25000, until: 0 }, // VEGASPRO
    ],
  };

  /* Pruebas: admin.html puede aplicar su configuración solo en este navegador antes de publicarla.
   * Nunca sustituye valores ya publicados en este archivo. */
  PVP.Config.LOCAL_KEY = 'pvp.config.local';
  try {
    const local = JSON.parse(root.localStorage.getItem(PVP.Config.LOCAL_KEY) || 'null');
    if (local) {
      if (!PVP.Config.ADMIN && local.ADMIN) { PVP.Config.ADMIN = local.ADMIN; PVP.Config.LOCAL_OVERRIDE = true; }
      if (!PVP.Config.CREATOR_CODE && local.CREATOR_CODE) { PVP.Config.CREATOR_CODE = local.CREATOR_CODE; PVP.Config.LOCAL_OVERRIDE = true; }
    }
  } catch (e) { /* sin localStorage (Node o modo privado) */ }

  /** Enlace de PayPal.me con el importe ya puesto. */
  PVP.Config.paypalLink = function (packId) {
    const p = PVP.Config.PACKS[packId];
    return PVP.Config.PAYPAL_ME + '/' + p.price.toFixed(2) + PVP.Config.CURRENCY;
  };
})(typeof window !== 'undefined' ? window : globalThis);
