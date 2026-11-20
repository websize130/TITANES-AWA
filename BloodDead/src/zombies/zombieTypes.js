/* =====================================================================
   INFECTADOS
   ZombieFactory → cuerpo esculpido en UNA SkinnedMesh por zombi (1 draw call),
                   color por vértice: piel podrida, ropa rasgada, sangre, suciedad
   Zombie        → IA: patrulla, vista (cono + línea de visión), oído (disparos y
                   pasos), persecución, ataque cuerpo a cuerpo, aturdimiento, caída
   ZombieSystem  → oleadas, impactos por raycast (cabeza/cuerpo), sangre, monedas
   ===================================================================== */
export const ZOMBIE_TYPES = {
  common: { name: 'Aldeano', hp: 100, walk: 0.5, chase: 1.35, dmg: 14, range: 1.25, windup: 0.5, recover: 0.75, cooldown: 0.6, sight: 15, fov: 1.0, hear: 1, radius: 0.3, head: 0.145, body: 0.25, leg: 0.1, headMult: 2.5, stagger: 0.35, coins: [5, 10], eyeH: 1.6, turn: 5 },
  runner: { name: 'Corredor', hp: 55, walk: 0.9, chase: 4.3, dmg: 10, range: 1.2, windup: 0.3, recover: 0.5, cooldown: 0.35, sight: 20, fov: 1.35, hear: 1.6, radius: 0.32, head: 0.135, body: 0.21, leg: 0.09, headMult: 2.5, stagger: 0.22, coins: [8, 14], lunge: 3.4, eyeH: 0.72, turn: 9 },
  bloater: { name: 'Hinchado', hp: 380, walk: 0.4, chase: 0.85, dmg: 28, range: 1.75, windup: 0.95, recover: 1.0, cooldown: 1.2, sight: 12, fov: 0.85, hear: 0.8, radius: 0.6, head: 0.18, body: 0.5, leg: 0.14, headMult: 2.0, stagger: 0.12, coins: [25, 40], burst: { radius: 3.4, dmg: 32 }, eyeH: 1.72, turn: 2.5 },
  // Jefes finales (y versiones reducidas como infectados fuertes de supervivencia)
  subject: { name: 'El Sujeto 0', epithet: 'Abominación de laboratorio', boss: true, hp: 1150, walk: 0.75, chase: 1.9, dmg: 22, range: 1.8, windup: 0.5, recover: 0.6, cooldown: 0.7, sight: 32, fov: 1.8, hear: 2, radius: 0.5, head: 0.17, body: 0.34, leg: 0.13, headMult: 1.8, stagger: 0, coins: [60, 90], eyeH: 1.55, turn: 5, mass: 5,
    tip: 'Su placa de hueso aguanta de frente: esquiva la embestida, que se estrelle contra un muro y dispárale por la espalda',
    ability: { kind: 'charge', windup: 0.95, speed: 9, dur: 1.5, dmg: 30, stun: 2.8, cd: [4.5, 7.5] } },
  stalker: { name: 'El Acometedor de Sombras', epithet: 'Acecha en los callejones', boss: true, hp: 1500, walk: 1.2, chase: 3.3, dmg: 22, range: 1.8, windup: 0.32, recover: 0.45, cooldown: 0.55, sight: 40, fov: 3, hear: 2, radius: 0.36, head: 0.15, body: 0.27, leg: 0.11, headMult: 2.4, stagger: 0, coins: [60, 90], eyeH: 1.9, turn: 9, mass: 3,
    tip: 'Casi invisible en la oscuridad: apúntale con la linterna para revelarlo y castígalo justo después de su embestida',
    ability: { kind: 'stalk', pounce: 11, pdmg: 26, exposed: 3.4, cloakT: [4, 6.5], reveal: 14 } },
  behemoth: { name: 'El Behemoth Industrial', epithet: 'Placas de acero y cadenas', boss: true, hp: 2400, armor: 900, walk: 0.5, chase: 1.05, dmg: 30, range: 2.6, windup: 0.95, recover: 0.9, cooldown: 1.1, sight: 34, fov: 1.8, hear: 1.5, radius: 0.62, head: 0.2, body: 0.46, leg: 0.17, headMult: 2.0, stagger: 0, coins: [100, 140], eyeH: 1.65, turn: 2.4, mass: 10,
    tip: 'Revienta sus placas a balazos para exponer la carne. Aléjate cuando alce los brazos o haga girar las cadenas',
    ability: { kind: 'slam', windup: 1.2, recover: 1.0, radius: 8, dmg: 28, cd: [5, 8], chain: { range: 9, arc: 1.15, dmg: 24, windup: 0.85, cd: [4, 6.5] } } },
  queen: { name: 'La Reina de la Cripta', epithet: 'Madre del enjambre', boss: true, hp: 2600, walk: 0.8, chase: 1.75, dmg: 24, range: 2.5, windup: 0.6, recover: 0.7, cooldown: 0.8, sight: 32, fov: 2.4, hear: 2.4, radius: 0.85, head: 0.17, body: 0.32, leg: 0.05, headMult: 2.2, stagger: 0, coins: [100, 140], eyeH: 1.85, turn: 4, mass: 8,
    extraZones: [{ bone: 'hips', off: [0, 0.02, -0.62], r: 0.52, zone: 'body' }],
    tip: 'Pare enjambres de crías: acaba con ellas a cuchillo o a tiros y esquiva su ácido. Su cabeza es el punto débil',
    ability: { kind: 'brood', spit: { windup: 0.7, radius: 3.2, dur: 7, dps: 5, cd: [5, 8], acid: true }, brood: { n: 12, windup: 0.9, cd: [9, 13] } } },
  alpha: { name: 'El Parásito Alpha', epithet: 'Núcleo biomecánico', boss: true, hp: 9000, walk: 0.35, chase: 0.8, dmg: 40, range: 4.4, windup: 1.0, recover: 1.0, cooldown: 1.3, sight: 60, fov: 3.2, hear: 3, radius: 0.6, head: 0.2, body: 0.5, leg: 0.17, headMult: 1, core: 0.13, stagger: 0, coins: [250, 320], eyeH: 1.7, turn: 1.6, mass: 80, leash: 7, phases: true,
    pods: [{ bone: 'shoulderL', off: [0.03, 0.07, -0.05], r: 0.12 }, { bone: 'shoulderR', off: [-0.03, 0.07, -0.05], r: 0.12 }, { bone: 'chest', off: [0, 0.44, -0.2], r: 0.13 }], podHp: 520,
    tip: 'Fase 1: activa los nodos para tumbar el escudo. Fase 2: revienta sus vainas. Fase 3: vacía el cargador en el núcleo',
    ability: { kind: 'slam', windup: 1.25, recover: 1.1, radius: 11, dmg: 30, cd: [6, 9], spit: { windup: 0.8, radius: 3.6, dur: 7, dps: 5, cd: [6, 9], acid: true } } },
};
export const ZFACE = { cw: 1, fw: 0.96, jawW: 1.0, jawR: 0.016, chinW: 0.95, chinZ: 1.0, cheek: 1.2, fat: 0.4, brow: 1.15, noseL: 0.92, noseW: 1.0, lips: 0.75 };
export const ZOMBIE_VARIANTS = {
  villager: { type: 'common', scale: 1.0, bw: 1.0, hw: 1.0, upper: 0.335, fore: 0.3, thigh: 0.43, shin: 0.37, neck: 0.64, skin: 0x7c786c, hairCol: 0x3a342c, hair: 'sparse', outfit: 'villager', mouth: 1.9, mw: 1.25, jaw: 0.006, face: ZFACE },
  woman: { type: 'common', scale: 0.94, bw: 0.88, hw: 1.06, female: true, upper: 0.32, fore: 0.29, thigh: 0.42, shin: 0.36, neck: 0.635, skin: 0x847a73, mouth: 2.1, mw: 1.2, jaw: -0.005, hairCol: 0x2a1e16, hair: 'long', outfit: 'casual', face: { ...ZFACE, cw: 0.96, fw: 0.92, jawW: 0.86, jawR: 0.013, chinW: 0.82, brow: 0.6, noseL: 0.88, noseW: 0.84, lips: 1.0 } },
  police: { type: 'common', scale: 1.06, bw: 1.15, hw: 1.08, upper: 0.33, fore: 0.3, thigh: 0.43, shin: 0.37, neck: 0.63, skin: 0x6c6961, mouth: 1.7, mw: 1.3, jaw: 0.008, hairCol: 0x1c1814, hair: 'buzz', outfit: 'police', face: { ...ZFACE, jawW: 1.12, jawR: 0.019, chinW: 1.1, fat: 0.6, brow: 1.3 } },
  runner: { type: 'runner', scale: 1.0, bw: 0.8, hw: 0.84, upper: 0.37, fore: 0.35, thigh: 0.46, shin: 0.43, neck: 0.62, skin: 0x9c968e, hairCol: 0x2a2420, hair: 'none', outfit: 'rags', ribs: true, mouth: 2.6, mw: 1.5, jaw: -0.006, face: { ...ZFACE, fat: 0.2, cheek: 1.3, fw: 0.9, jawW: 0.92 } },
  bloater: { type: 'bloater', scale: 1.12, bw: 1.75, hw: 1.55, upper: 0.29, fore: 0.25, thigh: 0.4, shin: 0.35, neck: 0.53, skin: 0x7c5e52, hairCol: 0x2a2420, hair: 'none', outfit: 'bloater', mouth: 1.6, mw: 1.4, jaw: 0.004, face: { ...ZFACE, cw: 0.95, fw: 1.25, jawW: 1.35, jawR: 0.02, chinW: 1.2, fat: 1.7, brow: 1.3, noseW: 1.25, lips: 1.2 } },
  // Jefes (se esculpen al cargar el capítulo que los necesita)
  // El Sujeto 0 (rediseño): mole encorvada y simiesca, brazos hipertrofiados, cráneo abierto y mandíbulas óseas; conserva la placa de hueso frontal
  subject: { type: 'subject', boss: true, scale: 1.72, bw: 1.62, hw: 1.38, upper: 0.42, fore: 0.43, thigh: 0.41, shin: 0.36, neck: 0.6, skin: 0x8d7a74, hairCol: 0x222222, hair: 'none', outfit: 'lab', mouth: 1.45, mw: 1.15, jaw: 0.004, arm: 1.75, legT: 1.75, muscle: 1, face: { ...ZFACE, fat: 0.0, brow: 1.9, jawW: 1.05, chinW: 0.85, cheek: 1.25, fw: 0.86, noseL: 0.55, noseW: 0.8 } },
  stalker: { type: 'stalker', boss: true, cloak: true, scale: 1.55, bw: 0.74, hw: 0.78, upper: 0.42, fore: 0.42, thigh: 0.5, shin: 0.49, neck: 0.7, skin: 0x2e2926, hairCol: 0x111111, hair: 'none', outfit: 'shadow', mouth: 3.3, mw: 1.65, jaw: -0.012, arm: 0.78, legT: 0.78, face: { ...ZFACE, fat: 0.05, cheek: 1.65, fw: 0.82, jawW: 0.85, brow: 1.45, noseL: 0.6, noseW: 0.7 } },
  behemoth: { type: 'behemoth', boss: true, scale: 1.95, bw: 1.7, hw: 1.35, upper: 0.36, fore: 0.34, thigh: 0.44, shin: 0.38, neck: 0.58, skin: 0x6a5448, hairCol: 0x111111, hair: 'none', outfit: 'colossus', mouth: 1.8, mw: 1.6, jaw: 0.014, arm: 2.0, legT: 1.5, face: { ...ZFACE, fw: 1.1, jawW: 1.45, chinW: 1.3, fat: 0.9, brow: 1.6, noseW: 1.3 } },
  queen: { type: 'queen', boss: true, noLegs: true, scale: 1.35, bw: 1.05, hw: 1.0, upper: 0.38, fore: 0.38, thigh: 0.5, shin: 0.55, neck: 0.66, skin: 0x6f6258, hairCol: 0x1a1410, hair: 'long', female: true, outfit: 'queen', mouth: 3.1, mw: 1.55, jaw: 0, arm: 0.9, legT: 1, face: { ...ZFACE, cw: 0.96, fw: 0.9, jawW: 0.86, jawR: 0.013, chinW: 0.82, brow: 0.7, fat: 0.1, cheek: 1.65, noseL: 0.8, noseW: 0.8, lips: 0.9 } },
  alpha: { type: 'alpha', boss: true, scale: 3.1, bw: 1.6, hw: 1.3, upper: 0.35, fore: 0.33, thigh: 0.44, shin: 0.38, neck: 0.6, skin: 0x4a3530, hairCol: 0x111111, hair: 'none', outfit: 'titan', mouth: 3.0, mw: 1.85, jaw: 0.018, arm: 1.9, legT: 1.5, face: { ...ZFACE, fw: 1.1, jawW: 1.45, chinW: 1.3, fat: 0.6, brow: 1.6, noseW: 1.3 } },
};
export const DIRECTOR = { target: 5, every: [5, 10], groups: null, minDist: 14, weights: { villager: 1, woman: 1, police: 1, runner: 0.6, bloater: 0.25 }, mult: { spd: 1, dmg: 1, hp: 1 }, fury: false, aggro: 0.6, paused: false, cull: true };
