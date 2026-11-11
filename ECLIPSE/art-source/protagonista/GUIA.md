# Protagonista — Guía visual y técnica

Referencia artística principal: `referencia/hoja-de-personaje.png`
(recortes por vista en `referencia/recortes/`). Esta carpeta es material de
trabajo: **no** se publica con el juego (Vite solo sirve `public/`).

## 1. Identidad visual (fija)

| Elemento | Definición |
|---|---|
| Armadura | Gótica de placas negras y acero envejecido; grabados y filos plateados gastados. |
| Silueta | Imponente; hombreras angulosas con puntas, cintura estrecha, faldón de placas en V. |
| Casco | Cerrado, con corona de puntas metálicas irregulares (más altas en el centro y laterales). |
| Visor | Rendija con luz violeta tenue (emisivo, nunca blanco). |
| Capa | Larga hasta los tobillos, negra con reflejos violetas, bordes desgarrados en jirones. |
| Espada | Larga (≈ 1,3 m), hoja oscura con runas violetas, guarda con puntas, empuñadura ornamentada y pomo en rombo. |
| Paleta | Negro `#0b0910`, acero `#8d8a93`, plata gastada `#c9c3cf`, violeta runa `#8f5bff`. |
| Tono | Amenazante, elegante, legendario. |

## 2. Reglas de consistencia

1. Mismas proporciones y geometría en todas las vistas: es **un único modelo 3D**.
2. Casco, armadura, capa y espada no cambian entre ángulos ni entre niveles de detalle (solo pierden polígonos).
3. Respetar los detalles de la referencia: corona del casco, hombreras, placa pectoral en V, faldón, desgarros de la capa.
4. Nada de caballero medieval genérico (sin cota de malla brillante, sin escudo, sin colores heráldicos).
5. No añadir elementos que contradigan el diseño (sin pelo visible, sin piel, sin colores fuera de la paleta).
6. Validación: se renderiza el modelo en vista frontal, lateral y trasera y se compara con `referencia/recortes/vista-*.png`.

## 3. Especificación técnica del modelo final (contrato con el código)

| Aspecto | Valor |
|---|---|
| Formato | glTF binario (`.glb`), validado con `npm run model:validate` |
| Unidades / ejes | Metros, Y arriba, el personaje mira hacia +Z |
| Altura | 1,90 m hasta la frente del casco (≈ 2,0 m con la corona) |
| Origen | Entre los pies, a nivel del suelo |
| Pose de rig | A-pose / T-pose, sin espada en la mano |
| Esqueleto | Nombres Mixamo (`mixamorig:Hips`… en Three.js: `mixamorigHips`) |
| Huesos de capa | `cape_L_0..3`, `cape_C_0..4`, `cape_R_0..3` hijos de `mixamorigSpine2` |
| Puntos de anclaje | `socket_weapon_r` (hijo de `mixamorigRightHand`), `socket_back` (hijo de `mixamorigSpine2`) |
| Mallas | `armor` (material `M_Armor`), `cape` (`M_Cape`, doble cara, alpha test), `visor` (`M_Visor`, emisivo) |
| Espada | Archivo aparte; empuñadura en el origen, hoja hacia +Y; materiales `M_Blade` y `M_Runes` (emisivo) |
| Animaciones (en el sitio, sin desplazamiento) | `idle`, `walk`, `run`, `attack_1`, `attack_2`, `attack_3`, `dodge_roll`, `block_idle`, `block_hit`, `hit_react`, `death` |

### Niveles de detalle

| Archivo | Triángulos personaje | Espada | Texturas | Física de capa |
|---|---|---|---|---|
| `protagonista_high.glb` | ~35 000 | ~4 000 | 2048 | 3 cadenas, 4–5 huesos |
| `protagonista_medium.glb` | ~18 000 | ~2 000 | 1024 | 3 cadenas, 4 huesos |
| `protagonista_low.glb` | ~8 000 | ~1 000 | 512 | sin física (solo animación) |

Destino final: `public/models/protagonista/` y `public/models/armas/`.

## 4. Fase 1 — Generar el modelo base con TRELLIS (desde la tablet)

TRELLIS es de Microsoft, licencia MIT (código y modelo). Genera una malla 3D
texturizada a partir de imágenes. Las entradas ya están preparadas en
`entrada-generador/` (fondo uniforme, 1024 × 1024).

1. En Chrome Android abre `huggingface.co/spaces/microsoft/TRELLIS` y activa
   **"Sitio de ordenador"** en el menú ⋮ (la interfaz es más cómoda).
   Si existe `microsoft/TRELLIS.2`, comprueba que su licencia sea MIT y úsalo:
   es la versión más reciente.
2. Inicia sesión con una cuenta gratuita de Hugging Face (da más tiempo de GPU).
3. **Personaje:**
   - Pestaña de imágenes múltiples (*Multiple Images*), si está disponible:
     sube `1-personaje-frontal.png`, `2-personaje-lateral.png` y
     `3-personaje-trasera.png`.
   - Si no, imagen única con `1-personaje-frontal.png`.
   - Deja los ajustes por defecto, pulsa **Generate** y revisa la vista previa.
   - En la extracción a GLB: *Simplify* 0.95 y *Texture size* **2048**
     (o el máximo disponible). Pulsa **Extract GLB** y descárgalo.
   - Repite con 2–3 semillas (*Seed*) distintas y guarda las mejores.
4. **Espada:** imagen única con `4-espada.png`, mismos pasos.
5. Nombres: `personaje_semilla<N>.glb`, `espada_semilla<N>.glb`.
6. Súbelos a GitHub: repositorio `titanes-awa`, rama
   `claude/eclipse-dev-setup-w7mnoj`, carpeta
   `ECLIPSE/art-source/protagonista/generado/` (botón **Add file → Upload
   files**, en modo ordenador; máximo 25 MB por archivo).

Qué revisar antes de subir: que tenga la corona del casco, las hombreras con
puntas y la capa desgarrada; que no salgan dos cabezas, brazos fundidos con la
capa ni la espada pegada al cuerpo.

## 5. Fase 2 — Procesado (lo hago yo, en la nube)

Blender sin interfaz (4.0 de Ubuntu o `bpy` 5.3 de PyPI) + glTF-Transform:
escala y orientación, limpieza de geometría, reducción de polígonos, separación
de capa, horneado de mapa normal y canales PBR (metal/rugosidad), y exportación
de un FBX preparado para Mixamo.

## 6. Fase 3 — Rig y animaciones en Mixamo (tú, en el navegador)

1. `mixamo.com` en modo ordenador, con cuenta gratuita de Adobe.
2. **Upload Character** → sube el FBX que te preparo.
3. Coloca los marcadores (barbilla, muñecas, codos, rodillas, ingle);
   *Skeleton LOD*: **Standard Skeleton (65)**.
4. Descarga cada animación en **FBX Binary**, **Without Skin** (salvo la
   primera, *With Skin*), 30 fps, con **In Place** marcado. Lista y nombres de
   archivo en la tabla del apartado 3 (busca en Mixamo el paquete de espadón o
   *great sword*).
5. Súbelas a `ECLIPSE/art-source/protagonista/mixamo/`.

## 7. Fases 4–6 (yo)

Conversión a GLB, huesos y pesos de la capa, anclajes de espada, niveles de
detalle, compresión, integración en el juego y comparación con la referencia.
