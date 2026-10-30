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
node PokerVegasPro/tests/monetization.test.js
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
| **Packs mensuales** | **Pack Élite 4,99 €/mes**: 500.000 monedas, mesas Espacio y Bajo el Agua y las 5 barajas épicas. **Pack Leyenda 9,99 €/mes**: 2.000.000 de monedas, todas las mesas y barajas, y el Coach Pro. Se paga por PayPal.me. |
| **Códigos** | Una barra en la Tienda canjea promos de fichas, códigos de activación firmados por el admin y el código secreto de creador (Leyenda permanente). |
| **Admin** | `admin.html`, protegido con contraseña: genera códigos para cualquier ID de jugador, gestiona las cuentas de ese navegador, crea promos y lleva un registro exportable a CSV. |
| **Coach Pro** | VPIP, PFR, 3-bet, factor de agresividad, WTSD, W$SD, VPIP por posición, porcentaje de aciertos (equidad Monte Carlo frente a pot odds), áreas de mejora, últimos errores y evolución por sesión. |
| **Usuarios** | Puedes jugar como invitado (10.000 monedas) o registrarte (**+50.000 monedas de bono**). Si un invitado se registra, conserva su progreso. Hay niveles/XP y estadísticas. |

## Estructura

```
PokerVegasPro/
├── index.html              Pantallas (bienvenida, menú, lobby, salas, torneos, tienda, stats, mesa) y modales
├── css/app.css             Estética de lujo, mesa 2D, cartas y temas
├── js/core.js              Espacio de nombres, emisor de eventos, utilidades y sonido WebAudio
├── js/catalog.js           Mesas, barajas, niveles de pago, apuestas, torneos y escalera de ciegas
├── admin.html              Panel privado de administración (pagos manuales)
├── js/config.js            PayPal, packs, promos y datos públicos de las llaves (ADMIN, CREATOR_CODE)
├── js/vouchers.js          Firmas ECDSA, hash PBKDF2 del código de creador y llave admin cifrada (AES-GCM)
├── js/store.js             Cuentas, sesión, monedas, packs con caducidad, canjes y preferencias (localStorage)
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

## Monetización con PayPal (sin backend ni APIs de pago)

### Configuración inicial (una sola vez)

1. Abre `admin.html` (no está enlazado desde el juego y no se indexa).
2. En **Configuración inicial** elige una contraseña de al menos 12 caracteres y, si quieres, tu **código secreto de creador**.
3. Copia el bloque generado y sustituye en `js/config.js` las líneas `ADMIN: null,` y `CREATOR_CODE: null,`. Publica el cambio.
   - `ADMIN` contiene la llave pública y la llave privada **cifrada** con tu contraseña.
   - `CREATOR_CODE` es solo un hash PBKDF2.
   - Ninguno revela secretos, así que se pueden publicar.
   - Para probar antes de publicar, pulsa «Aplicar solo en este navegador».

### Flujo de un pago

1. El jugador pulsa **Pagar con PayPal**. Se abre `paypal.me/Josue2698/4.99EUR` (o `9.99EUR`) y su ID (`PVP-XXXXXX`) se copia para pegarlo en la nota.
2. Compruebas el pago en PayPal. En `admin.html` introduces su ID, eliges el pack y generas el código.
   El botón «Copiar mensaje para el jugador» prepara el texto con el enlace de canje.
3. El jugador lo canjea en **Tienda → Canjear** (o abriendo el enlace). Recibe las monedas del mes y el nivel se activa 30 días. Si lo renueva, se suman otros 30.
4. Si el jugador usa el mismo navegador que el panel (por ejemplo, el tuyo o un amigo en tu equipo), también puedes aplicarle el pack directamente desde «Usuarios registrados».

### Seguridad

- **Códigos de activación:** van firmados con ECDSA P-256 y atados al ID del jugador. Son de un solo uso y pueden caducar.
  Sin tu contraseña nadie puede fabricar uno válido, y un código alterado se rechaza.
- **Código de creador:** solo se publica su hash PBKDF2 (250.000 iteraciones). El texto no aparece en el código fuente.
- **Llave privada:** solo existe descifrada en memoria mientras el panel está abierto.

### Limitaciones de un modelo sin servidor

- **Saldo en el navegador:** monedas y niveles viven en el `localStorage` del jugador. Alguien con conocimientos técnicos podría editarlos a mano en su propio navegador.
  Las firmas impiden falsificar códigos, no editar datos locales.
- **Lista de usuarios limitada:** el panel solo ve las cuentas de su navegador. Para jugadores de otros dispositivos se trabaja con su ID y un código.
- **Sin cobro automático:** PayPal.me no hace cargos recurrentes, así que cada mes el jugador vuelve a pagar y recibe un código nuevo.

Para validar saldos en servidor y ver a todos los usuarios, el siguiente paso sería un backend con plan gratuito (por ejemplo Supabase o Firebase Spark),
reutilizando el mismo formato de códigos.

## Pendiente para producción

Esta versión es **100 % cliente**:

- **Cuentas y monedas** se guardan en `localStorage` (la contraseña va con hash SHA-256, pero sigue siendo una demo).
  En producción necesitan un backend con autenticación real y saldo validado en servidor.
- **Pagos**: son manuales, con PayPal.me y códigos firmados (ver arriba). Para automatizarlos haría falta un servidor que reciba los avisos de pago (webhooks) de PayPal.
- **Multijugador online**: la estructura de salas (código e invitación por enlace) ya está.
  Falta un servidor autoritativo (WebSocket) que ejecute `PokerEngine` y reparta el estado a cada jugador sin filtrar las cartas ocultas.
  Hasta entonces, los asientos se completan con bots.
- **Juego responsable**: las monedas son virtuales y no se pueden canjear por dinero.
