# WEIRD WEST: SOMBRAS DE TINTA

Acción y supervivencia cenital en un Oeste gótico con estética de **cómic de terror de los 90**: claroscuro,
tinta gruesa, semitono y sombreado cruzado. Todo el arte es procedural (Canvas 2D); no hay imágenes.

**Entregable: un único archivo HTML autocontenido → `dist/index.html`.** Ábrelo con doble clic o súbelo a Netlify.
Este directorio es independiente del proyecto Unity de TITANES-AWA.

## Jugar / desplegar

- Local: abre `dist/index.html` en Chrome, Edge o Firefox (funciona desde `file://`).
- Netlify: *Base directory* `SombrasDeTinta` (incluye `netlify.toml`: publica `dist/`), o arrastra `dist/` a Netlify Drop.
- Las fuentes (Holtwood One SC y Courier Prime) vienen de Google Fonts; sin conexión se usan fuentes de respaldo.

## Desarrollo

El código vive en módulos ES dentro de `src/` y se empaqueta sin dependencias:

```bash
node tools/build.js      # genera dist/index.html (falla si dos módulos repiten un nombre de nivel superior)
```

```
src/core   save (niveles 1–50, hitos, historia, récords) · input · audio procedural
src/data   heroes (3 forajidos, armas, aspectos, frases) · cards (Bronce→Diamante) · enemies · story
src/art    ink (tinta, semitono, cross-hatching, sellos) · heroArt · zombieArt · worldArt (trampas y coberturas)
           cardArt (marcos por rareza) · comicPage (viñetas, cartelas, bocadillos, portada pulp) · sprites
src/game   engine · combat · ai (horda y colosos) · traps · modes (historia / supervivencia) · render (claroscuro) · hud
src/ui     index.html · style.css · main.js
```

## Contenido

- **La Cuadrilla de los 4 Condenados**, cada uno con personalidad propia en sus bocadillos:
  - Silas "El Tuerto" O'Connor: mal genio, escopeta de cono corto, frases cínicas. Pasiva *Mal Genio* (+35% de daño
    con menos de media vida, resistencia, trampas).
  - Maeve "La Sota de Picas" Duprat: alocada, ráfagas de naipes explosivos, humor de tahúr. Pasiva *Mano Marcada*.
  - Caleb Blackwood: poeta melancólico, rifle monotiro pesado de precisión, versos lúgubres. Pasiva *Elegía*.
  - Barnaby "Tripas" McGovern: humor negro, revólveres duales, chistes macabros que **aterran** a la horda cercana.
- **Alcance limitado**: cada arma dispara a corta/media distancia (anillo de tinta en el suelo). Solo las cartas de
  largo alcance (Ojo de Halcón, Catalejo de Latón, Ojo del Cíclope) lo amplían. Las armas tienen cargador y recarga.
- **Cartas de tarot** (Bronce, Plata, Oro, Platino, Diamante) con bordes a plumilla y materia por rareza; elevación y
  sombra al pasar el cursor y estallido de tinta y pólvora al jugarlas. Las **cartas modificadoras de arma** cambian la
  balística real: perforación, plomo incendiario (daño por segundo), cargador y recarga, disparos en área y metralla.
- **Póker de tinta**: la horda suelta naipes; al reunir 5 se evalúa la mano (Pareja, Doble Pareja, Trío, Escalera,
  Color, Full, Póker) y se desata una ráfaga de furia temporal.
- **La Plaga**: Errantes, Corredores, Hinchados, Acorazados, Horqueros, Dinamiteros, **Sabuesos de Tinta** (zig-zag,
  flanqueo y mordisco que aturde 1 s), **Arañas de Cripta** (enjambres que dejan tinta pegajosa que ralentiza) y
  **Abominaciones** (caparazón blindado, escupen bilis de tinta en cono). Más 3 Colosos de Élite.
- **Modo Historia**: 6 casos con página de cómic, bocadillos y viñeta final ("CASO CERRADO" / "FINAL TRÁGICO").
- **El Cruce de los Condenados**: rondas de **120 s exactos** — 0–30 s aclimatación, 30–60 s presión de arañas,
  60–105 s clímax de colosos y horda masiva, 105–120 s fiebre final "Último Cartucho". Entre rondas la dificultad sube
  (salto en la 4, colosos de élite desde la 6, muro infernal desde la 10). Récords en el Muro de los Condenados.
- **Mundo de 3× el viewport** (pueblo, cementerio y mina unidos por un camino), cámara de seguimiento suave con
  anticipación y minimapa. Destructibles: faroles colgantes que incendian el suelo, barricadas con fases (intacta,
  astillada, humeante), lápidas de cobertura, barriles de dinamita y cepos ocultos.
- **Estética de novela gráfica noir de los 90**: doble línea de contorno, sombras angulares de alto contraste, trama
  de semitono y *rim-light* por forajido (ámbar, cobre o plata). Los forajidos están **articulados por capas**
  (piernas, torso y brazo del arma): zancada desde la cadera, apuntado desde el hombro y retroceso al disparar.
- **3 aspectos por forajido**: *Base* (desde el inicio), *Veterano* (nivel 10 o 3 casos cerrados; desgaste y detalles
  tácticos) y *Legendario/Condenado* (nivel 30 o sobrevivir a la ronda 8; tinta densa, brasas y marcas especiales).
- **La Armería del Oeste Oculto**: 23 armas ordenadas estrictamente de menor a mayor daño en 4 categorías (Mano y
  Precisión · Metralletas y Fuego Rápido · Experimentales y Láseres · Únicas/Legendarias ligadas a cada forajido).
  Los láseres atraviesan hordas y funden la coraza de los colosos. Se paga con **Oro Maldito** que suelta la horda.
- **Artefactos y sinergias elementales**: balas explosivas, dinamita de proximidad, bobinas Tesla, rayos y frascos de
  ácido. Tinta/ácido + fuego = **explosión de pólvora** con muro de llamas; charcos de araña + rayo = **sobrecarga
  eléctrica en cadena**.
- **Clima dinámico**: *Eclipse de Sangre y Tinta* (oscuridad parcial, halos de luz, recarga potenciada) y *Tormenta de
  Ceniza y Pólvora* (el viento arrastra y propaga el fuego, más alcance incendiario).
- **Jefes de zona**: *El Predicador de la Peste* (resucita a los caídos mientras arda su farol: rómpeselo) y *El
  Engendro de la Mina* (gira despacio; rodéalo y dispara a la dinamita de su espalda para exponer su punto débil).
- **Diálogos de cómic**: un solo canal sin solapamientos, duración adaptativa de 4,5–6 s, texto que corre como tinta,
  bocadillo de pergamino (forajido) o tinta oscura (horda), borde a plumilla, rabillo que sigue al personaje y palabras
  clave resaltadas en color.
- **Música por capas** (guitarras western tensas → percusión pesada y bajo distorsionado con la horda), onomatopeyas
  (¡BLAM!, ¡CRACK!, ¡ZAP!, ¡KABOOM!) y **HUD diegético** de hierro oxidado, cuero cosido y pergamino quemado.
- **Curva de dificultad progresiva**: arranque suave solo con errantes lentos; después arañas, sabuesos y, como clímax,
  colosos acorazados y hordas masivas.
- **Niveles 1–50 por forajido**.

## Controles

PC: WASD/flechas · disparo automático dentro del alcance (o con ratón en Ajustes) · 1·2·3 o Q·E·R cartas · clic derecho carta 1 · Esc pausa.
Móvil: arrastra en cualquier punto (joystick translúcido) · toca las cartas de la esquina.
