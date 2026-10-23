// Define TITANES_SENTIS (com.unity.sentis 2.x) o TITANES_INFERENCE_ENGINE (com.unity.ai.inference, Unity 6.2+)
// en Player Settings > Scripting Define Symbols para activar la inferencia ONNX. Sin ellos se usa la heurística.
#if TITANES_SENTIS || TITANES_INFERENCE_ENGINE
#define TITANES_ML
#endif

using TitanesAwa.Core;
using TitanesAwa.ScriptableObjects;
using UnityEngine;
#if TITANES_SENTIS
using Unity.Sentis;
#elif TITANES_INFERENCE_ENGINE
using Unity.InferenceEngine;
#endif

namespace TitanesAwa.Titans
{
    /// <summary>
    /// IA táctica del titán enemigo. A frecuencia fija de decisión observa el combate (distancia, vida,
    /// cooldowns, borde de la isla) y decide movimiento y habilidad con una política ONNX ejecutada en local
    /// (Sentis / Inference Engine) o, si no hay modelo, con una heurística equivalente.
    /// Actúa por la misma vía que el jugador: <see cref="TitanController.SetMoveInput"/> y
    /// <see cref="BattleEvents.RaiseAbilityCastRequested"/>.
    /// </summary>
    [RequireComponent(typeof(TitanController))]
    public sealed class TitanAIController : MonoBehaviour
    {
        /// <summary>
        /// 0 vida propia, 1 vida rival, 2 distancia normalizada, 3-4 dirección al rival (x, z),
        /// 5-8 habilidades listas, 9 lanzando, 10 cercanía al borde, 11 rival lanzó hace poco.
        /// </summary>
        public const int ObservationSize = 5 + BattleEvents.AbilitySlotCount + 3;

        /// <summary>0-1 movimiento (x, z) en [-1, 1], 2-5 puntuación de cada habilidad.</summary>
        public const int ActionSize = 2 + BattleEvents.AbilitySlotCount;

        private const float OpponentCastMemory = 1f;

        [SerializeField] private BattleEvents battleEvents;

#if TITANES_ML
        [Tooltip("Política ONNX con entrada [1, 12] y salida [1, 6]. Vacío = heurística.")]
        [SerializeField] private ModelAsset policyModel;
#endif

        [Header("Decisión")]
        [SerializeField, Range(1f, 30f)] private float decisionsPerSecond = 8f;
        [SerializeField, Range(0f, 1f)] private float castThreshold = 0.5f;
        [Tooltip("Retraso de reacción al empezar el combate.")]
        [SerializeField, Min(0f)] private float reactionDelay = 0.4f;

        [Header("Heurística (sin modelo)")]
        [SerializeField, Range(0f, 1f)] private float retreatHealthRatio = 0.3f;
        [SerializeField, Range(0.5f, 1f)] private float edgeDangerRatio = 0.85f;
        [SerializeField, Range(0f, 1f)] private float strafeWeight = 0.35f;
        [SerializeField, Range(0f, 1f)] private float strafeFlipChance = 0.1f;

        private readonly float[] observations = new float[ObservationSize];
        private readonly float[] actions = new float[ActionSize];

        private TitanController titan;
        private Transform cachedTransform;
        private ArenaManager arena;

        private float nextDecisionTime;
        private float ownHealth = 1f;
        private float opponentHealth = 1f;
        private float opponentLastCastTime = float.NegativeInfinity;
        private float strafeSign = 1f;

        private float distanceToOpponent;
        private float edgeRatio;
        private Vector3 toOpponentDir;
        private Vector3 toCenterDir;
        private Vector3 desiredMove;
        private Vector2 moveCommand;

#if TITANES_ML
        private Worker worker;
        private Tensor<float> inputTensor;
#endif

        private void Awake()
        {
            titan = GetComponent<TitanController>();
            cachedTransform = transform;

#if TITANES_ML
            if (policyModel != null)
            {
                Model model = ModelLoader.Load(policyModel);
                // Política pequeña: la CPU evita lecturas GPU->CPU y permite leer la salida sin asignaciones.
                worker = new Worker(model, BackendType.CPU);
                inputTensor = new Tensor<float>(new TensorShape(1, ObservationSize));
            }
#endif
        }

        private void OnEnable()
        {
            battleEvents.HealthChanged += HandleHealthChanged;
            battleEvents.AbilityCast += HandleAbilityCast;
            battleEvents.BattleStateChanged += HandleBattleStateChanged;
        }

        private void OnDisable()
        {
            battleEvents.HealthChanged -= HandleHealthChanged;
            battleEvents.AbilityCast -= HandleAbilityCast;
            battleEvents.BattleStateChanged -= HandleBattleStateChanged;
            titan.SetMoveInput(Vector2.zero);
        }

        private void OnDestroy()
        {
#if TITANES_ML
            worker?.Dispose();
            inputTensor?.Dispose();
#endif
        }

        /// <summary>Llamado por el ArenaManager al instanciar el titán.</summary>
        public void Initialize(ArenaManager arenaManager)
        {
            arena = arenaManager;
        }

        private void Update()
        {
            if (arena == null || !titan.IsInitialized || titan.Opponent == null
                || battleEvents.CurrentState != BattleState.Fighting || titan.State == TitanState.Defeated)
            {
                return;
            }

            float now = Time.time;
            if (now < nextDecisionTime)
            {
                return;
            }

            nextDecisionTime = now + 1f / decisionsPerSecond;
            CollectObservations(now);
            if (!TryRunModel())
            {
                RunHeuristic();
            }

            ApplyActions();
        }

        private void CollectObservations(float now)
        {
            Vector3 position = cachedTransform.position;
            float radius = arena.PlayableRadius;

            toOpponentDir = titan.Opponent.position - position;
            toOpponentDir.y = 0f;
            distanceToOpponent = toOpponentDir.magnitude;
            toOpponentDir = distanceToOpponent > 0.001f ? toOpponentDir / distanceToOpponent : Vector3.zero;

            toCenterDir = arena.IslandCenter - position;
            toCenterDir.y = 0f;
            float distanceToCenter = toCenterDir.magnitude;
            toCenterDir = distanceToCenter > 0.001f ? toCenterDir / distanceToCenter : Vector3.zero;
            edgeRatio = Mathf.Clamp01(distanceToCenter / radius);

            observations[0] = ownHealth;
            observations[1] = opponentHealth;
            observations[2] = Mathf.Clamp01(distanceToOpponent / (2f * radius));
            observations[3] = toOpponentDir.x;
            observations[4] = toOpponentDir.z;
            for (int i = 0; i < BattleEvents.AbilitySlotCount; i++)
            {
                observations[5 + i] = titan.IsAbilityReady(i) ? 1f : 0f;
            }

            observations[9] = titan.State == TitanState.Casting ? 1f : 0f;
            observations[10] = edgeRatio;
            observations[11] = now - opponentLastCastTime < OpponentCastMemory ? 1f : 0f;
        }

        private bool TryRunModel()
        {
#if TITANES_ML
            if (worker == null)
            {
                return false;
            }

            for (int i = 0; i < ObservationSize; i++)
            {
                inputTensor[0, i] = observations[i];
            }

            worker.Schedule(inputTensor);
            Tensor<float> output = worker.PeekOutput() as Tensor<float>;
            if (output == null || output.shape.length < ActionSize)
            {
                return false;
            }

            output.CompleteAllPendingOperations();
            for (int i = 0; i < ActionSize; i++)
            {
                actions[i] = output[0, i];
            }

            return true;
#else
            return false;
#endif
        }

        private void RunHeuristic()
        {
            TitanData data = titan.Data;

            // Habilidad: la de más daño que esté lista y alcance al rival.
            int bestSlot = -1;
            float bestDamage = 0f;
            float maxReadyRange = 0f;
            for (int i = 0; i < BattleEvents.AbilitySlotCount; i++)
            {
                actions[2 + i] = 0f;
                if (!titan.IsAbilityReady(i))
                {
                    continue;
                }

                AbilityDefinition ability = data.GetAbility(i);
                maxReadyRange = Mathf.Max(maxReadyRange, ability.Range);
                if (distanceToOpponent <= ability.Range && ability.Damage > bestDamage)
                {
                    bestDamage = ability.Damage;
                    bestSlot = i;
                }
            }

            if (bestSlot >= 0)
            {
                actions[2 + bestSlot] = 1f;
            }

            // Movimiento: borde de la isla > retirada > acercarse al alcance > flanquear.
            if (UnityEngine.Random.value < strafeFlipChance)
            {
                strafeSign = -strafeSign;
            }

            float perpendicularX = -toOpponentDir.z * strafeSign;
            float perpendicularZ = toOpponentDir.x * strafeSign;

            if (edgeRatio > edgeDangerRatio)
            {
                desiredMove = toCenterDir;
            }
            else if (ownHealth < retreatHealthRatio && maxReadyRange <= 0f)
            {
                desiredMove = toCenterDir * 0.5f - toOpponentDir;
            }
            else if (maxReadyRange > 0f && distanceToOpponent > maxReadyRange * 0.8f)
            {
                desiredMove = toOpponentDir;
                desiredMove.x += perpendicularX * strafeWeight;
                desiredMove.z += perpendicularZ * strafeWeight;
            }
            else
            {
                desiredMove.x = perpendicularX;
                desiredMove.y = 0f;
                desiredMove.z = perpendicularZ;
            }

            desiredMove.y = 0f;
            desiredMove = Vector3.ClampMagnitude(desiredMove, 1f);
            actions[0] = desiredMove.x;
            actions[1] = desiredMove.z;
        }

        private void ApplyActions()
        {
            moveCommand.x = Mathf.Clamp(actions[0], -1f, 1f);
            moveCommand.y = Mathf.Clamp(actions[1], -1f, 1f);
            titan.SetMoveInput(moveCommand);

            if (titan.State == TitanState.Casting)
            {
                return;
            }

            // Enmascara habilidades en cooldown y elige la de mayor puntuación sobre el umbral.
            int chosenSlot = -1;
            float bestScore = castThreshold;
            for (int i = 0; i < BattleEvents.AbilitySlotCount; i++)
            {
                float score = actions[2 + i];
                if (score >= bestScore && titan.IsAbilityReady(i))
                {
                    bestScore = score;
                    chosenSlot = i;
                }
            }

            if (chosenSlot >= 0)
            {
                battleEvents.RaiseAbilityCastRequested(titan.Id, chosenSlot);
            }
        }

        private void HandleHealthChanged(HealthChangedInfo info)
        {
            if (!titan.IsInitialized)
            {
                return;
            }

            if (info.Titan == titan.Id)
            {
                ownHealth = info.Normalized;
            }
            else
            {
                opponentHealth = info.Normalized;
            }
        }

        private void HandleAbilityCast(AbilityCastInfo info)
        {
            if (titan.IsInitialized && info.Caster != titan.Id)
            {
                opponentLastCastTime = Time.time;
            }
        }

        private void HandleBattleStateChanged(BattleState state)
        {
            if (state == BattleState.Fighting)
            {
                nextDecisionTime = Time.time + reactionDelay;
                opponentLastCastTime = float.NegativeInfinity;
                return;
            }

            titan.SetMoveInput(Vector2.zero);
        }
    }
}
