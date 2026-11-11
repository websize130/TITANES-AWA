# ECLIPSE: The Fallen Kingdom

Action RPG 3D en tercera persona para navegador (Android incluido), hecho con
**Three.js + Vite + ES Modules**. Incluye la experiencia de consola (título,
menús navegables con mando, carga, HUD, pausa, ajustes) y un mundo de prueba
con un avatar provisional; el contenido del juego aún no está empezado.

## Versiones instaladas y verificadas

| Herramienta | Versión | Uso |
|---|---|---|
| Node.js / npm (entorno cloud) | 22.23.4 / 10.9.9 | Ejecutar Vite y herramientas |
| three | 0.187.0 (r187) | Render 3D WebGL 2 |
| GLTFLoader, DRACOLoader, SkeletonUtils, OrbitControls, HDRLoader | incluidos en three | Modelos, compresión, personajes animados |
| vite | 8.3.7 | Servidor de desarrollo y build |
| lil-gui | 0.21.0 | Panel de depuración (`?debug`) |
| @fontsource-variable/cinzel, manrope | 5.3.0 | Tipografías OFL empaquetadas (funcionan sin conexión) |
| @gltf-transform/cli | 4.5.1 | Inspeccionar, validar y optimizar GLB |

## Comandos

```bash
npm install          # instala dependencias
npm run check        # comprueba Node, paquetes e import de three
npm run dev          # servidor de desarrollo → http://localhost:5173
npm run build        # build de producción en dist/
npm run preview      # sirve dist/ → http://localhost:4173

npm run model:inspect  -- public/models/x.glb              # tamaño, mallas, texturas
npm run model:validate -- public/models/x.glb              # validador glTF de Khronos
npm run model:optimize -- entrada.glb public/models/x.glb  # DRACO + texturas WebP
```

## Parámetros de URL

- `?debug` — panel lil-gui (perfil, exposición, luces, cámara libre Orbit) y datos de rendimiento.
- `?gfx=low|medium|high` — fuerza un perfil gráfico.

## Perfiles gráficos (`src/core/GraphicsProfiles.js`)

| | Bajo | Medio | Alto |
|---|---|---|---|
| Límite FPS | 30 | 60 | 60 |
| pixelRatio máx. (mín. dinámico) | 1 (0.6) | 1.5 (0.75) | 2 (1) |
| Sombras | no | PCF 1024 | PCF 2048 |
| Antialias MSAA | no | no | sí (si el hardware lo soporta) |
| Reflejos de entorno PBR | no | sí | sí |
| Anisotropía | 1 | 4 | 8 |

Selección automática: en móvil/tablet nunca se elige "Alto" (≤4 GB RAM → Bajo, si
no → Medio); en escritorio → Alto. La elección manual se guarda en `localStorage`.

Protecciones para Android: resolución dinámica según FPS, límite de FPS, pausa
del bucle al ocultar la pestaña, recuperación de pérdida de contexto WebGL,
`touch-action: none` y lil-gui cargado solo con `?debug`.

## Flujo de pantallas

`Título (pulsa cualquier botón) → Menú principal → Carga → Partida ⇄ Pausa → Menú`

- Un único renderer WebGL 2: el fondo del menú es una escena 3D (eclipse con
  corona por shader, reino caído flotante, estrellas y brasas por GPU).
- **JUGAR** (Continuar / Nueva partida) pide pantalla completa y orientación
  horizontal dentro del gesto del usuario, muestra la carga (con compilación
  real de shaders) y entra al juego sin recargar. Al volver al menú se sale de
  la pantalla completa y se guarda la partida.
- Si el jugador sale de la pantalla completa (Esc, gesto atrás), pierde el
  puntero del ratón, cambia de pestaña, desconecta el mando o gira a vertical,
  el juego se pausa.

## Controles

| Acción | Teclado y ratón | Mando (mapeo estándar) | Táctil |
|---|---|---|---|
| Mover | WASD / flechas | Stick izquierdo | Stick virtual (mitad izquierda) |
| Cámara | Ratón (clic para capturar) | Stick derecho | Arrastrar (mitad derecha) |
| Atacar | Clic izquierdo / J | □ · X · izquierda | Botón espada |
| Esquivar | Espacio / Shift | ○ · B · derecha | Botón » |
| Habilidad | Q | △ · Y · arriba | Botón estrella |
| Bloquear (mantener) | Clic derecho | L1 · LB | Botón escudo |
| Interactuar | E | ✕ · A · abajo | Botón círculo |
| Pausa | Esc / P | Options · Menú · Start | Botón ❚❚ |
| Menús | Flechas, Enter, Esc | Cruceta/stick, ✕/A, ○/B | Tocar |

El último dispositivo usado manda: las indicaciones cambian al instante
(glifos PlayStation, Xbox o genéricos según `Gamepad.id`, teclas o nada en
táctil). Se puede forzar en Ajustes → Iconos de botones. Los glifos son formas
propias; no se usan logotipos ni recursos de marcas.

## Protagonista

Diseño definitivo y plan de producción del modelo 3D en
`art-source/protagonista/GUIA.md` (referencia, reglas de consistencia,
especificación del GLB, pasos de TRELLIS y Mixamo).

## Compatibilidad real (no garantizada en todos los navegadores)

| Función | Android Chrome / Samsung | Escritorio Chrome/Edge/Firefox | iPhone Safari | iPad Safari |
|---|---|---|---|---|
| Pantalla completa | Sí | Sí | **No** (solo vídeo) | Parcial (webkit) |
| Bloqueo horizontal | Sí (en pantalla completa o PWA) | No aplica | No | No |
| Mando | Sí (Bluetooth/USB) | Sí | Sí | Sí |
| Vibración | Mando: Chrome · Dispositivo: `navigator.vibrate` | Mando: Chrome/Edge | No | No |
| Mantener pantalla encendida | Sí | Sí | Sí (recientes) | Sí |
| Instalar como app (PWA) | Sí | Chrome/Edge | "Añadir a inicio" | "Añadir a inicio" |

Los botones del mando **no** cuentan como gesto del usuario para la pantalla
completa: si se entra a jugar con el mando y el navegador la rechaza, el juego
sigue en ventana y se puede activar desde Pausa → Pantalla completa con un toque
o clic. Instalada como PWA, la app ya arranca a pantalla completa y en horizontal.

## PWA

- `public/manifest.webmanifest`: nombre, colores, `display: fullscreen`
  (con `standalone` de respaldo), `orientation: landscape`, iconos normales y
  *maskable* (`public/icons/`, regenerables con `npm run icons`).
- Service worker generado en cada build (`scripts/vite-plugin-sw.js` +
  `src/pwa/sw.js`), solo en producción y HTTPS/localhost:
  - HTML con red primero (las actualizaciones llegan siempre).
  - Assets con hash en caché; modelos/texturas se cachean al usarse.
  - Versión = hash de todos los archivos; las cachés antiguas se borran.
  - La versión nueva espera y se aplica en la pantalla de título; si ya estás
    jugando, se aplica la próxima vez que abras el juego.

## Marca del hosting

`src/config.js → HOSTING_CREDIT` (desactivado por defecto). Si se rellena, se
muestra solo en el pie del menú principal, nunca en partida. GitHub Pages y
Netlify no inyectan marcas de agua, así que no hace falta ocultar nada.

## Estructura

```
src/config.js        Título, versión y crédito del hosting
src/core/            App (máquina de estados), Renderer WebGL 2 + perfiles, Loop,
                     EventBus, Settings, SaveSystem, Platform (pantalla completa,
                     orientación, wake lock), AssetLoader, dispose()
src/controls/        InputManager (teclado/ratón/mando/táctil), GamepadProfiles, TouchControls
src/ui/              UIRouter (navegación), ButtonPrompts, Toast, StatsOverlay, DebugPanel
src/ui/screens/      Menús, Ajustes, Carga, HUD
src/ui/styles/       base.css, menus.css, hud.css
src/world/           Sky (cielo, eclipse, estrellas), MenuScene, TestScene
src/camera/          ThirdPersonCamera, DebugOrbit
src/player/          WispAvatar (provisional)
src/effects/         PulseRing
src/systems/         GameSession (una partida: mundo + jugador + cámara)
src/audio/           AudioManager (Web Audio sintetizado, sin archivos aún)
src/pwa/             sw.js (plantilla), registerSW.js
src/combat, enemies, bosses                         (vacíos)
public/models, textures, audio, environments, icons
```

Los archivos de `public/` se sirven tal cual: `public/models/heroe.glb` se carga
como `assets.loadGLTF('models/heroe.glb')`. Para personajes con esqueleto usa
`assets.instantiateCharacter(url)` (usa SkeletonUtils.clone).

## Herramientas externas

| Herramienta | Desde Android | Notas |
|---|---|---|
| **Poly Haven** | ✅ navegador | CC0. Descarga HDRI en `.hdr` 1k/2k para móvil y texturas 1k/2k. |
| **Sketchfab** | ✅ navegador | Revisa la licencia de cada modelo (CC0, CC-BY → hay que acreditar, evita NC si vas a vender). Descarga en glTF/GLB. |
| **Mixamo** | ⚠️ navegador en modo escritorio | Cuenta Adobe gratuita. Exporta FBX; conviértelo a GLB (Blender o FBX2glTF) o cárgalo con `FBXLoader`. Gratuito pero no es código abierto. |
| **Godot** | ✅ app Android oficial / editor web | Alternativa para la versión instalable; no reutiliza el código Three.js. |
| **Blender** | ❌ necesita ordenador | No existe versión Android. Alternativa: pedir a Claude Code que procese modelos con gltf-transform en la nube. |
