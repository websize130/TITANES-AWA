/* PokerVegasPro — proveedores de pago. Hoy: PayPal.me (confirmación manual en el panel de admin).
 * Para escalar a Stripe o PayPal Checkout basta con añadir un proveedor con `checkout()` y un webhook
 * (Edge Function) que llame a `pvp_confirm_purchase_internal` con la service_role: el resto del flujo no cambia.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  const providers = {
    paypal_me: {
      id: 'paypal_me',
      name: 'PayPal',
      automatic: false, // PayPal.me no avisa del pago: se confirma en admin.html
      /** Abre PayPal.me con el importe; la referencia de la compra va en la nota del pago. */
      checkout(purchase, win) {
        const C = PVP.Config;
        const url = C.PAYPAL_ME + '/' + Number(purchase.amount).toFixed(2) + C.CURRENCY;
        // `win` se abre en el clic del jugador (antes de esperar al servidor) para que no lo bloquee el navegador.
        if (win && !win.closed) { win.opener = null; win.location.href = url; } else root.open(url, '_blank', 'noopener');
        return url;
      },
    },
    // stripe: { id: 'stripe', automatic: true, checkout(purchase) { /* redirigir a Stripe Checkout con purchase.reference */ } },
  };

  PVP.Payments = {
    providers,
    current() { return providers[PVP.Config.PAYMENT_PROVIDER] || providers.paypal_me; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
