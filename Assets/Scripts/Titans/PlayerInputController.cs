using System;
using TitanesAwa.Core;
using UnityEngine;
using UnityEngine.InputSystem;

namespace TitanesAwa.Titans
{
    /// <summary>
    /// Control del jugador con el nuevo Input System: movimiento (WASD / flechas / stick izquierdo)
    /// relativo a la cámara y habilidades con las teclas 1–4 (o botones frontales del mando).
    /// Actúa por la misma vía que la IA: <see cref="TitanController.SetMoveInput"/> y
    /// <see cref="BattleEvents.RaiseAbilityCastRequested"/>.
    /// </summary>
    [RequireComponent(typeof(TitanController))]
    public sealed class PlayerInputController : MonoBehaviour
    {
        private static readonly string[] DefaultAbilityKeys =
        {
            "<Keyboard>/1", "<Keyboard>/2", "<Keyboard>/3", "<Keyboard>/4"
        };

        private static readonly string[] DefaultAbilityButtons =
        {
            "<Gamepad>/buttonSouth", "<Gamepad>/buttonEast", "<Gamepad>/buttonWest", "<Gamepad>/buttonNorth"
        };

        [SerializeField] private BattleEvents battleEvents;

        [Header("Cámara")]
        [SerializeField] private bool cameraRelative = true;
        [Tooltip("Vacío = Camera.main.")]
        [SerializeField] private Transform cameraTransform;

        [Header("Acciones (opcional: vacío = bindings por defecto)")]
        [SerializeField] private InputActionReference moveActionReference;
        [SerializeField] private InputActionReference[] abilityActionReferences = new InputActionReference[BattleEvents.AbilitySlotCount];

        private readonly InputAction[] abilityActions = new InputAction[BattleEvents.AbilitySlotCount];
        private readonly bool[] ownsAbilityAction = new bool[BattleEvents.AbilitySlotCount];
        private readonly Action<InputAction.CallbackContext>[] abilityHandlers =
            new Action<InputAction.CallbackContext>[BattleEvents.AbilitySlotCount];

        private TitanController titan;
        private InputAction moveAction;
        private bool ownsMoveAction;

        private Vector2 worldMove;
        private Vector3 cameraForward;
        private Vector3 cameraRight;

        private void Awake()
        {
            titan = GetComponent<TitanController>();
            if (cameraTransform == null && Camera.main != null)
            {
                cameraTransform = Camera.main.transform;
            }

            moveAction = moveActionReference != null ? moveActionReference.action : null;
            if (moveAction == null)
            {
                moveAction = CreateDefaultMoveAction();
                ownsMoveAction = true;
            }

            for (int i = 0; i < BattleEvents.AbilitySlotCount; i++)
            {
                InputActionReference reference = i < abilityActionReferences.Length ? abilityActionReferences[i] : null;
                abilityActions[i] = reference != null ? reference.action : null;
                if (abilityActions[i] == null)
                {
                    abilityActions[i] = CreateDefaultAbilityAction(i);
                    ownsAbilityAction[i] = true;
                }

                // Delegados creados una sola vez: pulsar una tecla no asigna memoria.
                int slot = i;
                abilityHandlers[i] = _ => RequestAbility(slot);
            }
        }

        private void OnEnable()
        {
            moveAction.Enable();
            for (int i = 0; i < BattleEvents.AbilitySlotCount; i++)
            {
                abilityActions[i].performed += abilityHandlers[i];
                abilityActions[i].Enable();
            }
        }

        private void OnDisable()
        {
            // Las acciones de un asset compartido se dejan activas; solo se apagan las propias.
            if (ownsMoveAction)
            {
                moveAction.Disable();
            }

            for (int i = 0; i < BattleEvents.AbilitySlotCount; i++)
            {
                abilityActions[i].performed -= abilityHandlers[i];
                if (ownsAbilityAction[i])
                {
                    abilityActions[i].Disable();
                }
            }

            titan.SetMoveInput(Vector2.zero);
        }

        private void OnDestroy()
        {
            if (ownsMoveAction)
            {
                moveAction.Dispose();
            }

            for (int i = 0; i < BattleEvents.AbilitySlotCount; i++)
            {
                if (ownsAbilityAction[i])
                {
                    abilityActions[i].Dispose();
                }
            }
        }

        private void Update()
        {
            Vector2 input = moveAction.ReadValue<Vector2>();

            if (cameraRelative && cameraTransform != null)
            {
                cameraForward = cameraTransform.forward;
                cameraForward.y = 0f;
                if (cameraForward.sqrMagnitude < 0.0001f)
                {
                    // Cámara cenital: su "arriba" apunta hacia delante en el plano.
                    cameraForward = cameraTransform.up;
                    cameraForward.y = 0f;
                }

                cameraForward.Normalize();
                cameraRight = cameraTransform.right;
                cameraRight.y = 0f;
                cameraRight.Normalize();

                worldMove.x = cameraRight.x * input.x + cameraForward.x * input.y;
                worldMove.y = cameraRight.z * input.x + cameraForward.z * input.y;
            }
            else
            {
                worldMove = input;
            }

            titan.SetMoveInput(worldMove);
        }

        private void RequestAbility(int slot)
        {
            if (titan.IsInitialized)
            {
                battleEvents.RaiseAbilityCastRequested(titan.Id, slot);
            }
        }

        private static InputAction CreateDefaultMoveAction()
        {
            InputAction action = new InputAction("Move", InputActionType.Value, expectedControlType: "Vector2");
            action.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/w")
                .With("Down", "<Keyboard>/s")
                .With("Left", "<Keyboard>/a")
                .With("Right", "<Keyboard>/d");
            action.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/upArrow")
                .With("Down", "<Keyboard>/downArrow")
                .With("Left", "<Keyboard>/leftArrow")
                .With("Right", "<Keyboard>/rightArrow");
            action.AddBinding("<Gamepad>/leftStick");
            return action;
        }

        private static InputAction CreateDefaultAbilityAction(int slot)
        {
            InputAction action = new InputAction("Ability" + (slot + 1), InputActionType.Button);
            action.AddBinding(DefaultAbilityKeys[slot]);
            action.AddBinding(DefaultAbilityButtons[slot]);
            return action;
        }
    }
}
