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

- **3 forajidos** con dossier de origen en viñetas y pasiva única: Silas "El Tuerto" O'Connor (críticos a distancia,
  resistencia), Maeve "La Sota de Picas" Duprat (control, suerte en cartas, sin sombra) y Caleb Blackwood (tanque de
  corta distancia, trampas letales).
- **Niveles 1–50 por forajido** (XP por bajas, rondas y casos cerrados). Hitos: 10 aspecto · 20 arma · 30 aspecto ·
  40 arma · 50 aspecto legendario.
- **Cartas** de Bronce, Plata, Oro, Platino y Diamante: pasivas o de acción (mano de 3 cartas con recarga, teclas 1·2·3).
  Las de Diamante dan una Bendición enorme y una Maldición temporal (lentitud o vulnerabilidad).
- **Modo Historia**: 6 casos con página de cómic de apertura, bocadillos en combate y viñeta final con sello
  "CASO CERRADO" o "FINAL TRÁGICO".
- **El Cruce de los Condenados**: supervivencia infinita. Rondas 1–3 de adaptación, salto brutal en la 4, colosos de
  élite desde la 6 (El Capataz de la Mina, El Predicador sin Rostro, La Bestia de la Ciénaga) y muro infernal desde la 10.
  Récords en **El Muro de los Condenados** y Game Over como portada pulp.
- **Trampas y destructibles**: cepos ocultos, faroles de gas que incendian el suelo, barriles de dinamita en cadena y
  coberturas que se astillan por fases.

## Controles

PC: WASD/flechas · disparo automático (o con ratón en Ajustes) · 1·2·3 o Q·E·R cartas · clic derecho carta 1 · Esc pausa.
Móvil: arrastra en cualquier punto (joystick translúcido) · toca las cartas de la esquina.
