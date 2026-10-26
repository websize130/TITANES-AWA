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
- Datos por titán en `TitanData` (ScriptableObject: vida, velocidad, 4 `AbilityDefinition` con cooldown, cast time, daño, alcance e icono).
- `TitanController` (movimiento, habilidades, vida y estados) solo recibe órdenes por `SetMoveInput` y `BattleEvents.RaiseAbilityCastRequested`:
  jugador e IA lo controlan por la misma vía.
- `ArenaManager`: isla flotante abierta, zonas de spawn tácticas (`SpawnZoneType`), cuenta atrás y derrota por caída (`fallLimitY`).
  Activa `TitanAIController` solo en el titán de `aiControlledTitan` (Magma por defecto) y `PlayerInputController` en el otro.
- `PlayerInputController`: nuevo Input System (`com.unity.inputsystem`). WASD/flechas/stick → `SetMoveInput` (relativo a cámara),
  teclas 1–4 (o botones frontales del mando) → `RaiseAbilityCastRequested`. Acepta `InputActionReference` opcionales.
- `TitanAIController`: observaciones [1, 12] → acciones [1, 6] (movimiento x/z + 4 puntuaciones de habilidad); heurística si no hay modelo.
- `BattleHUD`: barra dividida (Azul izquierda / Rojo derecha, con rastro de daño) y 4 botones con cooldown radial del titán del jugador.

## 3. UnityPerformance60FPS
- Comunicación con `System.Action` / eventos de C# y datos en `ScriptableObject`.
- **Prohibido** `new` (asignaciones en heap) y `GetComponent` dentro de `Update()`, `LateUpdate()` y `FixedUpdate()`.
  Cachear referencias en `Awake()`; usar structs `readonly` para payloads de eventos.
- Nada de LINQ, closures, `string` concatenado ni `FindObjectOfType` en caminos calientes.
- Evitar eventos por frame: publicar cambios de estado (p. ej. inicio de cooldown con su duración) y que la UI interpole.

## 4. AntiPrimitivePBR
- Prohibido usar bloques, cubos o primitivas de Unity como arte final.
- Render pipeline: **HDRP** (alta fidelidad). Mallas 3D estilizadas con materiales PBR (HDRP/Lit) y canales emissive
  (hielo azul brillante, magma incandescente). Prefabs en `Assets/Prefabs/Titans` y `Assets/Prefabs/Environment`.

## 5. HuggingFaceSentis — IA táctica del titán enemigo
- Modelos ONNX de código abierto de Hugging Face (o políticas ML-Agents exportadas a ONNX) en `Assets/ML-Models/`,
  ejecutados **localmente** con Unity Sentis (`com.unity.sentis`; en Unity 6.2+ se llama Inference Engine, `com.unity.ai.inference`).
- Paquete `huggingface/unity-api` (instalar por Git URL `https://github.com/huggingface/unity-api.git`) solo para llamadas
  remotas a la Inference API: siempre asíncronas, nunca dentro del bucle de combate ni en `Update()`.
  El token de API se configura en el editor y **nunca** se commitea.
- La inferencia se activa con el define `TITANES_SENTIS` (Sentis 2.x) o `TITANES_INFERENCE_ENGINE` (Unity 6.2+);
  sin define el proyecto compila y la IA usa la heurística.
- La IA no mueve al titán directamente: usa `TitanController.SetMoveInput` y `BattleEvents.RaiseAbilityCastRequested`.
- Inferencia sin basura: crear el `Worker` y los tensores una sola vez (`Awake`), reutilizarlos, ejecutar a frecuencia fija
  de decisión (5–10 Hz), no cada frame, y liberar con `Dispose()` en `OnDestroy`.
- Comprobar la licencia del modelo (Apache-2.0/MIT) antes de incluirlo; los `.onnx` grandes van con Git LFS.

## 6. SecretsAndTokens — Tokens, secretos e integraciones
- **Nunca** commitear tokens, claves de API ni credenciales (GitHub PAT, token de Hugging Face, etc.), ni en código,
  ni en `ScriptableObject`, ni en escenas/prefabs, ni en archivos de configuración versionados.
- Los secretos viven solo en configuración local fuera del repo (preferencias del editor, variables de entorno,
  `~/.claude.json` / configuración local de Claude Code). Si un secreto se filtra en un commit, revocarlo de inmediato;
  reescribir el historial no basta.
- GitHub en sesiones de Claude Code en la nube: usar la integración nativa (herramientas `mcp__github__*`), que ya está
  autenticada. No ejecutar `claude mcp add github …` en el contenedor ni introducir un PAT en él.
- GitHub en Claude Code local: usar el servidor oficial remoto
  (`claude mcp add --transport http github https://api.githubcopilot.com/mcp/ -H "Authorization: Bearer <PAT>"`),
  no el paquete obsoleto `@modelcontextprotocol/server-github`. El PAT queda solo en la configuración local del usuario.

## Estructura
```
Assets/Scripts/Core               Sistemas centrales y eventos de batalla
Assets/Scripts/Titans             Lógica de los titanes (vida, habilidades)
Assets/Scripts/UI                 Barra dividida, botones de habilidad y cooldowns
Assets/Scripts/ScriptableObjects  Definiciones de datos (stats, habilidades)
Assets/Prefabs/Titans             Prefabs de los titanes (TitanController + malla HDRP)
Assets/Prefabs/Environment        Isla flotante y elementos del mapa
Assets/ML-Models                  Modelos ONNX para Sentis
```
