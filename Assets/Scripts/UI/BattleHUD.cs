using System;
using TitanesAwa.Core;
using TitanesAwa.ScriptableObjects;
using TMPro;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace TitanesAwa.UI
{
    /// <summary>Referencias visuales de un botón de habilidad.</summary>
    [Serializable]
    public struct AbilitySlotView
    {
        [SerializeField] private Button button;
        [SerializeField] private Image icon;
        [Tooltip("Image radial (Filled/Radial360) superpuesta al icono durante el cooldown.")]
        [SerializeField] private Image cooldownOverlay;
        [Tooltip("Opcional: segundos restantes.")]
        [SerializeField] private TMP_Text cooldownLabel;

        public Button Button => button;
        public Image Icon => icon;
        public Image CooldownOverlay => cooldownOverlay;
        public TMP_Text CooldownLabel => cooldownLabel;
    }

    /// <summary>
    /// HUD de combate: barra de vida dividida (Azul/Escarcha a la izquierda, Rojo/Magma a la derecha,
    /// ambas se vacían hacia el exterior) y los 4 botones de habilidad del titán del jugador con cooldown radial.
    /// Solo escucha <see cref="BattleEvents"/> e interpola localmente: no hay eventos por frame.
    /// </summary>
    public sealed class BattleHUD : MonoBehaviour
    {
        [SerializeField] private BattleEvents battleEvents;
        [Tooltip("Titán que controla el jugador (sus iconos y cooldowns se muestran en los botones).")]
        [SerializeField] private TitanData playerTitan;

        [Header("Barra de vida dividida")]
        [SerializeField] private Image frostFill;
        [SerializeField] private Image magmaFill;
        [Tooltip("Opcional: rastro de daño retrasado tras la barra azul.")]
        [SerializeField] private Image frostTrail;
        [Tooltip("Opcional: rastro de daño retrasado tras la barra roja.")]
        [SerializeField] private Image magmaTrail;
        [SerializeField] private Color frostColor = new Color(0.2f, 0.6f, 1f, 1f);
        [SerializeField] private Color magmaColor = new Color(1f, 0.3f, 0.1f, 1f);
        [SerializeField] private Color trailColor = new Color(1f, 0.95f, 0.8f, 1f);
        [SerializeField, Min(0.01f)] private float fillSpeed = 3f;
        [SerializeField, Min(0f)] private float trailDelay = 0.4f;
        [SerializeField, Min(0.01f)] private float trailSpeed = 0.8f;

        [Header("Habilidades")]
        [SerializeField] private AbilitySlotView[] abilitySlots = new AbilitySlotView[BattleEvents.AbilitySlotCount];
        [SerializeField] private Color cooldownIconTint = new Color(0.45f, 0.45f, 0.45f, 1f);

        private readonly float[] readyAtTimes = new float[BattleEvents.AbilitySlotCount];
        private readonly float[] cooldownDurations = new float[BattleEvents.AbilitySlotCount];
        private readonly bool[] coolingDown = new bool[BattleEvents.AbilitySlotCount];
        private readonly int[] shownSeconds = new int[BattleEvents.AbilitySlotCount];
        private readonly UnityAction[] clickHandlers = new UnityAction[BattleEvents.AbilitySlotCount];

        private float frostTarget = 1f;
        private float magmaTarget = 1f;
        private float frostTrailHoldUntil;
        private float magmaTrailHoldUntil;
        private bool fighting;

        private void Awake()
        {
            ConfigureBar(frostFill, frostColor, (int)Image.OriginHorizontal.Right);
            ConfigureBar(magmaFill, magmaColor, (int)Image.OriginHorizontal.Left);
            ConfigureBar(frostTrail, trailColor, (int)Image.OriginHorizontal.Right);
            ConfigureBar(magmaTrail, trailColor, (int)Image.OriginHorizontal.Left);

            for (int i = 0; i < abilitySlots.Length && i < BattleEvents.AbilitySlotCount; i++)
            {
                int slot = i;
                clickHandlers[i] = () => battleEvents.RaiseAbilityCastRequested(playerTitan.Id, slot);

                Image icon = abilitySlots[i].Icon;
                if (icon != null)
                {
                    icon.sprite = playerTitan.GetAbility(i).Icon;
                }

                Image overlay = abilitySlots[i].CooldownOverlay;
                if (overlay != null)
                {
                    overlay.type = Image.Type.Filled;
                    overlay.fillMethod = Image.FillMethod.Radial360;
                    overlay.fillClockwise = false;
                }

                EndCooldown(i);
            }
        }

        private void OnEnable()
        {
            battleEvents.HealthChanged += HandleHealthChanged;
            battleEvents.AbilityCast += HandleAbilityCast;
            battleEvents.AbilityReady += HandleAbilityReady;
            battleEvents.BattleStateChanged += HandleBattleStateChanged;

            for (int i = 0; i < abilitySlots.Length && i < BattleEvents.AbilitySlotCount; i++)
            {
                if (abilitySlots[i].Button != null)
                {
                    abilitySlots[i].Button.onClick.AddListener(clickHandlers[i]);
                }
            }

            HandleBattleStateChanged(battleEvents.CurrentState);
        }

        private void OnDisable()
        {
            battleEvents.HealthChanged -= HandleHealthChanged;
            battleEvents.AbilityCast -= HandleAbilityCast;
            battleEvents.AbilityReady -= HandleAbilityReady;
            battleEvents.BattleStateChanged -= HandleBattleStateChanged;

            for (int i = 0; i < abilitySlots.Length && i < BattleEvents.AbilitySlotCount; i++)
            {
                if (abilitySlots[i].Button != null)
                {
                    abilitySlots[i].Button.onClick.RemoveListener(clickHandlers[i]);
                }
            }
        }

        private void Update()
        {
            float now = Time.time;
            float deltaTime = Time.deltaTime;

            AnimateBar(frostFill, frostTrail, frostTarget, frostTrailHoldUntil, now, deltaTime);
            AnimateBar(magmaFill, magmaTrail, magmaTarget, magmaTrailHoldUntil, now, deltaTime);

            for (int i = 0; i < abilitySlots.Length && i < BattleEvents.AbilitySlotCount; i++)
            {
                if (!coolingDown[i])
                {
                    continue;
                }

                float remaining = readyAtTimes[i] - now;
                if (remaining <= 0f)
                {
                    EndCooldown(i);
                    continue;
                }

                Image overlay = abilitySlots[i].CooldownOverlay;
                if (overlay != null)
                {
                    overlay.fillAmount = remaining / cooldownDurations[i];
                }

                int seconds = Mathf.CeilToInt(remaining);
                TMP_Text label = abilitySlots[i].CooldownLabel;
                if (label != null && seconds != shownSeconds[i])
                {
                    shownSeconds[i] = seconds;
                    label.SetText("{0}", seconds);
                }
            }
        }

        private void AnimateBar(Image fill, Image trail, float target, float trailHoldUntil, float now, float deltaTime)
        {
            if (fill != null)
            {
                fill.fillAmount = Mathf.MoveTowards(fill.fillAmount, target, fillSpeed * deltaTime);
            }

            if (trail == null)
            {
                return;
            }

            if (target >= trail.fillAmount)
            {
                trail.fillAmount = target;
            }
            else if (now >= trailHoldUntil)
            {
                trail.fillAmount = Mathf.MoveTowards(trail.fillAmount, target, trailSpeed * deltaTime);
            }
        }

        private void HandleHealthChanged(HealthChangedInfo info)
        {
            float holdUntil = Time.time + trailDelay;
            if (info.Titan == TitanId.Frost)
            {
                if (info.Normalized < frostTarget)
                {
                    frostTrailHoldUntil = holdUntil;
                }

                frostTarget = info.Normalized;
            }
            else
            {
                if (info.Normalized < magmaTarget)
                {
                    magmaTrailHoldUntil = holdUntil;
                }

                magmaTarget = info.Normalized;
            }
        }

        private void HandleAbilityCast(AbilityCastInfo info)
        {
            if (info.Caster != playerTitan.Id || info.CooldownDuration <= 0f || info.Slot >= abilitySlots.Length)
            {
                return;
            }

            int slot = info.Slot;
            readyAtTimes[slot] = info.ReadyAtTime;
            cooldownDurations[slot] = info.CooldownDuration;
            coolingDown[slot] = true;
            shownSeconds[slot] = -1;

            AbilitySlotView view = abilitySlots[slot];
            if (view.CooldownOverlay != null)
            {
                view.CooldownOverlay.enabled = true;
                view.CooldownOverlay.fillAmount = 1f;
            }

            if (view.CooldownLabel != null)
            {
                view.CooldownLabel.enabled = true;
            }

            if (view.Icon != null)
            {
                view.Icon.color = cooldownIconTint;
            }

            RefreshInteractable(slot);
        }

        private void HandleAbilityReady(TitanId titan, int slot)
        {
            if (titan == playerTitan.Id && slot < abilitySlots.Length)
            {
                EndCooldown(slot);
            }
        }

        private void HandleBattleStateChanged(BattleState state)
        {
            fighting = state == BattleState.Fighting;
            bool newBattle = state == BattleState.Countdown;

            for (int i = 0; i < abilitySlots.Length && i < BattleEvents.AbilitySlotCount; i++)
            {
                if (newBattle)
                {
                    EndCooldown(i);
                }
                else
                {
                    RefreshInteractable(i);
                }
            }
        }

        private void EndCooldown(int slot)
        {
            coolingDown[slot] = false;
            AbilitySlotView view = abilitySlots[slot];

            if (view.CooldownOverlay != null)
            {
                view.CooldownOverlay.enabled = false;
            }

            if (view.CooldownLabel != null)
            {
                view.CooldownLabel.enabled = false;
            }

            if (view.Icon != null)
            {
                view.Icon.color = Color.white;
            }

            RefreshInteractable(slot);
        }

        private void RefreshInteractable(int slot)
        {
            Button button = abilitySlots[slot].Button;
            if (button != null)
            {
                button.interactable = fighting && !coolingDown[slot];
            }
        }

        private static void ConfigureBar(Image bar, Color color, int fillOrigin)
        {
            if (bar == null)
            {
                return;
            }

            bar.type = Image.Type.Filled;
            bar.fillMethod = Image.FillMethod.Horizontal;
            bar.fillOrigin = fillOrigin;
            bar.color = color;
        }
    }
}
