# DUST & BLOOD: WEIRD WEST SURVIVOR

Horde-survival cenital en un Oeste Oculto (pólvora, magia negra y forajidos malditos) con estética de novela
gráfica oscura de los 90. HTML5 Canvas 2D puro, módulos ES, **sin build** y **sin imágenes estáticas**: todo el arte
(cartas, héroes, enemigos, jefes, escenarios, iconos) lo genera el `ComicArtRenderer` en tiempo real.

Este directorio es independiente del proyecto Unity de TITANES-AWA.

## Arrancar en local

```bash
cd DustAndBlood
python3 -m http.server 8080      # o: npx serve .
# abrir http://localhost:8080
```

Los módulos ES necesitan servirse por HTTP (no abrir `index.html` con `file://`).
En `localhost`, `?gold=5000` añade oro para pruebas.

## Desplegar en Netlify

1. Nuevo sitio desde Git → **Base directory**: `DustAndBlood` · **Publish directory**: `.` · sin comando de build.
   (Alternativa: arrastrar la carpeta `DustAndBlood` a Netlify Drop.)
2. `netlify.toml` ya incluye cabeceras de seguridad y caché.

## AdSense (solo en menús)

1. Edita `js/config.js`: pon tu `ca-pub-…` real y los IDs de slot de cada pantalla (`main`, `map`, `armory`, `summary`).
   Mientras el ID contenga `XXXX` no se carga el script y se muestran huecos de ejemplo.
2. Añade tu `ads.txt` en esta carpeta (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
3. Los anuncios solo existen en Menú Principal, Mapa de Misiones, Armería y Resumen de Misión.

### `inGameLock`

Al iniciar una misión (`js/core/adlock.js`):

- `<html>` recibe la clase `in-game-lock`; el CSS fuerza `display:none !important; visibility:hidden` sobre
  `ins.adsbygoogle`, anuncios automáticos (`.google-auto-placed`, `aswift`, anclas, viñetas) y badges/drawers/iframes
  de Netlify; además se oculta toda la interfaz de menús.
- Cada nodo coincidente recibe además estilos inline `!important`, y un `MutationObserver` oculta lo que se
  inyecte tarde (anuncios automáticos, drawer de previsualización de Netlify).
- El lienzo ocupa el 100% de la pantalla (`z-index` máximo). Al terminar la misión se revierte todo.
- `adsbygoogle.push()` nunca se llama durante la partida.

## Controles

| PC | Móvil / tablet |
|---|---|
| WASD / flechas: moverse | Arrastra en cualquier punto: joystick virtual transparente |
| Ratón: apuntar (o automático, en Ajustes) | Apuntado automático al enemigo más cercano |
| Disparo automático | Disparo automático |
| Q / Shift / clic derecho: habilidad del héroe | Botón de habilidad (abajo derecha) |
| Espacio / E: desatar la **Racha de Pólvora** | Botón ★ |
| Esc / P: pausa | Botón ‖ |

## Contenido

- **4 héroes** (Cartas Vivas con paralaje, humo y ascuas) × **3 skins** del Guardarropa Maldito (base, 800 y 2.000 monedas)
  que cambian colores, aura, partículas y disparos en la carta y en partida.
- **Racha de Pólvora**: barra que se llena encadenando bajas y se vacía si dejas de matar. Por tramos multiplica el
  oro recogido (x1.5 · x2 · x3); llena, desata la definitiva del héroe (Juicio del Exterminador, Lluvia de Fuego
  Fatuo, Bombardeo de Dinamita, Ojo de la Muerte).
- **Campaña**: 4 escenarios, 22 misiones (sobrevivir, destruir tótems/altar, defender saloon/taladro, purificar lápidas,
  cazar élites, recoger cristales, defender el puente, oleada infinita) y 4 jefes con patrones y fases.
  Modificadores: noche, niebla, luna de sangre, meteoritos, vagonetas, tormenta, sin curaciones.
- **Bestiario**: Forajido Putrefacto, Minero Maldito (explota), Chamán Corrupto, Sabueso del Desierto (manadas),
  Francotirador Espectral (mira láser desde el borde) y los Jinetes del Apocalipsis.
- **Armería**: 6 armas con 5 niveles cada una. Solo Monedas de Oro Maldito; sin pasarelas de pago.
- **Mejoras por nivel** dentro de la partida (elige 1 de 3).
- Guardado automático en `localStorage` (`dustblood.save.v1`).

## Arquitectura

```
index.html, css/style.css
js/config.js            IDs de AdSense
js/main.js              Menús, Cartas Vivas, mapa, armería, resumen, arranque de partida
js/core/                save (localStorage) · adlock (inGameLock + AdSense) · input · audio (WebAudio procedural)
js/data/                héroes y skins · armas · enemigos y jefes · campaña
js/art/                 comic (primitivas de tinta) · heroArt · enemyArt · propArt · cards (VanguardCardRenderer) · spriteCache
js/game/                game (bucle, daño, botín, racha) · combat · ai · missions · render · hud · pool
```

Rendimiento (objetivo 60 FPS): sprites pre-renderizados por misión, pools densos sin asignaciones en caliente,
rejilla espacial para colisiones, lotes de sombras, brillos aditivos cacheados y textos del HUD memorizados.
