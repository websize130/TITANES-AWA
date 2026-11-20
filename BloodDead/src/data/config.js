/* =====================================================================
   CONFIGURACIÓN Y DATOS
   ===================================================================== */
export const CONFIG = {
  title: 'BLOOD DEAD',
  render: { exposure: 1.05, fogColor: 0x0d1418, fogDensity: 0.052, far: 140 },
  lighting: { moon: 0.55, moonColor: 0x9fb4d6, moonDir: [0.42, -1, 0.58], fire: 20, fill: 1.2 },
  // Movimiento estilo CoD Mobile: +35 % de velocidad, aceleración casi instantánea, agacharse y deslizamiento táctico
  player: { radius: 0.34, speedMult: 1.35, accel: 42, decel: 26, turnSpeed: 14, aimSpeedMult: 0.62, crouchMult: 0.55, runDrain: 24, regenDelay: 0.9, slide: { time: 0.75, boost: 1.45, cd: 0.85, friction: 1.6, steer: 3 } },
  // FOV horizontal (referencia 4:3, como en CoD): 80 → 60 al apuntar en 0,17 s
  camera: { fov: 80, aimFov: 60, runFov: 6, slideFov: 6, adsTime: 0.17, crouchDrop: 0.42, slideDrop: 0.6, minVFov: 34, maxVFov: 76, pivot: 1.5, distance: 2.4, aimDistance: 1.2, shoulder: 0.56, aimShoulder: 0.66, lift: 0.1, minPitch: -1.0, maxPitch: 0.8, pad: 0.22 },
  flashlight: { color: 0xffeedd, intensity: 105, distance: 34, angle: 0.43, penumbra: 0.55, beamLength: 9, beamOpacity: 0.075, drain: 0.12 },
  input: { mouse: 0.0022, touch: 0.0058 },
  weapon: { damage: 34 }, // daño base de la pistola (ver WEAPONS)
  knife: { damage: 60, range: 1.8, arc: 1.1, time: 0.3, hitAt: 0.38, cooldown: 0.28, cancel: 0.62 }, // tajo rápido sin recuperación rígida: a partir del 62 % se puede encadenar o disparar
  pad: { look: 2.9, deadzone: 0.16, aimSlow: 0.5 }, // mandos: velocidad de cámara (rad/s), zona muerta y ralentización al apuntar
  coop: { respawn: 35, revive: 2.4, reviveHp: 0.5 }, // dúo: segundos hasta reaparecer junto al compañero
};

export const QUALITY = {
  alto: { label: 'Alto', pixelRatio: 2, csmCascades: 3, csmMapSize: 2048, spotMapSize: 2048, dust: 900, zombies: 12, gore: { blood: 640, splat: 140, drops: 140, wall: 60, wounds: 220, gibs: 64, corpses: 48 } },
  medio: { label: 'Medio', pixelRatio: 1.5, csmCascades: 2, csmMapSize: 1024, spotMapSize: 1024, dust: 500, zombies: 9, gore: { blood: 440, splat: 100, drops: 100, wall: 40, wounds: 160, gibs: 48, corpses: 32 } },
  bajo: { label: 'Bajo', pixelRatio: 1, csmCascades: 0, csmMapSize: 0, spotMapSize: 512, dust: 250, zombies: 7, gore: { blood: 280, splat: 64, drops: 64, wall: 24, wounds: 110, gibs: 32, corpses: 20 } },
};
