# ECLIPSE: The Fallen Kingdom

Action RPG 3D en tercera persona para navegador (Android incluido), hecho con
**Three.js + Vite + ES Modules**. Este directorio contiene, de momento, solo el
**entorno de desarrollo** y una escena de prueba; el juego aún no está empezado.

## Versiones instaladas y verificadas

| Herramienta | Versión | Uso |
|---|---|---|
| Node.js / npm (entorno cloud) | 22.23.4 / 10.9.9 | Ejecutar Vite y herramientas |
| three | 0.187.0 (r187) | Render 3D WebGL 2 |
| GLTFLoader, DRACOLoader, SkeletonUtils, OrbitControls, HDRLoader | incluidos en three | Modelos, compresión, personajes animados |
| vite | 8.3.7 | Servidor de desarrollo y build |
| lil-gui | 0.21.0 | Panel de depuración (`?debug`) |
| @gltf-transform/cli | 4.5.1 | Inspeccionar, validar y optimizar GLB |

## Comandos

```bash
npm install          # instala dependencias
npm run check        # comprueba Node, paquetes e import de three
npm run dev          # servidor de desarrollo → http://localhost:5173
npm run build        # build de producción en dist/
npm run preview      # sirve dist/ → http://localhost:4173

npm run model:inspect  -- public/models/x.glb              # tamaño, mallas, texturas
npm run model:validate -- public/models/x.glb              # validador glTF de Khronos
npm run model:optimize -- entrada.glb public/models/x.glb  # DRACO + texturas WebP
```

## Parámetros de URL

- `?debug` — panel lil-gui (perfil gráfico, exposición, luces, HUD).
- `?gfx=low|medium|high` — fuerza un perfil gráfico.

## Perfiles gráficos (`src/core/GraphicsProfiles.js`)

| | Bajo | Medio | Alto |
|---|---|---|---|
| Límite FPS | 30 | 60 | 60 |
| pixelRatio máx. (mín. dinámico) | 1 (0.6) | 1.5 (0.75) | 2 (1) |
| Sombras | no | PCF 1024 | PCF 2048 |
| Antialias MSAA | no | no | sí (si el hardware lo soporta) |
| Reflejos de entorno PBR | no | sí | sí |
| Anisotropía | 1 | 4 | 8 |

Selección automática: en móvil/tablet nunca se elige "Alto" (≤4 GB RAM → Bajo, si
no → Medio); en escritorio → Alto. La elección manual se guarda en `localStorage`.

Protecciones para Android: resolución dinámica según FPS, límite de FPS, pausa
del bucle al ocultar la pestaña, recuperación de pérdida de contexto WebGL,
`touch-action: none` y lil-gui cargado solo con `?debug`.

## Estructura

```
src/core/      Renderer (WebGL 2 + perfiles), Loop, AssetLoader, capacidades, dispose()
src/world/     TestScene.js (escena de verificación, se sustituirá)
src/camera/    Cámara + OrbitControls (temporal hasta la cámara en 3ª persona)
src/ui/        HUD, panel de depuración, estilos
src/player, combat, enemies, bosses, effects, audio, controls, systems   (vacíos)
public/models, textures, audio, environments                             (vacíos)
```

Los archivos de `public/` se sirven tal cual: `public/models/heroe.glb` se carga
como `assets.loadGLTF('models/heroe.glb')`. Para personajes con esqueleto usa
`assets.instantiateCharacter(url)` (usa SkeletonUtils.clone).

## Herramientas externas

| Herramienta | Desde Android | Notas |
|---|---|---|
| **Poly Haven** | ✅ navegador | CC0. Descarga HDRI en `.hdr` 1k/2k para móvil y texturas 1k/2k. |
| **Sketchfab** | ✅ navegador | Revisa la licencia de cada modelo (CC0, CC-BY → hay que acreditar, evita NC si vas a vender). Descarga en glTF/GLB. |
| **Mixamo** | ⚠️ navegador en modo escritorio | Cuenta Adobe gratuita. Exporta FBX; conviértelo a GLB (Blender o FBX2glTF) o cárgalo con `FBXLoader`. Gratuito pero no es código abierto. |
| **Godot** | ✅ app Android oficial / editor web | Alternativa para la versión instalable; no reutiliza el código Three.js. |
| **Blender** | ❌ necesita ordenador | No existe versión Android. Alternativa: pedir a Claude Code que procese modelos con gltf-transform en la nube. |
