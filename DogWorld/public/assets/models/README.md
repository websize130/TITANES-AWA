# Modelos 3D profesionales (GLB)

El juego sustituye automáticamente los modelos generados por código por modelos GLB
cuando existen aquí. Si falta un archivo, se usa el modelo procedural.

## Estructura

```
assets/models/
  manifest.json          ← lista de modelos disponibles
  dogs/rufus.glb         ← perros: rufus, rayder, tyson, blizzard, digger, scout, goliath
  npcs/isabel.glb        ← personajes: isabel, cheila, chalai, chukymary, josh, pixelhugo (Pablosky), magaluna
```

## manifest.json

```json
{
  "models": [
    {
      "kind": "dog", "id": "rufus", "file": "dogs/rufus.glb",
      "scale": 1, "rotationY": 0, "yOffset": 0,
      "clips": { "idle": "Idle", "run": "Run", "jump": "Jump", "emote": "Dance", "action": "Bark" },
      "bones": { "head": "Head", "chest": "Spine2", "pelvis": "Hips" }
    },
    {
      "kind": "npc", "id": "isabel", "file": "npcs/isabel.glb",
      "clips": { "idle": "Idle", "wave": "Wave" }
    }
  ]
}
```

- `clips`: nombre real de cada animación dentro del GLB. Si se omite, se buscan nombres que
  contengan `idle`, `run`/`walk`, `jump`, `fall`, `emote`/`dance`, `action`, `wave`.
- `bones`: huesos donde se anclan accesorios y efectos (cabeza, pecho, cadera).
- Escala orientativa: perros ~0.9–1.3 m de alto (Goliath el más grande, Rufus ~0.7 m),
  personajes ~2.1 m. Mirando hacia +Z, pies en y = 0.

## Animaciones necesarias

| Tipo | Obligatorias | Recomendadas |
|---|---|---|
| Perros | idle, run | jump, fall, emote (gesto de personalidad), action (habilidad) |
| Personajes | idle | wave (saludo) |

## Preparar las imágenes para generar el 3D (Meshy u otro)

Las generaciones salen mucho mejor con:
1. **Un solo personaje, cuerpo entero**, de frente o 3/4, sin cortar pies ni sombrero.
2. **Fondo liso** (blanco o gris), sin carteles, logos ni texto.
3. **Pose neutra** para los humanos (brazos algo separados, "A-pose"): facilita el rig automático.
   Los perros, de pie sobre las cuatro patas y de perfil o 3/4.
4. Si es posible, vistas extra (lado y espalda) para el modo multivista.

## Optimizar para web (móviles)

```bash
npx @gltf-transform/cli optimize entrada.glb salida.glb --compress meshopt --texture-compress webp --texture-size 1024
```
Objetivo orientativo por personaje: < 3 MB, < 30 k triángulos, texturas de 1024 px.
