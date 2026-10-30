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

Pruebas del motor (evaluador, botes laterales y 600+ manos simuladas con bots):

```bash
node PokerVegasPro/tests/engine.test.js
```

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
| **Mesas (8)** | Gratis: Casino Clásico, Playa, Bosque · 4,99 €: Espacio, Bajo el Agua (**tiburón en cada All-In**) · 9,99 €: Globo Aerostático, Cyberpunk, Vegas Royale (acceso total). |
| **Barajas (10)** | 2 gratuitas, 5 épicas a color (4,99 €) y 3 de lujo (9,99 €): Oro 24K con brillo, Holográfica animada y Neón. |
| **Usuarios** | Puedes jugar como invitado (10.000 monedas) o registrarte (**+50.000 monedas de bono**). Si un invitado se registra, conserva su progreso. Hay niveles/XP y estadísticas. |

## Estructura

```
PokerVegasPro/
├── index.html              Pantallas (bienvenida, menú, lobby, salas, torneos, tienda, stats, mesa) y modales
├── css/app.css             Estética de lujo, mesa 2D, cartas y temas
├── js/core.js              Espacio de nombres, emisor de eventos, utilidades y sonido WebAudio
├── js/catalog.js           Mesas, barajas, niveles de pago, apuestas, torneos y escalera de ciegas
├── js/store.js             Cuentas, sesión, monedas, XP y preferencias (localStorage)
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

## Pendiente para producción

Esta versión es **100 % cliente**:

- **Cuentas y monedas** se guardan en `localStorage` (la contraseña va con hash SHA-256, pero sigue siendo una demo).
  En producción necesitan un backend con autenticación real y saldo validado en servidor.
- **Pagos**: la tienda no tiene pasarela. Las compras se pueden activar en *modo demo*.
  Para cobrar de verdad hay que integrar, por ejemplo, Stripe Checkout y dar el nivel desde un webhook del servidor.
- **Multijugador online**: la estructura de salas (código e invitación por enlace) ya está.
  Falta un servidor autoritativo (WebSocket) que ejecute `PokerEngine` y reparta el estado a cada jugador sin filtrar las cartas ocultas.
  Hasta entonces, los asientos se completan con bots.
- **Juego responsable**: las monedas son virtuales y no se pueden canjear por dinero.
