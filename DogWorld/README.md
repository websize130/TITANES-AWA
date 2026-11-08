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

Parámetros de URL: `?room=CODIGO` (sala), `?quality=low|medium|high`, `?server=wss://host/ws`, `?debug`.

## Controles

| PC | Móvil |
|---|---|
| WASD / flechas: moverse | Joystick flotante (mitad izquierda) |
| Ratón (clic para capturar): cámara | Arrastrar en la mitad derecha: cámara |
| Espacio: saltar / doble salto | Botón ↑: saltar / doble salto |
| Shift: correr · E: ladrar · Esc: menú | Botón 🐾: ladrar · ⏸: menú |

También funciona con mando (Gamepad API, mapeo estándar).

## Estructura

```
server/server.js            HTTP estático + WebSocket: salas, instantáneas a 15 Hz, huesos autoritativos
public/index.html           Canvas, HUD limpio, controles táctiles y menú (única pantalla con marca)
public/src/core/            Game (bucle, estados), Fullscreen, Quality (perfiles + resolución dinámica)
public/src/input/           InputManager + teclado/ratón, táctil (joystick flotante) y mando
public/src/player/          PlayerController (física de plataformas), DogAvatar, ThirdPersonCamera
public/src/net/             protocol.js (compartido con el servidor), NetworkClient, RemotePlayers
public/src/world/           Hub: terreno de islas flotantes, castillo, props, césped, cielo, coleccionables
```

## Red

- El cliente envía su estado a 15 Hz solo si cambia; el servidor difunde instantáneas de los jugadores modificados.
- Los jugadores remotos se interpolan con 120 ms de retardo (búfer circular sin asignaciones).
- Los huesos dorados son autoritativos en el servidor (el primero que llega lo consigue; reaparecen a los 30 s).
- Validación en servidor: nombre/sala saneados, límites de mundo, anti-teletransporte básico, límite de mensajes y de jugadores por sala.
- Sin servidor disponible, el juego entra en modo local automáticamente.

## Arte

Todo el arte actual es procedural (geometría + texturas en canvas) para que el prototipo funcione sin assets.
Para producción, sustituir por modelos GLB/texturas PBR manteniendo las mismas funciones `build*`.
