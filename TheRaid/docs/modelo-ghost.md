# The Raid — Especificación del modelo 3D de GHOST

El proyecto **no contiene ningún modelo 3D** (ni `.glb`, ni `.gltf`, ni `.fbx`). Por eso los operadores son procedurales. El juego ya está preparado para cargar un modelo profesional; este documento dice exactamente qué archivo hay que conseguir y cómo debe estar preparado.

> La integración se ha probado con un humano riggeado real (el `Soldier.glb` de los ejemplos de three.js, esqueleto Mixamo). Ese archivo es solo un **banco de pruebas**: no es Ghost, no tiene su diseño y no está incluido en el repositorio.

---

## 1. Archivo que necesitamos

| | |
|---|---|
| **Nombre y ruta** | `TheRaid/models/ghost.glb` (junto al HTML, en una carpeta `models/`) |
| **Formato** | glTF 2.0 binario (`.glb`), con texturas incrustadas |
| **Contenido** | Un personaje humano con **malla con esqueleto** (skinned mesh) y sus animaciones |

### 1.1 Aspecto (según la hoja de referencia de Ghost)
- Operador de infiltración: **capucha**, máscara o pasamontañas, gafas tácticas.
- Uniforme de combate oscuro con **pliegues modelados**, chaleco táctico ligero con portacargadores, cinturón con funda, guantes, botas, rodilleras, mochila pequeña.
- Rostro y manos con detalle (aunque la cara vaya cubierta, la cabeza debe tener forma humana real).
- **Sin arma fusionada a la malla.** El arma va aparte (ver sección 4).

### 1.2 Requisitos técnicos

| Aspecto | Requisito | Por qué |
|---|---|---|
| Triángulos | **20.000 – 40.000** (máximo 60.000) | Con 4 operadores en móvil. Por debajo de ~15.000 vuelve a parecer un muñeco. |
| Materiales | **1 o 2** materiales PBR *metallic-roughness* | Cada material es una llamada de dibujo más por personaje. |
| Texturas | **2048 × 2048** (1024 para la cabeza si va aparte): color, normal y un mapa ORM (oclusión-rugosidad-metal) | Detalle de tela y equipo sin agotar la memoria del móvil. |
| Esqueleto | Humanoide estándar, **≤ 65 huesos**, máximo 4 influencias por vértice | Límite práctico en GPU móviles. |
| Huesos imprescindibles | Cadera, columna, cabeza, brazo–antebrazo–mano y muslo–tibia–pie–puntera a cada lado; dedos recomendados | El juego los localiza solo (ver 1.3). |
| Pose de reposo | T-pose o A-pose, mirando a +Z, **de pie sobre el origen** | Si no es así, el juego lo corrige (escala, suelo y giro automáticos), pero es mejor exportarlo bien. |
| Escala | Metros (≈ 1,80 m de alto) | Si viene en centímetros se reescala solo. |
| Compresión | Opcional: **Meshopt** o **Draco** para la malla; texturas WebP o KTX2 | Probado con Meshopt y Draco. KTX2 está preparado pero **sin probar**. |
| Peso del archivo | Objetivo **≤ 8 MB** | Tiempo de carga en datos móviles. |

### 1.3 Nombres de huesos
No se exige una nomenclatura concreta. El juego busca huesos cuyo nombre contenga `hand` (o `wrist`) y `foot` (o `ankle`), decide izquierda/derecha por su posición y sube por la jerarquía (mano → antebrazo → brazo; pie → tibia → muslo → cadera). Funciona con esqueletos tipo **Mixamo**, Unreal, Rigify o VRM/Unity Humanoid.

Condiciones:
- La mano debe colgar **directamente** del antebrazo, y este del brazo (sin huesos intermedios en la cadena).
- Para orientar el modelo solo, debe existir un hueso de puntera (`toe` o `ball`) hijo del pie.
- Para animar por separado piernas y torso, la columna debe llamarse `spine`, `chest` o `torso`.
- Para cerrar los dedos sobre el arma, los dedos deben ser hijos de la mano y el pulgar contener `thumb`.

### 1.4 Animaciones
Deben ser **in-place** (sin desplazamiento de raíz) y con el nombre del estado en el nombre del clip. El juego las detecta por alias; si alguna falta, usa la alternativa indicada.

| Estado | Nombre del clip (alias aceptados) | Tipo | Si falta |
|---|---|---|---|
| **Idle** *(obligatorio)* | `Idle`, breath, stand | bucle | — el modelo no se usa en partida |
| **Walk** o **Run** *(uno obligatorio)* | `Walk`, strafe · `Run`, jog | bucle | se usa el que haya |
| Sprint | `Sprint` | bucle | `Run` + arma cruzada por IK |
| Crouch | `Crouch`, sneak, kneel | bucle | IK de piernas (se arrodilla solo) |
| Aim | `Aim`, ads, sight | bucle (pose) | IK de manos: culata al hombro |
| Fire | `Fire`, shoot, recoil | bucle corto | retroceso procedural del arma |
| Reload | `Reload` | una vez (se ajusta a 1,5 s / 1,1 s) | IK: la mano izquierda va al cargador y a la cintura |
| Jump | `Jump` | una vez | flexión y aterrizaje por IK de piernas |
| Melee | `Melee`, punch, strike, attack | una vez | puños por IK (golpe, agarre, derribo, remate) |
| Hit | `Hit`, hurt, flinch, impact | una vez | sacudida del tronco con los pies plantados |
| Death | `Death`, dying, knockout | una vez (se queda en el último fotograma) | vuelco rígido del cuerpo (aceptable, no ideal) |

**Recomendación:** si el personaje trae un juego completo de animaciones de fusil (Aim/Fire/Reload), el arma pasa a colgarse del hueso de la mano derecha y hay que ajustar su encaje (`grip`). Si solo trae Idle/Walk/Run (+ Death, Hit y Crouch si es posible), el juego sujeta el arma con IK y **no hay que ajustar nada**. Para empezar, lo segundo es más sencillo y ya está probado.

---

## 2. Cómo conseguirlo (opciones realistas)

1. **Encargo o compra del modelo de Ghost** (recomendado para que coincida con vuestra hoja de diseño): un artista 3D, o un modelo de «operador táctico con capucha» de una tienda de assets (Fab, CGTrader, Sketchfab Store, TurboSquid). Comprobad que la licencia permite usarlo en un juego web, donde el archivo se descarga al navegador del jugador.
2. **Rig y animaciones con Mixamo** (Adobe): es gratuito con una cuenta de Adobe, hace el rig automático de un personaje humanoide y ofrece animaciones de fusil (idle, andar, correr, apuntar, disparar, recargar, agacharse, golpe, impacto, muerte). Según su FAQ oficial, personajes y animaciones pueden usarse sin regalías en proyectos comerciales; revisad las condiciones vigentes antes de publicar.
3. **Conversión a GLB** con Blender: importar el FBX, unir las animaciones como acciones con su nombre (`Idle`, `Walk`, `Run`…), marcar «in place» en Mixamo al descargar, y exportar como glTF binario con «Skinning» y «Animations» activados.

Yo no puedo crear un personaje de calidad profesional con código: hace falta un modelo hecho por un artista. Tampoco he añadido ningún modelo de terceros al repositorio.

---

## 3. Cómo se integra (ya implementado)

**Opción A — probar sin tocar el código:** abrir `index (16).html?ghost=models/ghost.glb`.

**Opción B — fijo en el juego:** en `CONFIG.assets.operators` (principio del script):

```js
assets: { operators: {
  ghost: 'models/ghost.glb',                 // forma corta
  // forma completa (todo opcional salvo url):
  // ghost: { url: 'models/ghost.glb',
  //          anims: ['models/rifle-idle.glb', 'models/rifle-run.glb'],  // clips en archivos aparte (mismo esqueleto)
  //          clips: { Aim: 'Rifle Aiming Idle', Death: 'Dying' },       // nombre exacto del clip por estado
  //          height: 1.8, yaw: null, ik: null,
  //          grip: { pos: [0, 0, 0], rot: [0, 0, 0] } },                // solo si el arma va en el hueso de la mano
  vanguard: null, apex: null, breacher: null } }
```

Al cargar, la consola muestra un informe: triángulos, huesos, materiales, tamaño de texturas, escala y giro aplicados, clips detectados y **avisos** (malla demasiado densa, texturas grandes, materiales obsoletos, esqueleto no reconocido, desplazamiento de raíz eliminado…).

Qué hace el juego automáticamente:
- **Escala** a 1,8 m, **pies en el suelo**, centrado en la cadera y **orientación** corregida a partir de los pies.
- Sustituye la figura procedural de ese operador en el **menú** y en la **partida** (también si el archivo termina de cargar con la partida empezada).
- **Arma en las manos** por IK (reposo, sprint, apuntado, retroceso, recarga, cambio a pistola) y dedos cerrados sobre la empuñadura.
- **Piernas por IK** para agacharse, deslizarse, aterrizar e inclinarse sin que los pies se hundan ni patinen.
- Si el archivo no existe o falla, se mantiene la figura procedural y el juego sigue funcionando.

---

## 4. Arma

Hoy el arma que sujeta el modelo es la **del juego** (fusil y pistola hechos con geometría simple). Para un resultado coherente con un personaje profesional hará falta también un modelo de fusil y otro de pistola.

Especificación para cuando se consigan (**carga todavía no implementada**):
- `models/rifle.glb` y `models/pistol.glb`, 3.000–8.000 triángulos, 1 material, textura de 1024.
- Cañón hacia **+Z**, parte superior hacia **+Y**, **origen en la empuñadura**, en metros.
- Nodos vacíos opcionales `grip_r` (mano derecha), `grip_l` (guardamanos) y `mag` (cargador) para colocar las manos con precisión.

---

## 5. Coste medido con el modelo de prueba (11.376 triángulos, 49 huesos, 2 materiales)

| | Figura procedural | Modelo GLB |
|---|---|---|
| Llamadas de dibujo por operador (sin sombras) | 18 | **5** |
| Triángulos por operador | ~4.000 | ~11.500 |
| Animación por fotograma (clips + IK) | 7 µs | 80 µs |

Medido en la CPU del banco de pruebas, sin GPU. Con cuatro operadores son ~0,3 ms por fotograma de animación: asumible. Los FPS reales en móvil **no están medidos**.

## 6. Limitaciones conocidas
- El fixture de prueba solo trae Idle, Walk y Run. Los clips Aim, Fire, Reload, Crouch, Melee, Hit y Death **no se han probado con animaciones reales**; lo probado es su alternativa por IK y, para Death, la selección del clip con un clip sustituto.
- El modo «arma en el hueso de la mano» (para modelos con clips de fusil) está probado mecánicamente, pero su encaje (`grip`) hay que ajustarlo a ojo con el modelo real.
- La orientación de las manos depende de deducir la palma a partir de los dedos. Funciona con el esqueleto Mixamo de la prueba; en otro esqueleto podría salir invertida y habría que añadir un ajuste.
- El lado izquierdo/derecho se decide por la posición de los huesos en la pose de reposo: el modelo debe exportarse en una pose simétrica (T o A).
- Sin clip `Death`, la caída es un vuelco rígido del cuerpo.
- Solo los operadores usan GLB. Los enemigos siguen siendo procedurales.
- El juego deja de ser un único archivo: el `.glb` va aparte (incrustarlo en el HTML es posible, pero lo haría pesar 10–15 MB).
