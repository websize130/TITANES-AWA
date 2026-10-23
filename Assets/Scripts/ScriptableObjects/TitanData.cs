using System;
using TitanesAwa.Core;
using UnityEngine;

namespace TitanesAwa.ScriptableObjects
{
    /// <summary>Definición de una habilidad de titán (slot 0–3).</summary>
    [Serializable]
    public struct AbilityDefinition
    {
        [SerializeField] private string displayName;
        [SerializeField] private Sprite icon;
        [SerializeField, Min(0f)] private float cooldown;
        [SerializeField, Min(0f)] private float castTime;
        [SerializeField, Min(0f)] private float damage;
        [SerializeField, Min(0f)] private float range;

        public string DisplayName => displayName;
        public Sprite Icon => icon;
        public float Cooldown => cooldown;
        public float CastTime => castTime;
        public float Damage => damage;
        public float Range => range;
    }

    /// <summary>
    /// Datos inmutables de un titán (Escarcha o Magma). Compartidos entre la lógica, la UI y la IA.
    /// </summary>
    [CreateAssetMenu(fileName = "TitanData", menuName = "TitanesAwa/Titans/Titan Data")]
    public sealed class TitanData : ScriptableObject
    {
        [Header("Identidad")]
        [SerializeField] private TitanId id;
        [SerializeField] private string displayName;
        [SerializeField] private Sprite portrait;
        [Tooltip("Prefab con TitanController, malla estilizada y materiales HDRP/Lit con emissive.")]
        [SerializeField] private GameObject prefab;

        [Header("Atributos base")]
        [SerializeField, Min(1f)] private float maxHealth = 1000f;
        [SerializeField, Min(0f)] private float moveSpeed = 6f;
        [SerializeField, Min(0f)] private float turnSpeed = 540f;

        [Header("Habilidades")]
        [SerializeField] private AbilityDefinition[] abilities = new AbilityDefinition[BattleEvents.AbilitySlotCount];

        public TitanId Id => id;
        public string DisplayName => displayName;
        public Sprite Portrait => portrait;
        public GameObject Prefab => prefab;
        public float MaxHealth => maxHealth;
        public float MoveSpeed => moveSpeed;
        public float TurnSpeed => turnSpeed;

        public AbilityDefinition GetAbility(int slot)
        {
            return abilities[slot];
        }

#if UNITY_EDITOR
        private void OnValidate()
        {
            if (abilities == null || abilities.Length != BattleEvents.AbilitySlotCount)
            {
                Array.Resize(ref abilities, BattleEvents.AbilitySlotCount);
            }
        }
#endif
    }
}
