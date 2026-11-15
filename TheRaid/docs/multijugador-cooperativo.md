# The Raid: Asedio Vertical — Auditoría y arquitectura del multijugador cooperativo

Documento de diseño. **No modifica código.** Referencias de línea sobre `TheRaid/index (16).html` en el commit `3220c33`.

---

## 1. Diagnóstico de la arquitectura actual

### 1.1 Cómo funciona PeerJS hoy
- `NetHost` (`index (16).html:505`) solo existe en la **pantalla principal**. Al arrancar (`App.constructor`, línea 2088–2093) crea un `Peer` con id `theraid-av-` + código de 4 letras (`makeCode`) y espera conexiones.
- La señalización usa el **servidor público de PeerJS** (`0.peerjs.com`, valor por defecto de la librería). No hay servidor TURN configurado: solo el STUN por defecto.
- `NetHost.accept(c)` (línea 521): al abrirse una conexión reclama un puesto con `InputManager.claim('net:' + peerId)`, responde `{t:'slot'}` o `{t:'full'}`, guarda una función `send` para la vibración y libera el puesto al cerrarse.
- `LanSocket` (línea 533) es un transporte alternativo por WebSocket a un relé local `ws://IP:8787` (solo funciona con http; el relé no está incluido en el HTML).
- **PeerJS se usa solo como tubería de entrada**: no transporta ningún estado del mundo.

### 1.2 Cómo se conectan los móviles
- El móvil abre `?pad=CÓDIGO` → `startPad()` (línea 577). La página entra en `pad-mode`, que **oculta el canvas 3D** (`body.pad-mode #stage{display:none}`, línea 106): el móvil no ejecuta el juego, solo muestra el mando táctil (`bindPad`).
- Se conecta con `peer.connect(..., { reliable: false, serialization: 'json' })` (línea 603) y cada 33 ms (`setInterval`, línea 615) envía `{t:'in', s:[mx, my, lx, ly, bits]}`.
- La pantalla solo le devuelve `slot`, `full` y `rumble`.

### 1.3 Cómo se reciben y procesan los controles
- `InputManager` (línea 430) tiene 4 puestos (`slots`), cada uno con `source` (`kb`, `gp0..3`, `touch`, `net:<peer>`), un estado normalizado (`blankState`) y **su propia `PlayerStateMachine`**.
- `feedRemote()` decodifica el paquete del móvil (8 bits de botones). `poll()` lee teclado y mandos, y llama a `fsm.update()` de **cada** puesto (línea 494) con el contexto de combate (`slot.ctx`) que calcula `Game.updPlayer`.
- La cámara de cada jugador se gira en el anfitrión acumulando deltas `lx/ly` (`slot.look`).

### 1.4 Cómo se crean los jugadores
- `Game.syncPlayers()` (línea 1796) crea o elimina jugadores según los puestos de `InputManager`. `Game.addPlayer(i)` (línea 1801) crea la figura con el estilo de `OPERATORS[i]`: el operador lo decide el **índice del puesto**.
- Todos los jugadores viven en `Game.players` y se simulan con `Game.updPlayer()` (línea 1858) **en el mismo dispositivo**.

### 1.5 Simulación de enemigos y combate
- Todo ocurre en `Game.step()` (línea 2005): jugadores → enemigos (`updEnemy`, línea 1962) → separación de cuerpos → linternas → oleadas → cambio de planta → efectos (`stepFx`) → luz con sombras (`updKey`).
- **No es determinista**: `Math.random()` decide tipos de enemigo (`pickType`), posiciones (`spawnEnemy`), dispersión de disparos (`fire`, `enemyShot`), bloqueos enemigos, soltar munición (`hitEnemy`) y la IA (`navigate`, `alert`).
- **El edificio sí es determinista**: `TowerLevel` usa `mulberry(floor * 9973 + 31)` (línea 1196), así que cada dispositivo puede reconstruir la misma planta solo con su número. La lista `level.cols` sale siempre en el mismo orden → su índice sirve de **identificador estable** de puertas, tabiques, coberturas y barriles.
- Disparos *hitscan* 2,5D (`TowerLevel.shoot`), daño a enemigos (`hitEnemy`) y a jugadores (`hurt`), melé resuelta en `updPlayer` cuando `fsm.t === 0`.

### 1.6 Cámaras y renderizado
- `Game.render()` (línea 2056) divide la pantalla con `layout(n)` y dibuja **una vista por jugador** (`viewPl = players.slice(0, 4)`), llamando a `setCam(pl)` para cada uno.
- `setCam` además rellena `pl.cam`, que **usa `fire()` para apuntar** (línea 1926). Sin cámara, el disparo cae al rumbo del cuerpo.
- `hud()` pinta una capa HTML por vista.

### 1.7 Sistemas que dependen exclusivamente del dispositivo principal
| Sistema | Dónde | Por qué es un problema en cooperativo |
|---|---|---|
| Simulación completa (`step`, `updPlayer`, `updEnemy`, oleadas, plantas) | `Game` | Solo existe una copia del mundo. |
| Máquinas de estado de todos los jugadores | `InputManager.poll` | El móvil no sabe en qué estado está su operador. |
| Rumbo/cámara de todos los jugadores (`slot.look`) | `updPlayer` | La cámara remota sufriría la latencia de ida y vuelta. |
| Render en pantalla dividida y `pl.cam` | `render`, `setCam` | Cada móvil necesita una sola vista propia. |
| Pausa global (`box('pause')` al ocultar la pestaña) | `bindMouse`, línea 1440 | En cooperativo pausaría a todos. |
| Bucle detenido con la pestaña oculta | `App.frame`, línea 2102 | Si el anfitrión es un móvil y se va a segundo plano, el mundo se congela. |
| Guardado de progreso (`Store.set('save')`) | `load` | Solo se guarda en un dispositivo. |
| Sonido, vibración, partículas, trazadoras, reflejos (`captureEnv`), luz con sombras (`updKey`) | `Game` | Hoy se generan solo donde se simula. |

### 1.8 Información que hoy NO se sincroniza
Prácticamente toda. El único flujo es **controles del móvil → pantalla** y, de vuelta, `slot`/`full`/`rumble`. No viaja nada de jugadores, enemigos, disparos, daño, puertas, coberturas, oleadas, plantas, mensajes ni victoria/derrota.

### 1.9 Qué se reutiliza y qué se modifica
**Reutilizable tal cual o casi:**
- Conexión PeerJS (códigos de sala, reintentos, `unavailable-id`) → base de la capa de señalización.
- Protocolo de botones de 8 bits (`feedRemote`) → mensaje de controles.
- `PlayerStateMachine`, `bindPad`, controles táctiles, animación (`animFig`/`animGlb`), figuras (`makeFigure`), armas, cámara (`setCam`), HUD, `TowerLevel` (determinista) y posproceso.
- La pantalla dividida y el modo «móvil como mando» se conservan como modo local (TV).

**Debe modificarse:** ver la lista exacta en la sección 3. En resumen: `Game` necesita un **rol** (anfitrión/cliente), los jugadores necesitan un **propietario** (local/remoto) y `step`/`updEnemy`/`hitEnemy`/`hurt`/`TowerLevel.destroy` deben **emitir eventos** en el anfitrión y **aplicarlos** en el cliente.

---

## 2. Arquitectura propuesta

### 2.1 Decisión principal
**Anfitrión con autoridad sobre el mundo + propietario con autoridad sobre su propio operador** (topología en estrella).

- Uno de los móviles es el **anfitrión**: ejecuta la simulación de enemigos, daño, puertas, oleadas y plantas, y la replica a los demás.
- **Cada dispositivo mueve a su propio operador** (movimiento, colisión con el edificio, máquina de estados, cámara, munición) y envía su estado al anfitrión.
  - Así no hay retardo en el control propio, que es lo que más se nota en un móvil.
  - En un juego cooperativo no hay incentivo para hacer trampas. El anfitrión aplica una validación barata (velocidad máxima, colisión).
- Los efectos sobre el mundo los **decide siempre el anfitrión**: si una bala impacta, el daño, si un enemigo cae, si se abre la verja…
- **No es *lockstep* determinista**: el juego usa `Math.random()` en toda la IA y no se puede garantizar que dos móviles calculen lo mismo.

### 2.2 Diagrama

```
        ┌──────────────────────────────── SEÑALIZACIÓN (solo al conectar) ───────────────────────────────┐
        │  PeerServer (nube PeerJS para prototipo · PeerServer propio en producción)  +  STUN  +  TURN   │
        └───────────────▲─────────────────────────▲─────────────────────────▲────────────────────────────┘
                        │ ofertas/ICE             │                         │
 ┌──────────────────────┴───────────────┐  WebRTC DataChannel (P2P o vía TURN)  ┌───────────────────────┴──────────────┐
 │ MÓVIL A · ANFITRIÓN                  │◄═════════════════════════════════════►│ MÓVIL B · CLIENTE (×3 como máximo)   │
 │                                      │  canal «fiable» (ordenado): eventos   │                                      │
 │  NetSession (rol host)               │  canal «rápido» (sin reenvío):        │  NetSession (rol client)             │
 │   ├ Transport (2 canales por par)    │    snapshots 20 Hz ▶                  │   ├ Transport                        │
 │   ├ Codec binario                    │    ◀ estado del operador 30 Hz        │   ├ Codec binario                    │
 │   └ Clock (ping, desfase)            │                                       │   └ Clock                            │
 │                                      │                                       │                                      │
 │  Game (role='host')                  │                                       │  Game (role='client')                │
 │   ├ jugador local: simulado aquí     │                                       │   ├ jugador local: simulado aquí     │
 │   ├ jugadores remotos: ◀ su estado   │                                       │   ├ jugadores remotos: interpolados  │
 │   ├ ENEMIGOS / IA / DAÑO  (autoridad)│                                       │   ├ enemigos: interpolados (réplica) │
 │   ├ puertas, oleadas, plantas        │── Replicator: snapshot + eventos ───► │   ├ puertas/plantas: aplica eventos  │
 │   └ render propio (1 vista, cámara A)│                                       │   └ render propio (1 vista, cám. B)  │
 └──────────────────────────────────────┘                                       └──────────────────────────────────────┘
```

### 2.3 Capas separadas
| Capa | Responsabilidad | Implementación |
|---|---|---|
| **Señalización** | Encontrar al anfitrión por código de sala e intercambiar ICE. | PeerJS (`Peer`), igual que hoy. |
| **Transporte** | Mover bytes entre pares. | 2 `DataConnection` por par: `reliable:true` (eventos) y `reliable:false` (snapshots y estado de operador), `serialization:'binary'`. |
| **Estado autoritativo** | Única verdad del mundo. | `Game` en el anfitrión (enemigos, salud, puertas, oleadas, planta). |
| **Envío de controles** | Del propietario al anfitrión. | Estado del operador (posición, rumbo, estado FSM…) + **acciones** con número de secuencia (disparo, golpe, recarga, reanimar, romper puerta). |
| **Replicación** | Del anfitrión a los clientes. | *Snapshots* periódicos + eventos fiables. |
| **Render local** | Lo que ve cada móvil. | `Game.render` con una sola vista para el jugador local; el resto, interpolado. |

PeerJS/WebRTC **solo** cubre las dos primeras filas. La sincronización (qué se envía, cuándo, cómo se interpola y cómo se evitan duplicados) es código propio que hay que escribir.

### 2.4 Qué se sincroniza y cómo

| Elemento | Autoridad | Mecanismo |
|---|---|---|
| Posición, rotación y velocidad del operador | Propietario | Estado del operador a 30 Hz (canal rápido) → el anfitrión lo reenvía en el snapshot. Los demás lo interpolan. |
| Animación y estado de combate | Propietario | Se envían los mismos campos que alimentan `f.cue`: estado FSM, `t`, combo, modo, ADS/disparo, progreso de recarga y de cambio de arma, arma activa, salto. Cada dispositivo anima localmente con `animFig`: no se envían huesos. |
| Salud, abatimiento, reanimación | Anfitrión | Evento `hurt` → propietario; `downed`/`revived` → todos. El progreso de reanimación va en el snapshot. |
| Armas, munición, recarga | Propietario | Munición local (cooperativo). La recarga y el cambio de arma se replican como estado de animación. |
| Disparos | Propietario dispara; anfitrión resuelve | Acción `fire{seq, origen, dirección, arma}`. El propietario dibuja ya su trazadora y retroceso; el anfitrión lanza `TowerLevel.shoot` y emite `hit`/`tracer` a los demás. Más adelante: compensación de latencia (rebobinar enemigos ~100 ms). |
| Melé | Propietario inicia; anfitrión resuelve | Acción `melee{seq, estado, combo, objetivo}` al entrar en STRIKE/GRAPPLE/TAKEDOWN/DISARM/FINISHER. El anfitrión aplica `hitEnemy`/`knockdown`/`disarm`. Para la parada, el anfitrión usa la marca de tiempo del bloqueo enviada por el cliente. |
| Enemigos (posición, IA, daño) | Anfitrión | Evento `spawn{id, tipo, x, z}`; en el snapshot: `id, x, z, yaw, flags(vivo, agachado, apunta, aturdido, derribado, guardia, armado), progreso de ataque, % vida`. Eventos `die`, `disarm`, `knock`. |
| Puertas, tabiques, coberturas, barriles | Anfitrión | Evento `destroy{colIndex}` (índice estable de `level.cols`) y `explode{x,z}`. |
| Munición en el suelo | Anfitrión | `drop{id,x,z}` / `pick{id, jugador}`. |
| Oleadas, ascensor, verja, plantas | Anfitrión | `wave{n}`, `gate`, `floor{n, semilla}`, `win`, `fail`. Cada cliente reconstruye la planta con `TowerLevel(floor)`. |
| Mensajes y efectos | Anfitrión o propietario | `say`, partículas, sonido y vibración se generan **localmente** a partir de los eventos. |

**Presupuesto de red estimado** (codec binario):
- **Snapshot:** ≈ 20 B por operador y ≈ 13 B por enemigo → con 4 jugadores y 20 enemigos ≈ 350 B. A 20 Hz son **~7 KB/s por cliente** (~56 kbit/s).
- **Anfitrión:** sube ~21 KB/s a 3 clientes y recibe ~2 KB/s por cliente.
- **Total:** una partida de 30 min son ~13 MB por cliente.
- **Con JSON:** se multiplicaría por ~4–6 veces. Por eso se usa un codec binario.

### 2.5 Latencia, interpolación, reconexión y duplicados
- **Reloj:** `ping/pong` cada 2 s → RTT y desfase de reloj respecto al anfitrión. Cada snapshot lleva el tiempo del anfitrión.
- **Interpolación:** cada cliente dibuja a los demás **~100 ms en el pasado** (2 snapshots a 20 Hz; se ajusta con el *jitter*). Se interpola entre los dos snapshots que rodean ese instante, con extrapolación máxima de 200 ms si se pierden paquetes.
- **Jugador propio:** sin interpolación ni retardo (es la autoridad).
- **Corrección suave:** si el anfitrión corrige una posición (p. ej. empujón por separación de cuerpos), el cliente la absorbe en ~150 ms, sin teletransporte.
- **Duplicados:**
  - Cada mensaje fiable lleva `seq`. El receptor descarta `seq ≤ último aplicado`.
  - Los eventos son **idempotentes**: `destroy` comprueba `alive`; `spawn`/`die` usan un mapa por `id`.
  - Las acciones del cliente llevan `seq`. El anfitrión ignora las repetidas y responde con `ack` del último aplicado.
- **Reconexión:**
  - Cada jugador guarda un `token` en `sessionStorage`. El anfitrión **reserva su puesto 30 s**, con el operador quieto e invulnerable.
  - Al volver, el cliente recibe un **estado completo**: planta, `cols` vivos como máscara de bits, enemigos, munición en el suelo, oleadas pendientes y estado de los jugadores. A partir de ahí reanuda los deltas.
  - Si se va el anfitrión: fase 1, fin de partida con opción de «continuar planta» con un nuevo anfitrión (se guarda la planta); fase posterior, migración de anfitrión.

### 2.6 ¿Un único HTML?
**Sí, es viable** mientras el anfitrión sea uno de los móviles: el mismo archivo hace de anfitrión o de cliente según el botón elegido en el menú.

Solo convendría **separar archivos** si se pasa a un **servidor dedicado** (sección 4.3). En ese caso la simulación (`Game`/`TowerLevel` sin Three.js) tendría que ser un módulo compartido entre navegador y Node, y eso hoy no es posible porque la lógica crea mallas y partículas mezcladas con las reglas.

---

## 3. Clases y funciones que habría que modificar

| Elemento (línea) | Cambio |
|---|---|
| `CONFIG` (≈309) | `net: { peer: {host, port, path}, iceServers: [...], snapshotHz: 20, ownerHz: 30, interpDelay: 0.1 }`. |
| `NetHost` (505) → **`NetSession`** | Roles `host`/`client`. Dos `DataConnection` por par. Tabla de pares con `token` y puesto. `send`/`broadcast`. Reconexión. El modo «móvil como mando» se conserva con el mensaje `in`. |
| *(nuevo)* `NetCodec` | Codificación binaria (`DataView`) de snapshot, estado de operador, acciones y eventos. |
| *(nuevo)* `Replicator` | En el anfitrión: construye snapshots y cola de eventos. En el cliente: buffer de snapshots, interpolación y aplicación de eventos. |
| `LanSocket` (533) | Sin cambios (modo local). |
| `startPad` (577) | Sin cambios funcionales (sigue disponible como mando). |
| `InputManager.claim/release/feedRemote/poll` (430–500) | Nuevo tipo de puesto `remote:<token>`: no tiene controles ni FSM propia; recibe estado. `poll()` no ejecuta la FSM de puestos remotos. |
| `PlayerStateMachine` (358) | Sin cambios de lógica. Exponer/aplicar un código numérico de estado para la red. |
| `App.constructor/frame/play/wireLobby/paintRoom` (2086–2140) | Menú «Crear sala cooperativa» / «Unirse». `play()` arranca `Game` con rol. En el cliente el bucle **nunca pausa** el mundo. |
| `MenuUI` (1123) | Pantalla de sala: código, jugadores conectados, «Empezar» (solo anfitrión). |
| `Game.start/exit/load` (1443–1485) | `start(floor, role)`. `load` en el cliente se invoca por evento `floor`. `exit` cierra la sesión. |
| `Game.syncPlayers/addPlayer` (1796–1807) | Jugadores con `owner: 'local' | 'remote'` y operador asignado por la sala (no por índice local). **Mismo array `players`** (no un segundo sistema). |
| `Game.updPlayer` (1858) | Si `remote`: aplicar estado interpolado y rellenar `f.cue`. Si `local`: igual que hoy, más el envío de acciones (`fire`, `melee`, `revive`, `breach`). En el cliente, los efectos sobre enemigos **no se aplican localmente**: se esperan del anfitrión. |
| `Game.fire` (1924) | Separar «disparar» (local: munición, trazadora, retroceso) de «resolver impacto» (solo anfitrión). |
| `Game.updEnemy/spawnEnemy/navigate/enemyShot/pickCover/alert/noise` (1789–2004) | Solo en el anfitrión. En el cliente, `updEnemy` = aplicar estado replicado + `animFig`. |
| `Game.hitEnemy/knockdown/disarm/hurt/drop` (1828–1857) | Anfitrión: aplicar y emitir evento. Cliente: solo efectos visuales a partir del evento. |
| `Game.step` (2005) | Ramas por rol: oleadas, cambio de planta, victoria/derrota y separación de enemigos solo en el anfitrión; envío de snapshot a 20 Hz. |
| `Game.box/nav/bindMouse` (1421–1442) | Pausa local sin congelar el mundo. Victoria/derrota por evento. |
| `Game.render/setCam/hud/layout` (2039–2084) | Modo cooperativo: **una vista a pantalla completa** para el jugador local. La pantalla dividida sigue como modo local. |
| `Game.stepFx/tracer/emit` (1810–1827) | Sin cambios; los alimentan los eventos remotos. |
| `TowerLevel.damage/destroy/explode/openGate` (1336–1348) | Anfitrión: emitir `destroy{colIndex}`, `explode`, `gate`. Cliente: método `applyDestroy(i)` sin efectos secundarios de reglas. |
| `TowerLevel` (constructor/build) | Sin cambios: ya es determinista. Añadir `checksum()` para verificar que las plantas coinciden. |
| `Store` (337) | Guardar `{floor, roomCode, token}` para continuar la planta si se cae el anfitrión. |

---

## 4. Infraestructura, costes y limitaciones

### 4.1 Mínimo para el prototipo (coste 0)
- **Alojamiento HTTPS** del HTML (GitHub Pages o Netlify, gratis). WebRTC y la mayoría de APIs móviles exigen HTTPS.
- **Señalización:** el servidor público de PeerJS (`0.peerjs.com`, el que se usa hoy). Es un servicio compartido, sin garantías publicadas ni límites documentados. Solo intercambia la negociación: los datos de juego no pasan por él.
- **STUN:** público (por defecto).

### 4.2 Recomendado para producción
- **PeerServer propio** (`peerjs/peerjs-server`, imagen Docker oficial) en un VPS pequeño o un servicio con capa gratuita. Así se evita depender del servidor público.
- **TURN:** imprescindible para las redes móviles con CGNAT, donde la conexión directa P2P suele fallar.
  - **Cloudflare TURN:** 0,05 $/GB, con 1.000 GB gratuitos al mes compartidos con su SFU. Con ~13 MB por jugador y partida, el coste práctico es cero.
  - **Metered Open Relay:** 20 GB/mes gratis. Las cifras de Metered varían entre sus páginas, así que hay que confirmarlas antes de usarlo.
- **Credenciales TURN temporales:** las credenciales no deben ir fijas en el HTML. Hace falta un endpoint mínimo que las emita (p. ej. un Worker sin servidor).

### 4.3 Alternativa futura: servidor dedicado
Un servidor Node con la simulación evitaría los problemas del anfitrión móvil (segundo plano, batería, salida del anfitrión).

Exige **separar la lógica de reglas de Three.js** (hoy `TowerLevel` y `Game` crean mallas y partículas dentro de las reglas) y pagar un servidor siempre encendido. Recomendado solo si la versión P2P demuestra que el anfitrión móvil es un problema real.

### 4.4 Limitaciones relevantes
- **Segundo plano:** un móvil anfitrión que pasa a segundo plano (llamada, notificación, bloqueo) **detiene `requestAnimationFrame`**. El mundo se congela para todos. El navegador no permite evitarlo.
- **Rendimiento del anfitrión:** simula la lógica (medido: ~0,06 ms por paso con 13 enemigos) y además renderiza. La lógica no es el cuello de botella; la temperatura y la batería sí pueden serlo.
- **iOS:** con «Ahorro de energía» limita el render a 30 fps.
- **Privacidad:** WebRTC P2P expone la IP de cada jugador a los demás de la sala. Con TURN forzado se oculta, a costa de más tráfico relayado.

---

## 5. Plan de implementación por etapas

Cada etapa termina con pruebas automáticas (dos pestañas de Chromium contra un PeerServer local, con latencia y pérdida simuladas) **y** una prueba con móviles reales. No se pasa a la siguiente sin superar ambas.

| # | Etapa | Entregable | Criterio de aceptación |
|---|---|---|---|
| 0 | Base de pruebas | PeerServer local en el entorno de pruebas, dos pestañas automatizadas e inyector de latencia/pérdida en `NetCodec`. | Las pruebas actuales siguen pasando. |
| 1 | **Dos dispositivos en la misma partida** | `NetSession` host/client, sala con código, botón «Empezar». Ambos cargan la planta 1. | Ambos muestran el mismo `checksum` de planta y el RTT; 10 reconexiones seguidas sin errores. |
| 2 | **Mundo completo con cámara propia** | Modo cooperativo de una vista. **Sin enemigos** en esta etapa (se dice explícitamente en pantalla). | Cada móvil a pantalla completa con su cámara; el otro operador visible como figura estática. |
| 3 | **Sincronización de los dos operadores** | Estado de operador a 30 Hz, interpolación, animación remota (caminar, sprint, agacharse, saltar, apuntar, recargar, cambiar de arma, melé en el aire). | Movimiento remoto fluido con 150 ms de latencia y 5 % de pérdida simulados; desviación final < 5 cm al parar. |
| 4 | **Enemigos y combate** | Spawns, snapshot de enemigos, disparos resueltos por el anfitrión, daño, abatimiento/reanimación, melé, munición en el suelo. | Ambos ven morir al mismo enemigo con su mismo `id`; ningún evento aplicado dos veces (contadores); daño coherente en ambos HUD. |
| 5 | **Objetivos y progreso compartido** | Puertas, tabiques, barriles, oleadas, verja, cambio de planta, victoria y derrota. | Planta 1 → 2 completada en dos móviles con el mismo estado de `cols` (máscara idéntica). |
| 6 | **Tercer y cuarto jugador** | Sala de 4 y asignación de operadores. | 4 pestañas automáticas + 2–4 móviles reales; ancho de banda del anfitrión medido (< 40 KB/s). |
| 7 | **Desconexión, reconexión y latencia** | Puesto reservado 30 s, estado completo al reconectar, «continuar planta» si cae el anfitrión, compensación de latencia en disparos. | Cortar la red de un cliente 10 s y recuperar sin duplicados; probar con 300 ms y 10 % de pérdida. |

---

## 6. Riesgos técnicos y mitigación

| Riesgo | Mitigación |
|---|---|
| El anfitrión móvil pasa a segundo plano y congela el mundo | Aviso claro «Anfitrión en pausa» en los clientes; recomendar que el anfitrión sea el móvil con más batería y sin bloqueo automático; *Wake Lock* de pantalla; a medio plazo, migración de anfitrión o servidor dedicado. |
| La conexión P2P falla en 4G/5G (CGNAT) | TURN desde la etapa 1 de pruebas reales, con credenciales temporales; mostrar si la conexión es directa o relayada. |
| Servidor PeerJS público caído o lento | PeerServer propio antes de publicar; reintentos con espera. |
| Desincronización por `Math.random()` | No usar *lockstep*: el anfitrión decide y replica. Solo se confía en el determinismo del edificio, verificado con `checksum`. |
| Eventos duplicados o perdidos | Canal fiable para eventos, `seq` en todo, aplicación idempotente y estado completo tras reconectar. |
| Mensajes demasiado grandes (JSON) | Codec binario, cuantización (cm, 1/100 rad) y envío de solo lo visible; medir bytes por segundo en las pruebas. |
| Parada en melé imprecisa por latencia | Marca de tiempo del bloqueo en el cliente y ventana de tolerancia de RTT/2 en el anfitrión. |
| Disparos que fallan por la latencia | Compensación de latencia: el anfitrión rebobina enemigos con un historial de 300 ms. |
| Romper lo existente (pantalla dividida, mando, táctil) | El cooperativo es un **modo nuevo**. Las 96 pruebas automáticas actuales deben seguir pasando en cada etapa. |
| Segundo sistema de jugadores | Prohibido por diseño: un solo `Game.players` con campo `owner`; la animación y la figura son las mismas. |
| Rendimiento del render en móviles con 4 operadores y muchos enemigos | Calidad media por defecto en móvil, resolución adaptativa existente, y reducir draw calls por personaje (pendiente ya identificado). |

---

## 7. Primera prueba mínima con dos móviles reales (etapas 1 + 2)

**Preparación**
1. Publicar el HTML con la etapa 1–2 en una URL HTTPS (GitHub Pages o Netlify).
2. Dos móviles, primero en la **misma Wi-Fi**; después uno en Wi-Fi y otro con **datos móviles**.

**Pasos**
1. Móvil A abre la URL → «Crear sala cooperativa» → ve un código (p. ej. `K7Q2`) y su operador (Ghost).
2. Móvil B abre la URL → «Unirse» → escribe `K7Q2` → aparece en la sala de A como Vanguard.
3. A pulsa «Empezar». Los dos entran en la planta 1 **sin enemigos** (indicado en pantalla: «Prueba de conexión»).
4. Cada móvil muestra el escenario **a pantalla completa con su propia cámara** y controles táctiles.
5. Panel de depuración en ambos: rol, estado de conexión (directa o relayada), RTT, snapshots/s, `checksum` de la planta.

**Qué comprobar (y anotar)**
- Los dos muestran **el mismo `checksum`** de planta.
- Cada uno controla **solo** a su operador; su cámara responde sin retardo.
- Cada uno ve al otro operador **moverse y animarse** dentro del mismo pasillo (etapa 3 adelantada en versión simple). Medir a ojo el retardo y anotar el RTT del panel.
- Bloquear la pantalla del cliente 10 s y volver: se reconecta al mismo operador.
- Repetir con un móvil en datos móviles. Si no conecta, es la señal de que hace falta TURN (sección 4.2).

**Qué NO se comprueba todavía:** enemigos, daño, puertas ni progreso compartido (etapas 4–5).
