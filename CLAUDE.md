# TITANES-AWA — Reglas permanentes del proyecto

Juego de combate de titanes en Unity (C#). Estas reglas aplican a todo el código y contenido generado.

## 1. CleanCodeArchitect
- C# desacoplado: los sistemas se comunican mediante eventos, no mediante referencias directas entre sí.
- Una responsabilidad por clase. Namespaces bajo `TitanesAwa.*` (`Core`, `Titans`, `UI`, `ScriptableObjects`).
- Dependencias por inyección en el Inspector (`[SerializeField] private`), nunca `public` para campos.

## 2. MemoryPersistence — Arquitectura del MVP (no cambiar sin aprobación)
- Dos titanes: **Titán de Escarcha** (`TitanId.Frost`) vs **Titán de Magma** (`TitanId.Magma`).
- UI: barra de vida dividida **Azul (Escarcha) / Rojo (Magma)**.
- Cada titán tiene **4 habilidades con cooldown** (slots 0–3).
- Bus de eventos central: `Assets/Scripts/Core/BattleEvents.cs` (ScriptableObject de canal de eventos).

## 3. UnityPerformance60FPS
- Comunicación con `System.Action` / eventos de C# y datos en `ScriptableObject`.
- **Prohibido** `new` (asignaciones en heap) y `GetComponent` dentro de `Update()`, `LateUpdate()` y `FixedUpdate()`.
  Cachear referencias en `Awake()`; usar structs `readonly` para payloads de eventos.
- Nada de LINQ, closures, `string` concatenado ni `FindObjectOfType` en caminos calientes.
- Evitar eventos por frame: publicar cambios de estado (p. ej. inicio de cooldown con su duración) y que la UI interpole.

## 4. AntiPrimitivePBR
- Prohibido usar bloques, cubos o primitivas de Unity como arte final.
- Mallas 3D estilizadas con materiales PBR (URP/Lit) y canales emissive (hielo azul brillante, magma incandescente).

## Estructura
```
Assets/Scripts/Core               Sistemas centrales y eventos de batalla
Assets/Scripts/Titans             Lógica de los titanes (vida, habilidades)
Assets/Scripts/UI                 Barra dividida, botones de habilidad y cooldowns
Assets/Scripts/ScriptableObjects  Definiciones de datos (stats, habilidades)
```
