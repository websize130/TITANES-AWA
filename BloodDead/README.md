# BLOOD DEAD

Survival horror de zombis en tercera persona para web y móvil (Three.js r160, PBR procedural).
Objetivo: publicarlo como app en Google Play.

## Uso

```bash
npm install
npm run dev       # servidor de desarrollo con recarga en caliente
npm run build     # dist/ (web) + dist/blood-dead.html (un solo archivo) + comprobación sin CDN
npm run preview   # sirve dist/ para probar el build
```

Salidas de `npm run build`:

| Salida | Para qué |
|---|---|
| `dist/` | Versión web normal con base relativa (`./`): hosting, PWA, TWA o Capacitor. Three.js, PeerJS, el generador de QR y el decodificador Draco se cargan en trozos aparte. |
| `dist/blood-dead.html` | El juego entero en un único `.html` (unos 1,3 MB). Funciona abierto directamente desde disco, sin servidor ni Internet. Es lo que descarga el botón ⤓ del menú. |

`scripts/check-offline.mjs` hace fallar el build si alguna salida pide algo a jsDelivr, unpkg, cdnjs, esm.sh,
Skypack o Google Fonts. La única conexión externa del juego es el servidor público de PeerJS, y solo al
emparejar un móvil como mando (para eso, la TV y el móvil deben estar en la misma Wi-Fi).

## Modo Supervivencia

- **Dos mapas exclusivos** (se eligen al pulsar *Modo Supervivencia*):
  - **El pueblo · noche**: el pueblo original, ampliado de 49×57 m a 77×85 m. Añade un barrio de cabañas, una granja con granero y silo, el cementerio con cripta y una entrada con coches abandonados.
  - **La isla · día**: unos 90×95 m de tierra con playa, palmeras, faro, cabañas de paja, campamento, embarcadero transitable y océano con oleaje. Tiene gaviotas, cangrejos y peces que saltan.
- **15 niveles** con escalada lineal, definidos en `src/data/survival.js` (una fila por nivel): duración, infectados a la vez, cadencia, velocidad, daño, vida, corredores, hinchados, fuertes, murciélagos, emboscadas y furia. Al superar el 15 aparece la pantalla de victoria. El récord se guarda por mapa.
- **Murciélagos zombi gigantes** (`src/zombies/batSystem.js`), desde el nivel 4: siempre vuelan, rodean a su presa, atacan en picado y remontan. Se disparan (la cabeza recibe ×2), se acuchillan en el picado y el apuntado asistido los fija.
- **Emboscadas bajo los tablones** (`src/game/ambushSystem.js`), desde el nivel 2: hay tarimas sueltas en cabañas, porches, granero y embarcadero. Un infectado real te agarra los pies. Para librarte, mantén *Usar* con el aviso contextual o el botón de mano táctil, o mátalo.
- **Zombi araña** (la Reina): conserva su forma y su comportamiento, con quitina lacada y relieve fino.

## Texturas fotoescaneadas (Poly Haven, CC0)

```bash
npm run assets:textures   # descarga y convierte a WebP lo que lista assets-src/textures.json
```

- Calidad **Alto** usa 2K, **Medio** 1K y **Bajo** las texturas procedurales, que no descargan nada.
- Si faltan los archivos (por ejemplo, en `blood-dead.html`), el juego usa las procedurales.
- La escala de cada textura es la real del escaneo, en metros.
- Autores y enlaces: `public/assets/textures/manifest.json`.
- Las imágenes (~37 MB) no se suben a git, se regeneran con el comando de arriba. En el repositorio propio irán con Git LFS.
- Detrás de un proxy corporativo: `NODE_USE_ENV_PROXY=1 npm run assets:textures`.

## Estructura

Cada módulo se corresponde con una sección del archivo original (v2.0). Los imports y exports se calcularon
con un análisis de ámbitos para no cambiar el comportamiento.

```
index.html                 Marcado de la interfaz (menús, HUD, controles táctiles, modales)
src/main.js                Arranque: juego o página de mando (?mando=CÓDIGO)
src/styles/                main.css (interfaz) · fonts.css (Inter y Space Grotesk locales)
src/core/                  utils (matemáticas, $, aleatorio) · settings · events (bus de eventos)
src/data/                  config + QUALITY · characters · weapons · levels (+ CHAPTERS, SURVIVAL)
src/render/                engine (renderizador) · textures (PBR procedural) · materials · lighting (CSM) · effects
src/characters/            sdf (escultura SDF → malla) · characterFactory · modelLoader (GLTF/Draco)
src/scene/                 menuStage (personaje del menú)
src/world/                 world (colisiones y raycast) · levelBuilders (un constructor por nivel)
src/player/                player · cameraRig · flashlight
src/input/                 input (teclado, ratón, táctil) · pads (Gamepad API y mandos virtuales)
src/net/                   remoteLink (sala de la TV) · mandoApp (página del móvil) · vendor (carga de PeerJS y QR)
src/audio/                 audioSystem (Web Audio procedural)
src/zombies/               zombieTypes · zombieFactory · zombie (IA y animación) · zombieSystem · bossFx
src/fx/                    goreSystem
src/weapons/               weaponSystem · rayHit
src/game/                  game (estados y orquestación) · modes (Historia y Supervivencia) · interactSystem
src/ui/                    ui (menús y modales) · hud · cinematic · icons
public/draco/              Decodificador Draco local (para modelos .glb comprimidos)
legacy/                    El HTML original v2.0, como referencia para comparar
```

## Dependencias incluidas y licencias

| Paquete | Versión | Licencia |
|---|---|---|
| three (+ addons y decodificador Draco) | 0.160.0 | MIT (Draco: Apache-2.0) |
| peerjs | 1.5.4 | MIT |
| qrcode-generator | 1.4.4 | MIT |
| @fontsource/inter, @fontsource/space-grotesk | 5.x | SIL OFL 1.1 |

Las versiones están fijadas (`--save-exact`) para que el juego no cambie al reinstalar.

## Hoja de ruta

- [x] **Fase 0:** sin CDN (funciona sin conexión), código separado en módulos, build web y de un solo archivo.
- [x] Supervivencia: 2 mapas, 15 niveles, murciélagos zombi y emboscadas.
- [ ] Fase 1: audio híbrido con muestras CC0 y sin el efecto "tubo" en disparos y explosiones.
- [ ] Fase 2: esqueleto con pies, andar natural de los zombis, simetría y proporciones.
- [ ] Fase 3: salto y saltar obstáculos, HUD fijo (incluido el botón de granada), distribución de mandos.
- [ ] Fase 4: Sala TV con código y QR, escáner QR y código manual en el móvil, arreglos del mando.
- [ ] Fase 5: tres ranuras de arma (secundaria, principal, especial), catálogo completo, láser y granadas.
- [ ] Fase 6: postprocesado, nitidez y presupuesto de rendimiento.
