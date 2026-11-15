# The Raid — Banco de pruebas, armas 3D, controles táctiles y HUD

Referencia de la fase de preparación para personajes y armas profesionales y del rediseño de la interfaz.
Todo vive en `TheRaid/index (16).html`. No se ha añadido ningún modelo 3D al repositorio.

---

## 1. Banco de pruebas de personajes

**Abrir:** `index (16).html?modeltest=1`

Es una escena independiente: no arranca la partida, no abre sala de emparejamiento y no muestra el menú. Usa las mismas funciones que la partida para crear y animar al operador, así que lo que se ve aquí es lo que hará en el juego.

### Cargar un modelo
| Forma | Cómo |
|---|---|
| Archivo del dispositivo | Botón **Personaje GLB…** (no hace falta servidor ni subirlo a ningún sitio) |
| Ruta o URL | Escribirla en el campo y pulsar **Cargar**, o abrir `?modeltest=1&ghost=models/ghost.glb` |
| Modelo de prueba | Botón **Soldier de prueba**: descarga el `Soldier.glb` de los ejemplos de three.js. **No es Ghost** y no está en el repositorio |
| Armas | Botones **Fusil GLB…** y **Pistola GLB…**, o `&rifle=…&pistol=…` |

Sin modelo se muestra la figura procedural del juego, indicado en pantalla.

### Qué muestra
- **Medidas:** altura original, escala aplicada, altura final y giro aplicado.
- **Malla:** triángulos, mallas con esqueleto, materiales y textura mayor.
- **Materiales y texturas:** nombre, tipo y tamaño de cada mapa.
- **Esqueleto:** número de huesos y los detectados (cadera, columna, brazos, piernas, falanges).
- **Clips:** qué clip del archivo se usa para cada estado y cuáles faltan.
- **Comprobaciones** con ✓ / ⚠ / ✗: apto para partida, escala, orientación, rig y suelo (medido en vivo).
- **Estado en vivo:** clip que suena, si los brazos van por IK, tipo de arma, altura y punto más bajo.

### Cámara y vistas
Arrastrar gira, la rueda o el pellizco acercan y alejan. Botones **Frontal**, **Perfil**, **Espalda** y **3/4**. **Esqueleto** dibuja los huesos y marca las 13 articulaciones detectadas (magenta = derecha, cian = izquierda, amarillo = cadera). **Rejilla y regla** muestra el suelo y una regla con marca a 1,80 m.

### Las 14 acciones
Idle, Walk, Run, Sprint, ADS, Disparo, Recarga, Cambio de arma, Crouch, Melee, Hit, Death, Caída y Reanimación. Cada botón lleva una etiqueta:

| Etiqueta | Significado |
|---|---|
| **CLIP** | Animación real incluida en el modelo |
| **IK** | El modelo no trae ese clip: se resuelve con IK de manos o piernas |
| **CLIP+IK** | Clip de locomoción con el arma colocada por IK |
| **PROC** | Procedimental (por ejemplo, el vuelco rígido al morir sin clip `Death`) |

Al pasar el cursor por el botón se explica cómo se resuelve.

---

## 2. Armas 3D independientes

### Configuración
En `CONFIG.assets.weapons` (principio del script), una entrada por tipo de arma:

```js
weapons: {
  rifle: 'models/rifle.glb',                       // forma corta
  pistol: { url: 'models/pistol.glb',              // forma completa (todo opcional salvo url)
            pos: [0, 0, 0], rot: [0, 0, 0], scale: 1,
            grips: { r: [0, 0, 0], l: [0, 0.02, 0.05], mag: [0, -0.09, 0] } },
}
```

Prueba sin tocar el código: `?rifle=models/rifle.glb&pistol=models/pistol.glb`.

### Convenio del archivo
- Cañón hacia **+Z**, parte superior hacia **+Y**, **origen en el centro de la empuñadura**, en metros.
- Nodos vacíos opcionales: `grip_r` (mano derecha), `grip_l` (guardamanos) y `mag` (cargador).
- Recomendado: 3.000–8.000 triángulos, un material, textura de 1024.

### Comportamiento
- Si el archivo no existe o falla, **se mantiene el arma geométrica** del juego.
- Sin nodos se usan agarres por defecto; se pueden fijar a mano con `grips`.
- Un arma modelada en otra unidad (centímetros) se reescala a un tamaño plausible y se avisa en consola.
- Las manos van a los puntos de agarre del arma equipada en reposo, apuntado, disparo, sprint, recarga y cambio de arma. En melé la sueltan.
- Si la mano derecha no alcanza la empuñadura (brazos cortos), el arma se acerca al hombro lo justo.
- Para añadir otro tipo (por ejemplo `shotgun` o `long`), basta con otra clave en `weapons`.
- Los enemigos con fusil o pistola usan el mismo modelo.

**Probado con un arma sintética** generada en la prueba (cajas con nodos). No existe ningún modelo de arma real en el proyecto.

---

## 3. Controles

### Táctil
| Zona | Control | Comportamiento |
|---|---|---|
| Izquierda | **Joystick flotante** | Aparece donde se apoya el pulgar. A fondo hacia delante = **sprint** (se ilumina) |
| Derecha | **Zona libre** | Arrastrar gira la cámara y apunta |
| Derecha | **Disparar** | Mantener. Arrastrar el dedo sobre él también gira la cámara |
| Derecha | **Mira** | Interruptor (un toque activa, otro desactiva) |
| Derecha | **Recargar**, **Arma** | Botones pequeños |
| Derecha | **Saltar**, **Agachar** | Botones pequeños. Agachar es interruptor; echar a correr levanta al operador |
| Contextual | **Botón de acción** | Solo aparece cuando hay algo que hacer |

**Botón de acción** (por prioridad):
1. **Reanimar** — junto a un compañero abatido (mantener).
2. **Melé** — con un enemigo a menos de ~3 m.
3. **Brecha** — frente a una puerta o un tabique rompible.

**En combate cuerpo a cuerpo** tres botones cambian de función y muestran su nombre: Mira → **Guardia** (mantener), Saltar → **Esquivar**, Agachar → **Agarre**.

Antes había 7 botones grandes con texto siempre visibles; ahora son 6 más pequeños, solo con icono, y uno contextual. No se ha eliminado ninguna acción.

### Teclado y ratón
WASD mover · ratón mirar · clic izquierdo o F disparar · clic derecho o Q apuntar · R recargar · X, 1, 2 o rueda cambiar de arma · Mayús sprint · C agacharse · Espacio saltar · V melé / reanimar / brecha · Esc pausa.

### Mando (PlayStation)
Stick izquierdo mover (a fondo = sprint) · stick derecho mirar · R2 disparar · L2 apuntar · △ recargar · L1/R1 cambiar de arma · ○ agacharse · ✕ saltar · □ o R3 melé / reanimar / brecha · Options pausa.

### Convivencia de dispositivos
- Con teclado o mando **no se muestran botones táctiles**.
- En un dispositivo táctil, si el puesto táctil lleva más de 4 segundos sin tocarse y se pulsa un botón del mando (o una tecla), el mando **hereda al mismo jugador**: no aparece un segundo jugador y los botones táctiles se ocultan.
- Si el táctil se está usando, un mando nuevo entra como segundo jugador (cooperativo local).
- Los avisos nombran el control de cada dispositivo: `[V]`, `□` o `ACCIÓN`.
- En vertical, el juego táctil se pausa y pide girar el móvil.

---

## 4. HUD
- **Arriba a la izquierda:** jugador, operador y modo; barra de salud; compañeros con su salud y estado.
- **Arriba en el centro:** planta y objetivo (`Hostiles · N` o `Planta despejada · sube por la escalera`).
- **Abajo:** arma equipada y munición. A la derecha en PC y mando; en el centro en táctil, porque las esquinas son de los pulgares.
- **Marcadores de mundo:** compañero abatido, salida al despejar la planta y munición cuando queda poca.
- **Aviso contextual** bajo la mira.
- Sin cajas ni paneles: texto con sombra.

---

## 5. Ajustes de controles táctiles

Se abren desde **Ajustes → Controles táctiles**, desde la **pausa** (en táctil) y desde el **engranaje** del móvil usado como mando.

| Ajuste | Rango |
|---|---|
| Sensibilidad de cámara | ×0,4 – ×2,5 |
| Sensibilidad al apuntar | ×0,4 – ×1,6 |
| Tamaño de los botones | ×0,8 – ×1,3 |
| Opacidad de los botones | 25 % – 100 % |
| Invertir eje vertical | Sí / No |
| Vibración | Sí / No (se indica si el dispositivo no la admite) |
| Mano dominante | Diestro / Zurdo (intercambia movimiento y botones) |
| Posición de los botones | Editor: arrastrar cada botón |
| Restaurar valores predeterminados | — |

Se guardan en el dispositivo (`localStorage`, clave `raid.pad`).

---

## 6. Cómo probarlo todo

1. Servir la carpeta por http: `npx serve TheRaid` (o GitHub Pages). Abierto como `file://` el navegador bloquea los modelos.
2. **Banco de pruebas:** `…/index (16).html?modeltest=1` → **Soldier de prueba** → recorrer las 14 acciones y las vistas.
3. **Con vuestro modelo:** botón **Personaje GLB…** y elegir el archivo.
4. **Armas:** botones **Fusil GLB…** y **Pistola GLB…**.
5. **Juego en móvil:** abrir la URL normal en el móvil en horizontal → Nueva partida.
   - Mover y mirar a la vez; joystick a fondo para esprintar.
   - Mira + Disparar; Recargar; Arma.
   - Acercarse a un enemigo: aparece el botón de acción.
   - Ponerse frente a una puerta: aparece **Brecha**.
6. **Ajustes:** pausa → **Controles táctiles**. Cambiar tamaño y opacidad, y probar **Editar posición**.
7. **PC:** abrir en un ordenador: no debe aparecer ningún botón táctil.
8. **Mando:** conectar un mando y pulsar un botón: mismo criterio.

---

## 7. Limitaciones
- **Sin probar en un móvil físico.** Las pruebas táctiles se han hecho con emulación en Chromium. Tampoco con mandos físicos ni con una conexión PeerJS real.
- No hay modelos reales de Ghost ni de armas: las armas se han probado con un modelo sintético.
- El cambio automático de táctil a mando usa un umbral fijo de 4 segundos; no hay vuelta automática de mando a táctil.
- El editor de posición no mueve el joystick (es flotante) ni permite cambiar el tamaño de cada botón por separado.
- Saltar y Agachar siguen siendo botones fijos (pequeños); no se han convertido en gestos.
- El banco de pruebas solo carga el operador Ghost.
