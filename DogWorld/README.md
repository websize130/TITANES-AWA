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
