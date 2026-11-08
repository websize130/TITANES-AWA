# DogWorld: El Despertar del Castillo

Juego web 3D multijugador de plataformas colectatón (Three.js + WebSockets).
Este directorio es independiente del proyecto Unity de TITANES-AWA.

## Arrancar

```bash
cd DogWorld
npm install
npm start            # http://localhost:8080  (WebSocket en /ws)
```

Para jugar desde el móvil en la misma red: `http://<IP-del-PC>:8080`.
Para internet, desplegar el servidor Node detrás de HTTPS (el cliente usa `wss://` automáticamente).

Parámetros de URL: `?room=CODIGO` (sala), `?quality=low|medium|high`, `?server=wss://host/ws`, `?debug`,
`?unlockall` (modo local: todos los portales abiertos).

Variables del servidor: `PORT`, `DOGWORLD_UNLOCK_ALL=1` (todos los portales abiertos en todas las salas, para pruebas),
`DOGWORLD_DEBUG=1` (trazas de validación).

## Controles

| PC | Móvil | Mando |
|---|---|---|
| WASD / flechas: moverse | Joystick flotante (mitad izquierda) | Stick izq. |
| Ratón (clic para capturar): cámara | Arrastrar en la mitad derecha | Stick dcho. |
| Espacio: saltar / doble salto | Botón ↑ | A |
| E o clic derecho: habilidad | Botón de habilidad (icono de la raza) | X |
| Q: gesto de personalidad | Botón 🐾 | Y |
| R / Intro: hablar con Isabel, pulsar interruptores | Botón contextual 💬 / 👆 | B |
| Shift: correr · Esc: menú | ⏸: menú | RT |

## Razas jugables

Cada jugador de una sala debe elegir una raza distinta (máx. 7 por sala); el servidor lo garantiza.

| Perro | Raza | Habilidad | Gesto / pose 3D |
|---|---|---|---|
| Rufus | Bichón Maltés | 🎉 Ladrido Festivo: súper salto y +15 % velocidad al equipo cercano (6 s) | Ladra feliz y baila sobre las patas traseras |
| Rayder | Galgo | 💨 Esprint: +85 % velocidad (3 s) | Se estira y arranca a correr en el sitio |
| Tyson | Bulldog | 💥 Placaje: embestida que rompe rocas con tesoro (+2) y empuja a otros perros | Rasca el suelo y amaga una embestida |
| Blizzard | Husky | ❄️ Aliento de Hielo: plataforma de hielo temporal que usa todo el equipo | Aúlla y exhala escarcha |
| Digger | Corgi | ⛏️ Excavar: desentierra tesoros de los montículos con X (+3) | Escarba moviendo el culete |
| Scout | Border Collie | 👃 Súper Olfato: rastros hacia tesoros, compartido con aliados cercanos | Olfatea y señala con la pata |
| Goliath | San Bernardo | 💪 Levantar Objetos: carga pedruscos y los coloca como escalones | Se alza con un pedrusco sobre la cabeza |

Los datos de las razas están en `public/src/breeds/BreedData.js` (compartido con el servidor, que valida raza y cooldown).

## Portales, Isabel y los 6 mundos

Delante del portón del castillo está la **Plaza de los Portales**, custodiada por **Isabel, la bruja guía**
(acércate y pulsa R). Isabel explica qué portal toca, qué razas hacen falta y cuáles faltan en tu equipo.

**Transición multijugador:** ponte delante de un portal abierto. Empieza una cuenta atrás compartida de 6 s
(1,5 s si todo el equipo del Hub está listo) y el servidor teletransporta juntos a todos los que estén listos.
Quien llegue tarde entra directamente en la expedición en curso. Cada jugador solo ve a los perros de su zona.
Al recoger la reliquia final el mundo queda completado para toda la sala y se desbloquean los siguientes.

| Portal | Mundo | Desbloqueo | Retos cooperativos |
|---|---|---|---|
| Urban Park | Parque Urbano | — | ⛏️ Digger desentierra la llave · 🎉 Rufus anima al cachorro del puente · 🐾 dos placas a la vez (o pedrusco de Goliath) |
| Forest | Bosque Susurrante | Parque | 👃 Scout revela el camino en la niebla · 💥 Tyson derriba los troncos · ⛏️ Digger desentierra la seta mágica |
| Ice Cumbre | Cumbres de Hielo Eterno | Parque | ❄️ Blizzard congela el río · 💨 Rayder cruza la puerta temporizada · 💪 Goliath pone el bloque en la placa pesada |
| Factory | Fábrica de Juguetes | Bosque + Hielo | 💥 cajas atascadas · 💨 compuerta de la cinta · 💪 engranaje gigante · ❄️ pintura hirviendo |
| Desert | Ruinas del Desierto | Bosque + Hielo | ⛏️ escarabajo-llave · ❄️ oasis · 💥 muro de arenisca · 👃 camino bajo la tormenta |
| Final Fortress | Castillo de los Gatos Villanos | los 5 anteriores | los 7 perros: rastrillo, foso, gato guardián, placa, sombras, llave y puerta del trono |

Al completar la Fortaleza Final, el castillo del Hub "despierta" y abre su portón.
El estado de las misiones es autoritativo en el servidor (raza correcta, distancia, puertas temporizadas,
placas simultáneas, reliquia) y se reinicia cuando el mundo se queda vacío. Sin servidor, todo funciona en
modo local y el progreso se guarda en el navegador.

Los datos de mundos y misiones están en `public/src/worlds/WorldData.js` (compartido con el servidor).

## Personajes del castillo

Acércate y pulsa **R** (o 💬 en móvil / B en mando) para hablar con ellos.

| Personaje | Dónde | Qué hace |
|---|---|---|
| Isabel, la bruja guía | Plaza de los Portales | Explica los portales, qué razas faltan y qué está sellado |
| Cheila | Su puesto rosa junto a la explanada | **Tienda de Ropa**: accesorios para los perros |
| Chalai, la pastelera | Puesto de galletas | Regala una bandeja de 15 🍪 al día |
| Chukymary, el maestro | Dojo (tatami rojo) | Lecciones sobre controles y habilidades |
| Josh, el caballero | Junto al puente | Guardián de los Huesos Dorados: recompensas con 5, 10 y 15 |
| Pablosky, el monje pixelado | Con su perro de bloques | Explica el Modo TV y regala gafas pixeladas |
| MagaLuna, la maga | Círculo de cristales rojos | Bendición de súper salto (20 s, cada minuto) |

Los aspectos siguen las ilustraciones de referencia (modelos procedurales, sustituibles por GLB).
Los datos están en `public/src/npcs/NpcData.js`.

## Galletas, Tienda de Cheila y Huesos Dorados

- **Galletas 🍪** (moneda): galletas sueltas del Hub (+1, reaparecen), tesoros de rocas/montículos (+2/+3),
  reliquias de los mundos (+5), Huesos Dorados (+10) y el regalo diario de Chalai (+15).
- **Tienda de Cheila**: 19 accesorios en 4 ranuras (sombreros, gafas, cuello, espalda) con probador 3D,
  compra, equipar/quitar y recompensas especiales. Los accesorios se ven en multijugador.
  Navegable con ratón, táctil, teclado (flechas, Intro, Q/E, Esc) y con el móvil en Modo TV.
- **Huesos Dorados 🦴**: 15 coleccionables únicos (3 en el Hub y 2 por mundo) sobre pilares. Cada jugador
  conserva su álbum; el servidor valida la recogida y la anuncia a la sala.
- Monedero, accesorios y álbum se guardan en el navegador (`localStorage`). Al ser solo estética, el
  servidor valida que los accesorios existan, no que se hayan comprado.

## Modo TV / Mando remoto

1. En la tele u ordenador grande: menú → **📺 Modo TV** (o abrir `/?tv`). Aparece un código de 4 cifras.
2. En el móvil/tablet: menú → **🎮 Usar como mando** (o abrir `/?mando=CÓDIGO`) y escribir el código.
3. El móvil se convierte en un mando táctil (stick, cámara, A saltar, B habilidad, X hablar, Y gesto,
   correr, menú y atrás) con vibración. La tele muestra el juego a pantalla completa sin controles
   táctiles ni paneles. En menús, selección de perro, tienda y diálogos el stick funciona como cruceta.

El móvil no carga el mundo 3D (ahorra batería). Requiere el servidor (el emparejamiento va por WebSocket).

## Gráficos

- **Pelaje real (shell fur)**: los perros y el pelo/barbas de los personajes se dibujan con capas de
  pelo en GPU (una draw call por parte gracias a instancing): mechones con raíz oscura y puntas claras,
  gravedad, rizo y movimiento. Capas según calidad: bajo 6, medio 10, alto 16.
- **Modelos orgánicos**: perros con elipsoides fundidos, manchas de cada raza pintadas por vértice,
  ojos brillantes con doble reflejo; personajes articulados (hombro, codo, mano, rodilla) con cara
  expresiva, faldas con pliegues, capas, armaduras y sombreros detallados.
- **Escena viva**: macizos de flores con pétalos, mariposas, hiedra en el castillo, césped con
  variación de color, luz dorada de tarde, iluminación ambiental PBR y posprocesado (bloom suave,
  gradación de color y viñeta; desactivado en calidad baja).
- **Galería de personajes**: `/galeria.html?dog=rufus` o `?npc=isabel` (añade `&q=low|medium|high`,
  `&anim=run|gesture`, `&yaw=0.5`) para ver cada modelo aislado.

## Estructura

```
server/server.js            HTTP estático + WebSocket: salas, instantáneas a 15 Hz, huesos autoritativos
public/index.html           Canvas, HUD limpio, controles táctiles y menú (única pantalla con marca)
public/src/core/            Game (bucle, estados), Fullscreen, Quality (perfiles + resolución dinámica)
public/src/input/           InputManager + teclado/ratón, táctil (joystick flotante) y mando
public/src/breeds/          BreedData (7 razas), DogModel (modelo paramétrico), DogPoses (gestos), AbilitySystem
public/src/player/          PlayerController (física de plataformas), DogAvatar, ThirdPersonCamera
public/src/ui/BreedSelect.js  Tarjetas interactivas + vista 3D animada de la raza
public/src/worlds/          WorldData (mundos y misiones), PortalHall (plaza + portales), Isabel, ThemedWorld,
                            WorldThemes (estética), PortalFX (shaders de portal), IsabelLines (diálogos)
server/zones.js             Zonas por sala: portales con cuenta atrás, estado de misiones y desbloqueos
server/tv.js                Emparejamiento TV ↔ móvil y reenvío de entradas/vibración
public/src/npcs/            NpcData (personajes), NpcModel (humanoide procedural), Npcs, NpcInteractions
public/src/cosmetics/       Catálogo de accesorios y sus modelos 3D
public/src/ui/Shop.js       Tienda de Ropa de Cheila · ui/RemotePad.js mando del móvil · core/TvMode.js
public/src/net/             protocol.js (compartido con el servidor), NetworkClient, RemotePlayers
public/src/world/           Hub: terreno de islas flotantes, castillo, props, césped, cielo, coleccionables
```

## Red

- El cliente envía su estado a 15 Hz solo si cambia; el servidor difunde instantáneas de los jugadores modificados.
- Los jugadores remotos se interpolan con 120 ms de retardo (búfer circular sin asignaciones).
- Los huesos dorados son autoritativos en el servidor (el primero que llega lo consigue; reaparecen a los 30 s).
- Razas únicas por sala; las habilidades se validan en el servidor (raza + cooldown + distancia) y se reenvían a la sala.
  Rocas, montículos y pedruscos tienen estado autoritativo; los gestos y animaciones viajan en el estado del jugador.
- Validación en servidor: nombre/sala saneados, límites de mundo, anti-teletransporte básico, límite de mensajes y de jugadores por sala.
- Sin servidor disponible, el juego entra en modo local automáticamente.

## Arte

Todo el arte actual es procedural (geometría + texturas en canvas) para que el prototipo funcione sin assets.
Para producción, sustituir por modelos GLB/texturas PBR manteniendo las mismas funciones `build*`.
