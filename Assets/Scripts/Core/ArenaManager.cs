using System;
using TitanesAwa.ScriptableObjects;
using TitanesAwa.Titans;
using UnityEngine;

namespace TitanesAwa.Core
{
    /// <summary>Carácter táctico de una zona de spawn; la IA lo usa para elegir posiciones.</summary>
    public enum SpawnZoneType
    {
        Standard = 0,
        HighGround = 1,
        Flank = 2,
        Cover = 3
    }

    [Serializable]
    public struct TacticalSpawnZone
    {
        [SerializeField] private TitanId owner;
        [SerializeField] private SpawnZoneType type;
        [SerializeField] private Transform anchor;
        [SerializeField, Min(0f)] private float radius;

        public TitanId Owner => owner;
        public SpawnZoneType Type => type;
        public Transform Anchor => anchor;
        public float Radius => radius;
    }

    /// <summary>
    /// Arena de isla flotante abierta: instancia a los titanes en zonas de spawn tácticas,
    /// gestiona la cuenta atrás y declara derrota por caída fuera de la isla.
    /// </summary>
    public sealed class ArenaManager : MonoBehaviour
    {
        [SerializeField] private BattleEvents battleEvents;

        [Header("Titanes")]
        [SerializeField] private TitanData frostData;
        [SerializeField] private TitanData magmaData;

        [Header("Isla flotante")]
        [SerializeField] private Transform islandCenter;
        [SerializeField, Min(1f)] private float playableRadius = 60f;
        [Tooltip("Altura por debajo de la cual un titán ha caído de la isla.")]
        [SerializeField] private float fallLimitY = -30f;
        [SerializeField] private TacticalSpawnZone[] spawnZones = Array.Empty<TacticalSpawnZone>();

        [Header("Flujo")]
        [SerializeField, Min(0f)] private float countdownDuration = 3f;
        [SerializeField] private bool startOnPlay = true;

        [Header("IA")]
        [Tooltip("Titán controlado por TitanAIController; el otro queda para el jugador.")]
        [SerializeField] private TitanId aiControlledTitan = TitanId.Magma;

        private TitanController frost;
        private TitanController magma;
        private Transform frostTransform;
        private Transform magmaTransform;
        private float countdownEndTime;

        public int SpawnZoneCount => spawnZones.Length;
        public Vector3 IslandCenter => islandCenter.position;
        public float PlayableRadius => playableRadius;

        private void Start()
        {
            if (frostData == null || magmaData == null || frostData.Id != TitanId.Frost || magmaData.Id != TitanId.Magma)
            {
                Debug.LogError("ArenaManager: asigna un TitanData con Id Frost y otro con Id Magma.", this);
                enabled = false;
                return;
            }

            frost = SpawnTitan(frostData);
            magma = SpawnTitan(magmaData);
            if (frost == null || magma == null)
            {
                enabled = false;
                return;
            }

            frostTransform = frost.transform;
            magmaTransform = magma.transform;
            ConfigureAI(frost, TitanId.Frost);
            ConfigureAI(magma, TitanId.Magma);

            if (startOnPlay)
            {
                StartBattle();
            }
        }

        /// <summary>Recoloca a los titanes (sin reinstanciar) y arranca la cuenta atrás.</summary>
        public void StartBattle()
        {
            PlaceAtSpawn(frost, TitanId.Frost);
            PlaceAtSpawn(magma, TitanId.Magma);
            frost.Initialize(frostData, magmaTransform);
            magma.Initialize(magmaData, frostTransform);

            countdownEndTime = Time.time + countdownDuration;
            battleEvents.RaiseBattleStateChanged(BattleState.Countdown);
        }

        public TacticalSpawnZone GetSpawnZone(int index)
        {
            return spawnZones[index];
        }

        public bool IsInsidePlayableArea(Vector3 position)
        {
            Vector3 offset = position - islandCenter.position;
            offset.y = 0f;
            return offset.sqrMagnitude <= playableRadius * playableRadius;
        }

        /// <summary>Zona más cercana de un tipo dado (útil para la IA táctica). Devuelve -1 si no hay.</summary>
        public int FindNearestZone(Vector3 position, SpawnZoneType type)
        {
            int best = -1;
            float bestSqr = float.MaxValue;
            for (int i = 0; i < spawnZones.Length; i++)
            {
                if (spawnZones[i].Type != type || spawnZones[i].Anchor == null)
                {
                    continue;
                }

                float sqr = (spawnZones[i].Anchor.position - position).sqrMagnitude;
                if (sqr < bestSqr)
                {
                    bestSqr = sqr;
                    best = i;
                }
            }

            return best;
        }

        private void Update()
        {
            BattleState state = battleEvents.CurrentState;
            if (state == BattleState.Countdown && Time.time >= countdownEndTime)
            {
                battleEvents.RaiseBattleStateChanged(BattleState.Fighting);
                return;
            }

            if (state != BattleState.Fighting)
            {
                return;
            }

            if (frostTransform.position.y < fallLimitY)
            {
                battleEvents.RaiseTitanDefeated(TitanId.Frost);
            }
            else if (magmaTransform.position.y < fallLimitY)
            {
                battleEvents.RaiseTitanDefeated(TitanId.Magma);
            }
        }

        private TitanController SpawnTitan(TitanData data)
        {
            if (data == null || data.Prefab == null)
            {
                Debug.LogError("ArenaManager: falta TitanData o su prefab.", this);
                return null;
            }

            GameObject instance = Instantiate(data.Prefab, islandCenter.position, Quaternion.identity);
            if (!instance.TryGetComponent(out TitanController controller))
            {
                Debug.LogError("ArenaManager: el prefab del titán no tiene TitanController.", instance);
                return null;
            }

            return controller;
        }

        private void ConfigureAI(TitanController titan, TitanId id)
        {
            if (!titan.TryGetComponent(out TitanAIController ai))
            {
                return;
            }

            ai.Initialize(this);
            ai.enabled = id == aiControlledTitan;
        }

        private void PlaceAtSpawn(TitanController titan, TitanId owner)
        {
            Vector3 position = islandCenter.position;
            int zone = PickRandomZone(owner);
            if (zone >= 0)
            {
                Vector2 jitter = UnityEngine.Random.insideUnitCircle * spawnZones[zone].Radius;
                position = spawnZones[zone].Anchor.position;
                position.x += jitter.x;
                position.z += jitter.y;
            }

            Vector3 toCenter = islandCenter.position - position;
            toCenter.y = 0f;
            Quaternion rotation = toCenter.sqrMagnitude > 0.0001f ? Quaternion.LookRotation(toCenter) : Quaternion.identity;
            titan.Teleport(position, rotation);
        }

        private int PickRandomZone(TitanId owner)
        {
            int count = 0;
            for (int i = 0; i < spawnZones.Length; i++)
            {
                if (spawnZones[i].Owner == owner && spawnZones[i].Anchor != null)
                {
                    count++;
                }
            }

            if (count == 0)
            {
                return -1;
            }

            int pick = UnityEngine.Random.Range(0, count);
            for (int i = 0; i < spawnZones.Length; i++)
            {
                if (spawnZones[i].Owner == owner && spawnZones[i].Anchor != null && pick-- == 0)
                {
                    return i;
                }
            }

            return -1;
        }

#if UNITY_EDITOR
        private void OnDrawGizmosSelected()
        {
            if (islandCenter != null)
            {
                Gizmos.color = Color.white;
                Gizmos.DrawWireSphere(islandCenter.position, playableRadius);
            }

            for (int i = 0; i < spawnZones.Length; i++)
            {
                if (spawnZones[i].Anchor == null)
                {
                    continue;
                }

                Gizmos.color = spawnZones[i].Owner == TitanId.Frost ? Color.cyan : Color.red;
                Gizmos.DrawWireSphere(spawnZones[i].Anchor.position, Mathf.Max(0.5f, spawnZones[i].Radius));
            }
        }
#endif
    }
}
