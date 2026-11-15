# The Raid — Producción del Ghost definitivo

Documento de producción. **No modifica código.** Complementa a [`modelo-ghost.md`](modelo-ghost.md) (referencia técnica del cargador).
Estado del repositorio: rama `ccr-21ceb6aa-u5tfpl`, commit `59ce544`.

---

## 1. Auditoría: qué está terminado y qué falta

### Terminado y comprobado (33/33 pruebas con un humano riggeado de prueba)
- Carga de un GLB por `CONFIG.assets.operators.ghost` o por URL (`?ghost=models/ghost.glb`).
- Escala a 1,8 m, pies en el suelo y orientación automáticas.
- Sustitución de Ghost en el menú y en la partida (también si el archivo llega con la partida empezada).
- Arma sujeta con las dos manos por IK: reposo, sprint, apuntado, retroceso, recarga y pistola. Dedos cerrados.
- Piernas por IK: agacharse, deslizarse, aterrizar. Melé con puños. Impacto, caída y reanimación.
- Clips opcionales reales (Aim, Fire, Reload, Crouch, Melee, Hit, Death) con prioridad sobre las alternativas.
- GLB comprimidos con Draco y Meshopt. Informe de validación en consola.

### Lo que falta de verdad
| Falta | Quién lo resuelve |
|---|---|
| **El modelo de Ghost.** No hay ningún archivo 3D en el repositorio; `TheRaid/models/` no existe todavía. | Vosotros (compra, encargo o generación). Es el único bloqueo. |
| Modelos de **fusil y pistola**. Hoy el arma es la geometría simple del juego. | Mismo proveedor que el personaje. La carga de armas GLB está especificada, **no implementada**. |
| Pruebas con **clips reales** de apuntar, disparar, recargar, agacharse, melé, impacto y muerte. | Se prueban al llegar el modelo. |
| Pruebas en **móvil real** y con GPU. | Vosotros, con la guía de la sección 6. |
| Ajustes finos según el esqueleto real (palma de la mano, agarre). | Yo, cuando tenga el archivo. |

El modelo de prueba (`Soldier.glb`, de los ejemplos de three.js) no está en el repositorio y no debe publicarse como Ghost.

---

## 2. Diseño definitivo de Ghost

### 2.1 Concepto
**Especialista en infiltración del escuadrón.** El más ligero y silencioso de los cuatro: entra primero, a oscuras. Su silueta debe leerse a 10 metros y de espaldas, que es como se le ve casi siempre en tercera persona.

### 2.2 Silueta (lo que le distingue de los otros tres)
- **Capucha** amplia, caída hacia delante, con el borde en sombra. Es el único operador sin casco: la cabeza redondeada y encapuchada es su firma.
- **Hombros limpios y estrechos** (sin hombreras). Vanguard y Breacher son los voluminosos.
- **Braga o pañuelo táctico** al cuello que rompe la línea entre capucha y chaleco.
- **Mochila pequeña y plana** (asalto de un día) con una antena o un tubo de cuerda en un lateral: asimetría reconocible de espaldas.
- Torso en V marcado por el chaleco ligero; piernas esbeltas con rodilleras de perfil bajo.

### 2.3 Rostro: máscara integral
- Máscara rígida que cubre **todo el rostro**, lisa y angulosa, sin boca ni rasgos, con **dos lentes estrechas** oscuras.
- Las lentes pueden llevar un **brillo cian muy tenue** (el color de Ghost en el juego), apagado por defecto.
- **No usar calaveras ni motivos de hueso.** Un operador encapuchado llamado «Ghost» con máscara de calavera se confunde con un personaje muy conocido de otra saga. El motivo debe ser propio: geométrico, liso, industrial.

### 2.4 Equipo, de arriba abajo
| Zona | Detalle |
|---|---|
| Cabeza | Capucha de tejido técnico mate; máscara integral; auricular de comunicaciones asomando por un lado. |
| Cuello | Braga táctica gris carbón. |
| Torso | Chaqueta de combate ajustada con pliegues modelados. **Chaleco portaplacas ligero** con tres portacargadores al frente, bolsillo de administración, radio en el costado izquierdo y cintas MOLLE. |
| Brazos | Mangas con refuerzo en codo; **parche de velcro cian** en el hombro izquierdo (identificador del jugador). |
| Manos | Guantes tácticos de nudillo rígido, dedos completos. |
| Cintura | Cinturón de combate con funda de pistola en el muslo derecho (vacía o con pistola separable), bolsa de descarga y cuchillo. |
| Piernas | Pantalón de combate con bolsillos de carga; **rodilleras** integradas de perfil bajo. |
| Pies | Botas militares de media caña, suela marcada. |
| Espalda | Mochila pequeña, tubo de hidratación, antena corta. |

### 2.5 Color y materiales
- Paleta: **negro carbón y gris pizarra** como base (80 %), **gris cálido** en cintas y bolsas (15 %), **cian** solo como acento mínimo (parche y lentes, menos del 2 %).
- Materiales diferenciados para que no sea «una mancha negra»: tejido mate, nailon con trama visible, polímero semibrillante en máscara y hebillas, cuero gastado en guantes y botas, metal en mosquetones.
- Desgaste real: polvo en botas y rodillas, roces en bordes del chaleco, sin exagerar.

### 2.6 Nivel de calidad alcanzable (expectativa honesta)
Con 20.000–40.000 triángulos y texturas de 2048 px en un navegador móvil, el techo realista es el de un **shooter táctico de móvil de gama alta o de consola de la generación anterior**. Un personaje principal de un juego AAA de sobremesa usa varias veces ese presupuesto. La máscara integral juega a nuestro favor: evita la parte más cara y difícil (cara, ojos y pelo).

---

## 3. Cómo conseguir el modelo: comparación

| Método | Calidad | Coste orientativo | Plazo | Derechos | Encaje con nuestro diseño |
|---|---|---|---|---|---|
| **A. Encargo a un artista 3D** | La más alta y controlable | Muy variable según el nivel (ver abajo) | Semanas | Los mejores, si el contrato cede los derechos | Total |
| **B. Compra en tienda y adaptación** | Alta si se elige bien | No verificado; depende del modelo | Días | **Problemáticos para un juego web** | Parcial (no es un diseño propio) |
| **C. Generación por IA + limpieza** | Media; hoy no llega a AAA | Suscripción mensual baja | 1–3 días | Buenos en planes de pago | Aceptable; requiere retoque |
| **D. Blender + Mixamo** | — | Gratuito | — | — | No crea el personaje: es la **preparación** que necesitan A, B y C |

### A. Encargo a un artista 3D
- **Precios publicados (muy dispersos):** los anuncios de plataformas de freelance sitúan un personaje riggeado en unos pocos cientos de dólares; los estudios publican entre 1.000 y 10.000 $ por personaje, 5.000–12.000 $ o más para realistas y 10.000–25.000 $ o más para nivel AAA. El rigging suele cotizarse aparte (500–2.500 $).
- **Lectura práctica:** el tramo bajo rara vez da calidad realista; conviene pedir presupuesto cerrado con la especificación de la sección 4 y ver un portfolio de personajes militares.
- **Derechos:** pedir por escrito la cesión de derechos de explotación, incluida la distribución del archivo dentro de un juego web.

### B. Compra en tienda
- **Riesgo de licencia.** En un juego web, el `.glb` se descarga tal cual al navegador del jugador. Varias licencias lo impiden:
  - Sketchfab: el modelo no puede quedar accesible «como archivo independiente».
  - TurboSquid: en un juego, el modelo debe ir en un formato propietario del que no pueda extraerse sin ingeniería inversa.
  - Fab: permite distribuir el proyecto con el asset incorporado, pero no redistribuirlo por separado; no he encontrado un criterio oficial para builds web.
- Solo es viable si el vendedor **autoriza por escrito** el uso en un juego web, o si empaquetamos el modelo en un contenedor ofuscado (mitiga el riesgo, no lo elimina; requiere código nuevo).
- No he verificado precios ni la licencia de CGTrader.

### C. Generación por IA
- **Meshy:** según su documentación, los planes de pago incluyen uso comercial y el modelo es vuestro; el plan gratuito es CC BY 4.0. Incluye auto-rig, más de 600 animaciones y exportación a GLB. Las fuentes dan 20 $/mes para el plan Pro; confirmad el precio en su web.
- **Tripo:** uso comercial en planes de pago; las fuentes discrepan en el precio (entre 15,90 y 20 $/mes). Geometría algo más limpia; menos animaciones.
- **Límites reales:** las mallas salen densas y con topología desordenada, sobre todo en dedos y articulaciones. El remallado automático no sustituye a una topología hecha para deformarse. Una reseña cifra en 1 de cada 10 las generaciones utilizables sin retoque.
- **Qué significa para Ghost:** sirve para un **prototipo** que valide silueta, escala y flujo completo dentro del juego. No es el personaje definitivo.

### Recomendación
**Dos pasos:**
1. **Ahora, prototipo por IA** a partir de vuestra hoja de referencia de Ghost, riggeado con Mixamo y convertido en Blender. Coste de una suscripción mensual; uno o dos días. Permite ver a «un Ghost» en el juego, comprobar toda la cadena y decidir con una imagen real delante.
2. **Definitivo, encargo a un artista de personajes** con el diseño de la sección 2 y la especificación de la sección 4, usando el prototipo como referencia de volumen. Es la única vía que da a la vez identidad propia, calidad y derechos limpios para web.

Si el presupuesto no permite el encargo, la alternativa es B con autorización escrita del vendedor.

---

## 4. Especificación técnica para el artista o proveedor

> Texto pensado para enviarlo tal cual.

**Entregable principal:** `ghost.glb` — glTF 2.0 binario, texturas incrustadas, listo para tiempo real en navegador móvil (three.js r160).

### 4.1 Malla
- **20.000–40.000 triángulos** en total (máximo absoluto 60.000), incluidos mochila y equipo.
- Preferiblemente **una sola malla con esqueleto**; como máximo dos.
- Topología limpia en articulaciones: hombros, codos, muñecas, caderas, rodillas y dedos deben deformar bien con flexiones de 120°.
- Sin geometría oculta bajo la ropa. Sin simulación de tela: la capucha y las cintas van pesadas a huesos.
- **Sin arma en la malla.** La funda puede ir vacía.

### 4.2 Materiales y texturas
- **1 material** PBR *metallic-roughness* (máximo 2). Sin transparencias con mezcla; si hace falta recorte, *alpha test*.
- Texturas de **2048 × 2048**:
  - Color base (sRGB).
  - Normal en convención **OpenGL (+Y)**, como exige glTF.
  - **ORM** en una sola imagen: R = oclusión, G = rugosidad, B = metal.
  - Emisiva opcional (lentes y parche cian), en negro por defecto.
- Densidad de texel uniforme; cabeza y manos pueden llevar algo más.

### 4.3 Esqueleto y pesado
- Humanoide estándar **compatible con Mixamo**, con dedos de tres falanges (en torno a 65 huesos; no superar 75).
- Cadena directa mano → antebrazo → brazo y pie → tibia → muslo → cadera. Hueso de puntera hijo del pie.
- Máximo **4 influencias por vértice**. Sin huesos de escala.
- Pose de reposo **T o A simétrica**, de pie sobre el origen, mirando a **+Z**, eje **Y arriba**, en **metros** (≈ 1,80 m).

### 4.4 Animaciones (incluidas en el GLB, en el sitio, 30 fps)
| Clip | Nombre exacto | Tipo |
|---|---|---|
| Reposo con fusil | `Idle` | bucle |
| Andar con fusil | `Walk` | bucle |
| Correr con fusil | `Run` | bucle |
| Muerte | `Death` | una vez |
| Impacto | `Hit` | una vez |
| Agachado en reposo | `Crouch` | bucle |

Obligatorios: `Idle` y `Walk` o `Run`. Los otros tres mejoran mucho el resultado. Apuntar, disparar, recargar y golpear los resuelve el juego por IK; no hace falta entregarlos.

### 4.5 Armas (archivos aparte)
- `rifle.glb` y `pistol.glb`: 3.000–8.000 triángulos, 1 material, textura de 1024.
- Cañón hacia **+Z**, parte superior hacia **+Y**, **origen en la empuñadura**, en metros.
- Nodos vacíos `grip_r`, `grip_l` y `mag`.

### 4.6 Entrega
- `ghost.glb` (objetivo ≤ 8 MB) y los archivos fuente (`.blend` o `.fbx`, texturas en capas).
- Capturas de frente, perfil, espalda y 3/4, y un vídeo corto con las animaciones.
- Cesión de derechos por escrito, incluida la distribución dentro de un juego web.

---

## 5. Herramientas y pasos para preparar el GLB

**Herramientas:** Blender (gratuito), una cuenta de Adobe para Mixamo (gratuita) y, si se usa la vía C, una suscripción a un generador 3D.

1. **Modelo en pose A o T**, limpio: una sola malla sin partes flotantes, centrado en el origen, sin esqueleto previo. Exportar a FBX con las texturas incrustadas.
2. **Mixamo → Upload Character.** Colocar los marcadores (barbilla, muñecas, codos, rodillas, ingle). Elegir la opción de esqueleto **con dedos** (la documentación oficial no detalla las opciones; comprobadlo en pantalla).
3. **Descargar el personaje** riggeado (FBX, «With Skin», T-pose).
4. **Descargar las animaciones** (FBX, «Without Skin», 30 fps, **«In Place» activado** en las de desplazamiento): reposo, andar y correr con fusil; muerte, impacto y agachado.
5. **Blender:** importar el personaje y cada animación; renombrar cada acción exactamente `Idle`, `Walk`, `Run`, `Death`, `Hit`, `Crouch`; asignarlas al mismo esqueleto.
6. **Comprobar** escala (1,80 m), pies en el origen y que mira hacia −Y de Blender (al exportar con «+Y Up» queda mirando a +Z).
7. **Exportar** como glTF binario (`.glb`) con piel, animaciones y «+Y Up» activados.
8. **Opcional, comprimir:** `npx @gltf-transform/cli meshopt entrada.glb ghost.glb` (probado con el modelo de prueba: de 2,16 MB a 0,99 MB).

Alternativa sin unir animaciones en Blender: entregar cada animación en su propio GLB y listarlas en `anims`; el juego les pone el nombre del archivo (`rifle-run.glb` → `rifle-run`).

**Si me pasáis el archivo**, puedo validarlo, comprimirlo, integrarlo y generar la hoja de poses. En este entorno no hay Blender, así que la conversión desde FBX y el rigging tienen que venir hechos.

---

## 6. Integración paso a paso

### 6.1 Colocar y asignar
1. Crear la carpeta `TheRaid/models/` y copiar dentro `ghost.glb`.
2. Servir la carpeta `TheRaid/` por **http(s)** (por ejemplo `npx serve TheRaid`, o GitHub Pages). Abierto como archivo local (`file://`) el navegador bloquea la carga del modelo.
3. **Prueba rápida, sin tocar código:** abrir `index (16).html?ghost=models/ghost.glb`.
4. **Definitivo:** en `CONFIG.assets.operators` (línea 335), cambiar `ghost: null` por `ghost: 'models/ghost.glb'`.

### 6.2 Leer el informe (consola del navegador)
Debe aparecer una línea `[Modelo] Ghost: …` y otra `[Animación] Ghost: …`. Comprobar:
- Triángulos, huesos, materiales y tamaño de textura dentro de la especificación.
- **Sin línea `[Avisos]`**. Si aparece, dice exactamente qué falla.
- Sin el texto «NO APTO para partida».

### 6.3 Orientación, escala y suelo
- **Menú:** Ghost a la misma altura que los otros tres, pies sobre el suelo, mirando a cámara, fusil en las manos.
- **Partida:** se le ve de espaldas al avanzar con W. Si mira al revés, añadir `yaw: Math.PI` en su configuración.
- Los pies no flotan ni se hunden al estar quieto, al andar ni al agacharse.

### 6.4 Arma y acciones (teclado · mando)
| Acción | Cómo | Qué mirar |
|---|---|---|
| Idle | quieto | Fusil bajo, ambas manos en el arma, dedos cerrados |
| Walk | W · stick a medias | Zancada natural, el arma no se separa de las manos |
| Run / Sprint | W + Mayús · stick a fondo | Arma cruzada al pecho |
| ADS | Q o botón derecho · L2 | Culata al hombro derecho, cañón hacia la mira |
| Disparo | F o clic · R2 | Retroceso corto, las manos no sueltan |
| Recarga | R · Triángulo | La mano izquierda va al cargador y vuelve |
| Pistola | X · L1/R1 | Empuñada a dos manos al apuntar |
| Agacharse | C · Círculo | Rodilla flexionada, pies quietos |
| Deslizarse | sprint + C | Postura baja sin atravesar el suelo |
| Salto | Espacio · X | Flexión al salir y al caer |
| Melé | V cerca de un enemigo · Cuadrado | Puños cerrados, golpe hacia delante |
| Guardia | Q en melé | Puños altos |
| Impacto | recibir un disparo | Sacudida del tronco, pies plantados |
| Muerte | quedarse sin vida (con 2 jugadores) | Clip `Death` o vuelco; sin flotar |

### 6.5 Si algo sale mal
| Síntoma | Ajuste |
|---|---|
| Mira hacia atrás | `yaw: Math.PI` |
| Demasiado alto o bajo | `height: 1.8` (u otro valor) |
| Manos giradas o dedos hacia fuera | Avisadme: hay que añadir un ajuste de palma |
| El arma atraviesa el cuerpo | Avisadme: se ajusta la postura del arma |
| No aparece (sigue la figura antigua) | Leer la consola: archivo no encontrado o faltan `Idle` y `Walk`/`Run` |

---

## 7. Lista de aprobación (apto / no apto)

### Técnica — todo obligatorio
- [ ] Informe sin avisos; entre 20.000 y 40.000 triángulos; 1–2 materiales; texturas ≤ 2048.
- [ ] Esqueleto reconocido (brazos y piernas); clips `Idle` y `Walk` o `Run` detectados.
- [ ] Archivo ≤ 8 MB.
- [ ] Sin errores de JavaScript en consola.

### Visual — todo obligatorio
- [ ] Se reconoce como Ghost de espaldas y a 10 m, y se distingue de los otros tres.
- [ ] Capucha, máscara integral, chaleco, guantes, rodilleras y botas presentes y proporcionados.
- [ ] Materiales distinguibles entre sí; no es una mancha negra en plantas oscuras.
- [ ] Sin texturas rosas, negras o estiradas; sin caras invertidas.
- [ ] Sin deformaciones feas en hombros, codos, rodillas y dedos al apuntar, agacharse y golpear.

### En juego — todo obligatorio
- [ ] Las 14 acciones de la tabla 6.4 se ven correctas en partida.
- [ ] Correcto en el menú junto a los otros operadores.
- [ ] Cámara en tercera persona: la capucha y la mochila no tapan la mira.
- [ ] En un móvil real: sin tirones apreciables y carga razonable con datos móviles.

### Legal — obligatorio
- [ ] Licencia o cesión por escrito que permita distribuirlo en un juego web.

**Rechazo inmediato:** arma fusionada a la malla, esqueleto no humanoide, animaciones con desplazamiento de raíz no corregible, o licencia que no cubra web.

---

## 8. Cambios de código propuestos

| Propuesta | Por qué | Tamaño |
|---|---|---|
| ✅ **Hecho** — **Banco de pruebas en pantalla** (`?modeltest=1`): informe de validación visible, botones para forzar cada acción, cámara orbital y luz neutra. | Hoy hay que abrir la consola y jugar para revisar cada pose; en móvil es impracticable. Permitiría aprobar o rechazar el modelo en dos minutos. | Medio |
| ✅ **Hecho** — **Carga de armas GLB** (`rifle.glb`, `pistol.glb`) con nodos de agarre. | Un personaje profesional con el fusil de cajas se vería incoherente (el fusil integrado ya no es de cajas, pero sigue sin ser un modelo profesional: ver `mejora-visual.md`). | Medio |
| **Ajustes manuales** de palma y agarre en la configuración. | La orientación de las manos se deduce sola; con otro esqueleto puede salir invertida. | Pequeño |
| **Color de jugador** sobre el GLB (parche o lentes emisivos). | En pantalla dividida, hoy el modelo GLB pierde la marca de color. | Pequeño |
| **Contenedor ofuscado** para el modelo. | Solo si se compra un modelo cuya licencia exija que no sea extraíble. | Medio |

Las dos primeras ya están implementadas: ver [`controles-hud-armas.md`](controles-hud-armas.md). Las otras tres siguen pendientes.

---

## Fuentes
- [Meshy — precios y licencias](https://docs.meshy.ai/en/webapp/pricing) · [Meshy — auto-rig y animación](https://docs.meshy.ai/en/webapp/guides/animate)
- [Tripo — precios (comparador)](https://www.costbench.com/software/ai-3d-generation/tripo-ai/) · [Tripo 3.1 — reseña](https://newsletter.neural4d.com/p/tripo-3-1-model-review)
- [Generadores 3D por IA para juegos — comparativa](https://www.3daistudio.com/blog/best-ai-game-asset-generators-2026)
- [Fab — licencia estándar](https://www.fab.com/eula?lang=en) · [Sketchfab — licencias](https://sketchfab.com/licenses) · [TurboSquid — FAQ de licencia](https://www.turbosquid.com/help/en/articles/9937423-royalty-free-license-faq)
- [Mixamo — subir y riggear personajes](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html) · [Mixamo — FAQ](https://helpx.adobe.com/be_en/creative-cloud/faq/mixamo-faq.html)
- [Fiverr — coste de un artista 3D](https://fiverr.com/resources/guides/costs/3d-sculpting-artist) · [Rocketbrush — precios de arte para juegos](https://rocketbrush.com/blog/game-art-outsourcing-prices-complete-pricing-breakdown) · [Kevuru — diseño de personajes 3D](https://kevurugames.com/3d-character-design/) · [Pixune — coste de modelado 3D](https://pixune.com/blog/how-much-does-3d-art-outsourcing-cost/)
