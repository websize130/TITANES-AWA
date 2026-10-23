using System;
using UnityEngine;

namespace TitanesAwa.Core
{
    /// <summary>Identificador de cada titán del MVP.</summary>
    public enum TitanId
    {
        Frost = 0,
        Magma = 1
    }

    /// <summary>Fases del ciclo de vida de una batalla.</summary>
    public enum BattleState
    {
        Idle = 0,
        Countdown = 1,
        Fighting = 2,
        Finished = 3
    }

    /// <summary>Petición de lanzar una habilidad (emitida por input/UI/IA).</summary>
    public readonly struct AbilityCastRequest
    {
        public readonly TitanId Caster;
        public readonly int Slot;

        public AbilityCastRequest(TitanId caster, int slot)
        {
            Caster = caster;
            Slot = slot;
        }
    }

    /// <summary>Habilidad lanzada con éxito y cooldown iniciado.</summary>
    public readonly struct AbilityCastInfo
    {
        public readonly TitanId Caster;
        public readonly int Slot;
        public readonly float CooldownDuration;
        /// <summary>Instante (Time.time) en el que la habilidad vuelve a estar lista.</summary>
        public readonly float ReadyAtTime;

        public AbilityCastInfo(TitanId caster, int slot, float cooldownDuration, float readyAtTime)
        {
            Caster = caster;
            Slot = slot;
            CooldownDuration = cooldownDuration;
            ReadyAtTime = readyAtTime;
        }
    }

    /// <summary>Daño aplicado de un titán a otro.</summary>
    public readonly struct DamageInfo
    {
        public readonly TitanId Source;
        public readonly TitanId Target;
        public readonly int Slot;
        public readonly float Amount;

        public DamageInfo(TitanId source, TitanId target, int slot, float amount)
        {
            Source = source;
            Target = target;
            Slot = slot;
            Amount = amount;
        }
    }

    /// <summary>Estado de vida de un titán tras un cambio (para la barra dividida Azul/Rojo).</summary>
    public readonly struct HealthChangedInfo
    {
        public readonly TitanId Titan;
        public readonly float Current;
        public readonly float Max;

        public float Normalized => Max > 0f ? Current / Max : 0f;

        public HealthChangedInfo(TitanId titan, float current, float max)
        {
            Titan = titan;
            Current = current;
            Max = max;
        }
    }

    /// <summary>
    /// Canal de eventos de combate. Un único asset compartido por titanes, UI y gestor de batalla,
    /// de modo que ningún sistema referencia directamente a otro.
    /// Todos los payloads son structs readonly: emitir eventos no genera basura.
    /// </summary>
    [CreateAssetMenu(fileName = "BattleEvents", menuName = "TitanesAwa/Core/Battle Events")]
    public sealed class BattleEvents : ScriptableObject
    {
        public const int AbilitySlotCount = 4;

        // --- Ciclo de batalla ---
        public event Action<BattleState> BattleStateChanged;
        public event Action<TitanId> BattleEnded;

        // --- Habilidades ---
        public event Action<AbilityCastRequest> AbilityCastRequested;
        public event Action<AbilityCastRequest> AbilityCastRejected;
        public event Action<AbilityCastInfo> AbilityCast;
        public event Action<TitanId, int> AbilityReady;

        // --- Daño y vida ---
        public event Action<DamageInfo> DamageDealt;
        public event Action<HealthChangedInfo> HealthChanged;
        public event Action<TitanId> TitanDefeated;

        public BattleState CurrentState { get; private set; } = BattleState.Idle;

        private void OnEnable()
        {
            // Con "Enter Play Mode Options" sin domain reload, el asset conserva estado entre sesiones.
            ResetChannel();
        }

        public void RaiseBattleStateChanged(BattleState state)
        {
            if (state == CurrentState)
            {
                return;
            }

            CurrentState = state;
            BattleStateChanged?.Invoke(state);
        }

        public void RaiseAbilityCastRequested(TitanId caster, int slot)
        {
            if (CurrentState != BattleState.Fighting || !IsValidSlot(slot))
            {
                return;
            }

            AbilityCastRequested?.Invoke(new AbilityCastRequest(caster, slot));
        }

        public void RaiseAbilityCastRejected(TitanId caster, int slot)
        {
            AbilityCastRejected?.Invoke(new AbilityCastRequest(caster, slot));
        }

        public void RaiseAbilityCast(TitanId caster, int slot, float cooldownDuration, float readyAtTime)
        {
            AbilityCast?.Invoke(new AbilityCastInfo(caster, slot, cooldownDuration, readyAtTime));
        }

        public void RaiseAbilityReady(TitanId titan, int slot)
        {
            AbilityReady?.Invoke(titan, slot);
        }

        public void RaiseDamageDealt(TitanId source, TitanId target, int slot, float amount)
        {
            if (CurrentState != BattleState.Fighting || amount <= 0f)
            {
                return;
            }

            DamageDealt?.Invoke(new DamageInfo(source, target, slot, amount));
        }

        public void RaiseHealthChanged(TitanId titan, float current, float max)
        {
            HealthChanged?.Invoke(new HealthChangedInfo(titan, current, max));
        }

        /// <summary>Notifica la derrota de un titán y cierra la batalla declarando al oponente ganador.</summary>
        public void RaiseTitanDefeated(TitanId defeated)
        {
            if (CurrentState != BattleState.Fighting)
            {
                return;
            }

            TitanDefeated?.Invoke(defeated);
            RaiseBattleStateChanged(BattleState.Finished);
            BattleEnded?.Invoke(GetOpponent(defeated));
        }

        public static TitanId GetOpponent(TitanId titan)
        {
            return titan == TitanId.Frost ? TitanId.Magma : TitanId.Frost;
        }

        public static bool IsValidSlot(int slot)
        {
            return slot >= 0 && slot < AbilitySlotCount;
        }

        private void ResetChannel()
        {
            CurrentState = BattleState.Idle;
            BattleStateChanged = null;
            BattleEnded = null;
            AbilityCastRequested = null;
            AbilityCastRejected = null;
            AbilityCast = null;
            AbilityReady = null;
            DamageDealt = null;
            HealthChanged = null;
            TitanDefeated = null;
        }
    }
}
