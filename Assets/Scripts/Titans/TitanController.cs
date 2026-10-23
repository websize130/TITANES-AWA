using TitanesAwa.Core;
using TitanesAwa.ScriptableObjects;
using UnityEngine;

namespace TitanesAwa.Titans
{
    public enum TitanState
    {
        Idle = 0,
        Moving = 1,
        Casting = 2,
        Defeated = 3
    }

    /// <summary>
    /// Movimiento, habilidades con cooldown, vida y estados de un titán.
    /// Recibe órdenes solo por <see cref="SetMoveInput"/> y por <see cref="BattleEvents.AbilityCastRequested"/>,
    /// por lo que el jugador y la IA táctica lo controlan exactamente igual.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public sealed class TitanController : MonoBehaviour
    {
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int CastHash = Animator.StringToHash("Cast");
        private static readonly int AbilitySlotHash = Animator.StringToHash("AbilitySlot");
        private static readonly int DefeatedHash = Animator.StringToHash("Defeated");

        private const float Gravity = -25f;
        private const float GroundedStickVelocity = -2f;

        [SerializeField] private BattleEvents battleEvents;
        [SerializeField] private Animator animator;

        private readonly float[] readyAtTimes = new float[BattleEvents.AbilitySlotCount];
        private readonly bool[] readyPending = new bool[BattleEvents.AbilitySlotCount];

        private CharacterController characterController;
        private Transform cachedTransform;
        private Transform opponent;
        private TitanData data;

        private Vector2 moveInput;
        private Vector3 velocity;
        private Vector3 lookDirection;
        private float currentHealth;
        private int castingSlot = -1;
        private float castEndTime;

        public TitanId Id => data != null ? data.Id : default;
        public TitanData Data => data;
        public Transform Opponent => opponent;
        public TitanState State { get; private set; } = TitanState.Idle;
        public float CurrentHealth => currentHealth;
        public bool IsInitialized => data != null;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            cachedTransform = transform;
        }

        private void OnEnable()
        {
            battleEvents.AbilityCastRequested += HandleAbilityCastRequested;
            battleEvents.DamageDealt += HandleDamageDealt;
            battleEvents.TitanDefeated += HandleTitanDefeated;
            battleEvents.BattleStateChanged += HandleBattleStateChanged;
        }

        private void OnDisable()
        {
            battleEvents.AbilityCastRequested -= HandleAbilityCastRequested;
            battleEvents.DamageDealt -= HandleDamageDealt;
            battleEvents.TitanDefeated -= HandleTitanDefeated;
            battleEvents.BattleStateChanged -= HandleBattleStateChanged;
        }

        /// <summary>Llamado por el ArenaManager tras instanciar el titán.</summary>
        public void Initialize(TitanData titanData, Transform opponentTransform)
        {
            data = titanData;
            opponent = opponentTransform;
            ResetForBattle();
        }

        public void ResetForBattle()
        {
            currentHealth = data.MaxHealth;
            castingSlot = -1;
            moveInput = Vector2.zero;
            velocity = Vector3.zero;
            for (int i = 0; i < BattleEvents.AbilitySlotCount; i++)
            {
                readyAtTimes[i] = 0f;
                readyPending[i] = false;
            }

            State = TitanState.Idle;
            if (animator != null)
            {
                animator.SetBool(DefeatedHash, false);
            }

            battleEvents.RaiseHealthChanged(data.Id, currentHealth, data.MaxHealth);
        }

        /// <summary>Teletransporta al titán (el CharacterController ignora asignaciones directas de posición).</summary>
        public void Teleport(Vector3 position, Quaternion rotation)
        {
            characterController.enabled = false;
            cachedTransform.SetPositionAndRotation(position, rotation);
            characterController.enabled = true;
        }

        /// <summary>Dirección de movimiento en el plano XZ del mundo; magnitud 0–1.</summary>
        public void SetMoveInput(Vector2 input)
        {
            moveInput = Vector2.ClampMagnitude(input, 1f);
        }

        public bool IsAbilityReady(int slot)
        {
            return BattleEvents.IsValidSlot(slot) && Time.time >= readyAtTimes[slot];
        }

        public float GetCooldownRemaining(int slot)
        {
            return Mathf.Max(0f, readyAtTimes[slot] - Time.time);
        }

        private void Update()
        {
            if (data == null)
            {
                return;
            }

            float now = Time.time;
            float deltaTime = Time.deltaTime;
            TickCooldowns(now);

            if (State == TitanState.Defeated)
            {
                return;
            }

            bool canAct = battleEvents.CurrentState == BattleState.Fighting;

            if (State == TitanState.Casting)
            {
                if (opponent != null)
                {
                    FaceTowards(opponent.position, deltaTime);
                }

                if (now >= castEndTime)
                {
                    ResolveCast();
                }

                Move(Vector2.zero, deltaTime);
                return;
            }

            Move(canAct ? moveInput : Vector2.zero, deltaTime);
        }

        private void Move(Vector2 input, float deltaTime)
        {
            float speed = data.MoveSpeed * input.magnitude;
            velocity.x = input.x * data.MoveSpeed;
            velocity.z = input.y * data.MoveSpeed;

            if (characterController.isGrounded && velocity.y < 0f)
            {
                velocity.y = GroundedStickVelocity;
            }

            velocity.y += Gravity * deltaTime;
            characterController.Move(velocity * deltaTime);

            if (speed > 0.01f)
            {
                lookDirection.x = input.x;
                lookDirection.y = 0f;
                lookDirection.z = input.y;
                RotateTowards(lookDirection, deltaTime);
            }

            if (State != TitanState.Casting)
            {
                State = speed > 0.01f ? TitanState.Moving : TitanState.Idle;
            }

            if (animator != null)
            {
                animator.SetFloat(SpeedHash, speed);
            }
        }

        private void FaceTowards(Vector3 worldPosition, float deltaTime)
        {
            lookDirection = worldPosition - cachedTransform.position;
            lookDirection.y = 0f;
            RotateTowards(lookDirection, deltaTime);
        }

        private void RotateTowards(Vector3 direction, float deltaTime)
        {
            if (direction.sqrMagnitude < 0.0001f)
            {
                return;
            }

            Quaternion target = Quaternion.LookRotation(direction);
            cachedTransform.rotation = Quaternion.RotateTowards(cachedTransform.rotation, target, data.TurnSpeed * deltaTime);
        }

        private void TickCooldowns(float now)
        {
            for (int i = 0; i < BattleEvents.AbilitySlotCount; i++)
            {
                if (readyPending[i] && now >= readyAtTimes[i])
                {
                    readyPending[i] = false;
                    battleEvents.RaiseAbilityReady(data.Id, i);
                }
            }
        }

        private void HandleAbilityCastRequested(AbilityCastRequest request)
        {
            if (data == null || request.Caster != data.Id)
            {
                return;
            }

            float now = Time.time;
            int slot = request.Slot;
            if (State == TitanState.Casting || State == TitanState.Defeated || now < readyAtTimes[slot])
            {
                battleEvents.RaiseAbilityCastRejected(data.Id, slot);
                return;
            }

            AbilityDefinition ability = data.GetAbility(slot);
            readyAtTimes[slot] = now + ability.Cooldown;
            readyPending[slot] = ability.Cooldown > 0f;
            castingSlot = slot;
            castEndTime = now + ability.CastTime;
            State = TitanState.Casting;

            if (animator != null)
            {
                animator.SetInteger(AbilitySlotHash, slot);
                animator.SetTrigger(CastHash);
            }

            battleEvents.RaiseAbilityCast(data.Id, slot, ability.Cooldown, readyAtTimes[slot]);
        }

        private void ResolveCast()
        {
            AbilityDefinition ability = data.GetAbility(castingSlot);
            int slot = castingSlot;
            castingSlot = -1;
            State = TitanState.Idle;

            if (opponent == null)
            {
                return;
            }

            float sqrDistance = (opponent.position - cachedTransform.position).sqrMagnitude;
            if (sqrDistance <= ability.Range * ability.Range)
            {
                battleEvents.RaiseDamageDealt(data.Id, BattleEvents.GetOpponent(data.Id), slot, ability.Damage);
            }
        }

        private void HandleDamageDealt(DamageInfo info)
        {
            if (data == null || info.Target != data.Id || State == TitanState.Defeated)
            {
                return;
            }

            currentHealth = Mathf.Max(0f, currentHealth - info.Amount);
            battleEvents.RaiseHealthChanged(data.Id, currentHealth, data.MaxHealth);

            if (currentHealth <= 0f)
            {
                battleEvents.RaiseTitanDefeated(data.Id);
            }
        }

        /// <summary>Única vía de derrota: por vida a cero o por caída de la isla (ArenaManager).</summary>
        private void HandleTitanDefeated(TitanId defeated)
        {
            if (data == null || defeated != data.Id)
            {
                return;
            }

            State = TitanState.Defeated;
            castingSlot = -1;
            moveInput = Vector2.zero;
            if (animator != null)
            {
                animator.SetBool(DefeatedHash, true);
            }
        }

        private void HandleBattleStateChanged(BattleState state)
        {
            if (state == BattleState.Finished && State != TitanState.Defeated)
            {
                castingSlot = -1;
                moveInput = Vector2.zero;
                State = TitanState.Idle;
            }
        }
    }
}
