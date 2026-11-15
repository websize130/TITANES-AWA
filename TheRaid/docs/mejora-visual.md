# The Raid — Mejora visual (personajes, armas, iluminación y cámara)

Todo el trabajo está en `index (16).html`. No se ha añadido ningún archivo binario al repositorio.
Copia de seguridad del estado anterior: rama local `backup/pre-visual` (commit `c3b5643`).

> **Lo que esta fase NO hace:** no añade personajes profesionales. En el proyecto sigue sin existir ningún modelo
> GLB propio (ni de Ghost, ni de los otros operadores, ni de los enemigos, ni de las armas). Lo que hay es la
> integración completa y probada para recibirlos, y una **vista previa opcional** con un modelo de prueba ajeno.

## 1. Personajes

### Estado real

| Elemento | Situación |
|---|---|
| Operadores (Ghost, Vanguard, Apex, Breacher) | Figuras articuladas del juego. Aceptan un GLB por operador (`CONFIG.assets.operators` o `?ghost=…`). |
| Enemigos (sicario, subfusil, machete, blindado, jefe) | Figuras articuladas del juego. **Nuevo:** ahora también aceptan un GLB (`squad.loadAsset('enemy:<tipo>', …)`). |
| Modelos profesionales | **Ninguno instalado.** |

### Vista previa con modelo de prueba (opcional, apagada por defecto)

Para ver el juego con personajes humanos reales —malla con esqueleto, animaciones por clips y las manos buscando el
arma por cinemática inversa— se puede activar una vista previa:

- **Ajustes → «Personajes de prueba» → Sí**, o abrir el juego con `?demo=1`.
- Usa el `Soldier.glb` de los ejemplos de three.js (esqueleto Mixamo, 11.376 triángulos, clips `Idle`, `Walk`, `Run`),
  **enlazado desde jsDelivr; no está copiado en el repositorio**. Se descarga una sola vez y se comparte entre todos.
- Los cuatro operadores y los cinco tipos de enemigo usan ese mismo modelo, cada uno con un tinte distinto.
- **Es un marcador de posición.** No es Ghost ni ningún personaje del juego, no tiene el diseño de la ficha y no debe
  publicarse como arte final. Necesita conexión la primera vez; si la descarga falla, el juego sigue con sus figuras.
- Un GLB propio configurado para un operador tiene prioridad sobre el de prueba.

### Qué hace el juego con un GLB de enemigo (nuevo)

Usa el mismo sistema que los operadores (`ClipPlayer` + `HumanRig`), con las acciones propias de los enemigos:

- **Con arma de fuego:** camina con los clips, sube el arma al apuntar, retroceso al disparar, las dos manos en el arma.
- **Con machete:** arma baja en la mano derecha, la sube al cargar y da el tajo; la mano izquierda va libre.
- **Aturdido / golpeado / derribado / muerto:** tambaleo, reacción al impacto, caída y levantada, y retirada de la escena
  liberando su esqueleto (`freeFig`).
- **Lejanos y tranquilos (> 15 m):** su esqueleto se actualiza 1 de cada 3 fotogramas.
- Si el modelo llega con la partida empezada, se aplica a los enemigos que ya están en pantalla.

Sin clips específicos (`Aim`, `Reload`, `Death`…), esas acciones se resuelven por capas sobre el esqueleto; con un modelo
que traiga esos clips, se usan los clips (ver `ghost-produccion.md`).

## 2. Armas

Las armas de cajas se han sustituido por **modelos integrados más detallados**, construidos en código una sola vez:
perfiles laterales extruidos con bisel (cajón de mecanismos, guardamanos, empuñadura, cargador curvo, culata), cañón,
bocacha, toma de gases, carril con dientes, alza y visor (punto rojo en el fusil, mira telescópica en el de precisión).

| Arma | Triángulos | Largo | Llamadas de dibujo |
|---|---|---|---|
| Fusil | 600 | 0,90 m | 2 (metal y polímero) |
| Fusil de precisión (Apex) | 708 | 1,10 m | 2 |
| Pistola | 192 | 0,20 m | 2 |

- Traen sus puntos de agarre, así que las manos (con GLB) se colocan en empuñadura y guardamanos.
- `slot.userData.src` indica el origen: `'glb'` (archivo), `'builtin'` (integrada) o `'geo'` (machete y armas sin modelo).
- Un `rifle.glb` / `pistol.glb` real sigue teniendo prioridad y sustituye a la integrada sin tocar nada más.

**No son modelos profesionales:** no tienen texturas, normales horneadas ni piezas móviles. Mejoran la silueta y el
agarre; el acabado de un arma «AAA» solo lo da un modelo hecho por un artista (ver apartado 6).

## 3. Iluminación y gradación

Valores en partida (el menú conserva los suyos y se restauran al salir):

| Parámetro | Antes | Ahora |
|---|---|---|
| Bloom: intensidad / radio / umbral | 0,32 / 0,30 / 0,95 | 0,20 / 0,22 / 1,0 |
| Emisión de las lámparas del techo | ×2,0 | ×1,3 |
| Grano | 0,015 | 0,005 |
| Aberración cromática | 0,004 | 0,003 |
| Viñeta | 0,42 | 0,46 |
| Exposición | 1,15 | 1,0 |
| Luz ambiente (hemisférica) | ×0,8 | ×0,62 |
| Luces puntuales | ×1 | ×0,85 |

- **Oclusión de contacto** en el shader de muros y coberturas: oscurece la base junto al suelo y la parte alta junto al
  techo. No cuesta pases ni texturas adicionales.
- **Haces de luz** bajo cada lámpara del pasillo (plano aditivo con degradado). Solo en calidad media y alta.
- **Luz de contorno** fría sobre el operador (casi cenital, ligeramente detrás): perfila casco y hombros para que no se
  pierda en las sombras. Reutiliza los focos de la linterna, que solo se usaban en las plantas a oscuras.
- Reflejo del suelo y charcos algo más contenidos.

## 4. Cámara y respuesta

- Cámara al hombro más cercana: 2,45 m (antes 2,7 m) y 1,3 m al apuntar (antes 1,45 m); campo de visión 56° (antes 58°).
- **Retroceso de cámara** al disparar (solo visual, no altera la puntería): ~0,7° por disparo de fusil, tope 2,9°,
  se recupera solo.
- Fogonazo de tres partículas en la boca del arma.

## 5. Pruebas realizadas

Todas en Chromium sin interfaz con render por software (SwiftShader), simulación determinista a 60 Hz.
**No se ha probado en ningún móvil, tableta ni GPU real.**

| Batería | Resultado |
|---|---|
| `visual` (nueva: gradación, luces, armas integradas, vista previa, enemigos con modelo, rendimiento) | 28/28 |
| `anim` (animación procedural) | 35/35 |
| `combat` | 41/41 |
| `weapons` (4 expectativas actualizadas: ya no existe el arma de cajas) | 25/25 |
| `glb`, `glb2`, `glb3` | 14/14, 6/6, 33/33 |
| `modeltest` (banco de pruebas) | 27/27 |
| `touch2` (controles táctiles y HUD) | 76/76 |
| Duración: 4 min simulados, 4 jugadores, 3 plantas | 14.400 pasos, 0 errores, 0 valores no finitos |

Rendimiento (planta 2, cinco enemigos cerca, 960×540):

| Modo | Calidad | Llamadas de dibujo | Triángulos | Lógica por paso |
|---|---|---|---|---|
| Antes | media | 269 | 57.765 | 0,10 ms |
| Ahora | media | 266 | 59.301 | 0,09 ms |
| Antes | baja | 185 | 38.533 | 0,07 ms |
| Ahora | baja | 189 | 40.265 | 0,13 ms |
| Antes | alta | 265 | 55.545 | 0,13 ms |
| Ahora | alta | 253 | 54.813 | 0,10 ms |
| Vista previa | media | 119 | 171.677 | 0,83 ms |
| Vista previa | baja | 83 | 87.317 | 0,63 ms |

- En modo normal no hay variación apreciable (±3 %).
- Con la vista previa bajan las llamadas de dibujo (un personaje = 2 mallas) pero **se triplican los triángulos** y la
  animación de esqueletos cuesta unas 8 veces más de CPU. El modelo de prueba no está optimizado para móvil
  (11.376 triángulos por personaje, sin niveles de detalle). Los modelos definitivos de enemigos deberían rondar
  4.000–6.000 triángulos.
- Los tiempos de fotograma medidos con render por software no representan un dispositivo real y no se dan como dato.

## 6. Recursos externos que siguen faltando

| Recurso | Para qué | Especificación |
|---|---|---|
| `ghost.glb` | Operador principal | `ghost-produccion.md` (diseño, presupuesto de polígonos, esqueleto, clips) |
| `vanguard.glb`, `apex.glb`, `breacher.glb` | Resto del escuadrón | Mismo esqueleto y clips que Ghost |
| Enemigos: 3–5 modelos | Sicario, subfusil, machete, blindado, jefe | Esqueleto humanoide, 4.000–6.000 triángulos, mismos nombres de clip |
| `rifle.glb`, `pistol.glb` (y fusil de precisión, machete) | Armas | `controles-hud-armas.md` §2: cañón +Z, origen en la empuñadura, nodos `grip_r`, `grip_l`, `mag` |
| Clips de animación | `Aim`, `Fire`, `Reload`, `Death`, `Hit`, `Melee`, cobertura | Hoy se resuelven por capas sobre el esqueleto |
| Texturas PBR del edificio | Muros, suelos, puertas | Hoy son texturas generadas en código |

### Qué solo puede resolver un modelo 3D profesional

- Rostro, manos con dedos, ropa, equipo y proporciones propias de cada personaje.
- Identidad visual distinta para cada operador y cada tipo de enemigo (hoy, con la vista previa, todos son el mismo
  cuerpo con otro color).
- Animaciones de calidad de captura: recarga con el cargador en la mano, muertes, golpes cuerpo a cuerpo, coberturas.
- Armas con texturas, desgaste, piezas móviles y miras reales.
- Materiales con mapas de normales y rugosidad en personajes y escenario.
