# PokerVegasPro

Juego web de **Texas Hold'em No-Limit** con estética oscura y elegante de Las Vegas (negro, oro y neón).
Se hizo con HTML5, Tailwind CSS (CDN) y JavaScript vanilla. La vista 3D usa Three.js r128.
No necesita compilación.

> Proyecto independiente del juego Unity de este repositorio: vive entero en `PokerVegasPro/`.

## Cómo ejecutarlo

Abre `PokerVegasPro/index.html` en el navegador o sírvelo como estático:

```bash
cd PokerVegasPro
python3 -m http.server 8080   # http://localhost:8080
```

Pruebas (motor, botes laterales, manos simuladas, códigos firmados, packs y Coach):

```bash
node PokerVegasPro/tests/engine.test.js
node PokerVegasPro/tests/store.test.js
```

> Los códigos firmados usan WebCrypto, que el navegador solo habilita en contexto seguro: **HTTPS**, `localhost` o `file://`.
> Para publicar gratis sirve GitHub Pages o Netlify.

## Qué incluye

| Pilar | Implementación |
| --- | --- |
| **Vistas y cámaras** | Selector en tiempo real **2D Clásico** (DOM/CSS) ↔ **3D Inmersivo** (Three.js), con 3 cámaras 3D: *Jugador*, *Cenital* y *Cine* (órbita lenta). |
| **Orientación** | **Horizontal / Vertical / Auto**: la mesa, los asientos y la cámara 3D se recolocan. En *Auto* sigue la forma de la pantalla. |
| **Crupier** | Con esmoquin y pajarita, en el centro superior. En 2D es un SVG que respira, parpadea y mueve el brazo al repartir. En 3D es un modelo que sigue con la mirada al jugador en turno. |
| **Acciones** | Barra contextual que **solo aparece en tu turno**: Fold, Check/Call, slider de apuesta, presets **½ Bote / Bote / All-In** y botón **Mirar cartas (Peek)**. Atajos: `F` fold, `C` check/call, `R` subir, `A` all-in, `↑↓` ajustar, `Espacio` peek. |
| **Partidas públicas** | Mesas cash (Micro → High Roller) pagadas con monedas, de 6, 9 o 2 jugadores (heads-up). Bots humanizados de 3 niveles (o mixtos) que tardan en pensar, chatean y reaccionan con emotes. La sala de espera dura **1 minuto**. |
| **Salas privadas** | De 3 a 10 asientos y **puestos dinámicos** (pulsa un asiento libre para sentar un bot; “×” lo saca). El stack se fija en ciegas grandes, hay recompras, bounty, **ciegas progresivas de 10 a 40 min**, tiempo por turno, chat y emoticonos. |
| **Torneos** | Bronce, Plata, Oro y **Diamante (10M de premio)**. Las ciegas suben cada pocas manos y pagan los 3 primeros puestos (60/25/15 %). |
| **Mesas (8)** | Gratis: Casino Clásico, Playa, Bosque · Pack Élite: Espacio, Bajo el Agua (**tiburón en cada All-In**) · Pack Leyenda: Globo Aerostático, Cyberpunk, Vegas Royale. |
| **Barajas (10)** | 2 gratuitas, 5 épicas a color (Pack Élite) y 3 de lujo (Pack Leyenda): Oro 24K con brillo, Holográfica animada y Neón. |
| **Packs (pago único)** | **Pack Élite 4,99 €**: 500.000 monedas, mesas Espacio y Bajo el Agua y las 5 barajas épicas. **Pack Leyenda 9,99 €**: 2.000.000 de monedas, todas las mesas y barajas, y el Coach Pro. Se paga por PayPal.me y se sincroniza con Supabase. |
| **Códigos** | Barra en la Tienda para promos de fichas y el código de creador `damaocho` (acceso VIP Leyenda). Con cuenta los valida Supabase; como invitado, el navegador. |
| **Admin** | `admin.html` (cuenta con `is_admin`): pagos pendientes en tiempo real con confirmación en un clic, usuarios, entrega de packs y monedas, códigos e historial exportable. |
| **Personajes** | 10 modelos (7 hombres y 3 mujeres de distintas etnias) con vestuario personalizable (traje, peinado, color de pelo, accesorios, barba) o foto propia. En 3D se sientan a la mesa. |
| **Legal** | Términos, privacidad y cookies; banner de consentimiento. AdSense solo en el menú principal y solo con consentimiento. |
| **Coach Pro** | VPIP, PFR, 3-bet, factor de agresividad, WTSD, W$SD, VPIP por posición, porcentaje de aciertos (equidad Monte Carlo frente a pot odds), áreas de mejora, últimos errores y evolución por sesión. |
| **Usuarios** | Puedes jugar como invitado (10.000 monedas) o registrarte (**+50.000 monedas de bono**). Si un invitado se registra, conserva su progreso. Hay niveles/XP y estadísticas. |

## Estructura

```
PokerVegasPro/
├── index.html              Pantallas (bienvenida, menú, lobby, salas, torneos, tienda, stats, mesa) y modales
├── css/app.css             Estética de lujo, mesa 2D, cartas y temas
├── js/core.js              Espacio de nombres, emisor de eventos, utilidades y sonido WebAudio
├── js/catalog.js           Mesas, barajas, niveles de pago, apuestas, torneos y escalera de ciegas
├── admin.html              Panel privado de administración (Supabase)
├── js/config.js            PayPal, packs, promos y datos públicos de las llaves (ADMIN, CREATOR_CODE)
├── js/backend.js           Supabase: Auth, perfil, RPC pvp_*, tiempo real y consultas de admin
├── js/payments.js          Proveedores de pago (PayPal.me; preparado para Stripe)
├── js/avatars.js           Roster de 10 personajes, vestuario y retratos SVG
├── js/profile-ui.js        Editor de perfil (galería, vestuario, foto)
├── js/legal.js             Términos, privacidad, cookies y AdSense
├── js/views/humans3d.js    Personajes 3D procedurales (crupier y jugadores)
├── supabase/migrations/    Esquema pvp_* con RLS y funciones
├── js/store.js             Perfil: cuenta online (Supabase) o invitado (localStorage), saldo, compras y canjes
├── js/stats.js             Rastreador de decisiones y métricas/recomendaciones del Coach
├── js/coach-ui.js          Panel Coach Pro con gráficos SVG interactivos
├── js/admin.js             Lógica del panel de administración
├── js/poker/evaluator.js   Baraja, evaluador de 5–7 cartas, mejores 5 cartas y equidad Monte Carlo
├── js/poker/engine.js      Motor NLHE: ciegas, turnos, subidas mínimas, botes laterales, showdown y eliminaciones
├── js/poker/bots.js        IA en 3 niveles (equidad, pot odds, posición, faroles, slowplay y tiempos humanos)
├── js/views/art.js         Crupier SVG, cartas, fichas, avatares y tiburón
├── js/views/view2d.js      Mesa 2D y HUD compartido (asientos, apuestas, cronómetros, emotes)
├── js/views/view3d.js      Escena Three.js (mesa, crupier, cartas, fichas, efectos y cámaras)
├── js/game.js              Controlador de partida (modos, ciegas, recompras, bounty, chat)
├── js/hud.js               Barra de acciones, chat, selector de mesa/baraja y modales
├── js/app.js               Navegación, registro, lobby con espera, tienda y estadísticas
└── tests/engine.test.js    Pruebas en Node
```

El motor (`PokerEngine`) es una máquina de estados pura que publica eventos (`handStart`, `deal`, `turn`, `action`, `street`, `showdown`, `handEnd`…).
Las vistas y el HUD solo escuchan esos eventos. El jugador y los bots actúan por la misma vía (`engine.act`).

## Supabase y pagos

### Puesta en marcha (una vez)

1. En Supabase → **SQL Editor**, ejecuta `supabase/migrations/20261030120000_pokervegaspro.sql`.
   Crea solo tablas y funciones `pvp_*`, con RLS; no toca otras tablas del proyecto.
2. Regístrate en el juego y marca tu cuenta como administradora:
   ```sql
   update public.pvp_profiles set is_admin = true where username = 'TuUsuario';
   ```
3. Opcional: en Authentication → Providers → Email decide si exiges confirmar el correo. Si lo exiges, el jugador confirma y luego inicia sesión.

La URL del proyecto y la clave publicable están en `js/config.js`. Son públicas por diseño: la seguridad la dan RLS y las funciones del servidor.

### Flujo de compra (pago único)

1. El jugador pulsa **Comprar con PayPal**. Se crea una compra pendiente con una referencia `PV-XXXXXX` y se abre `paypal.me/Josue2698/4.99EUR` (o `9.99EUR`).
2. El jugador escribe la referencia en la nota del pago.
3. En `admin.html` ves la compra en «Pagos pendientes». Compruebas en PayPal que el importe y la referencia coinciden y pulsas **Confirmar**.
4. El servidor suma las monedas, desbloquea el nivel y el jugador lo ve al instante (tiempo real), sin códigos.

PayPal.me no notifica los pagos, así que el paso 3 es un clic manual. Para automatizarlo:
- Cambia a Stripe Checkout o PayPal Checkout (`PAYMENT_PROVIDER` en `config.js` y un proveedor en `js/payments.js`).
- Añade una Edge Function con el webhook que llame a `pvp_confirm_purchase_internal` con la `service_role`.
- La tabla de compras ya guarda `provider` y `provider_ref`, y la confirmación es idempotente.

### Seguridad

- **Lo que puede cambiar el jugador:** solo lee su perfil y edita columnas cosméticas (preferencias, estadísticas y XP).
- **Lo que no puede cambiar:** monedas, nivel, compras y códigos. Solo cambian mediante funciones `SECURITY DEFINER`, que validan y lo dejan todo registrado en `pvp_coin_ledger`.
- **Límite de las partidas:** contra rivales virtuales la partida se juega en el navegador, así que el servidor no puede verificar cada mano. Aplica límites por movimiento y lo registra todo.
- **Códigos:** solo se guarda su hash.

## Pendiente

- **Multijugador real con prioridad para personas:** las mesas deben llenarse primero con jugadores conectados, y los rivales virtuales solo ocupar los huecos.
  Para que nadie vea cartas ajenas ni se invente fichas, la mano se tiene que repartir y resolver en el servidor:
  Edge Functions de Supabase con `PokerEngine` y una tabla de mesas en tiempo real.
- **Pagos automáticos:** Stripe o PayPal Checkout con webhook (ver arriba).
- **Textos legales:** completa `LEGAL` en `js/config.js` (titular y correo) y haz que los revise un profesional.
- **AdSense:** pon tu `client` y `slot` en `ADSENSE` (`js/config.js`). Desactiva los «anuncios automáticos» en AdSense para que no aparezcan dentro de las partidas.
- **Juego responsable:** las monedas son virtuales y no se pueden canjear por dinero.
