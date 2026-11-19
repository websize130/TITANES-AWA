// Mascotas evolutivas: cada forajido tiene la suya. Crecen con el nivel (NV) del forajido:
// más tamaño, aura de tinta y potencia. Apoyan sin pasarse el nivel solas.
// attack: lunge (embestida a ras de suelo) · swoop (picotazo en picado) · bolt (proyectil de tinta)
// power: poder secundario automático con su propio enfriamiento (powerCd, s), independiente del ataque.
//   knock (empuje en área) · shield (escudo temporal) · loot (atrae botín) · slow (ralentiza en área)
export const PETS = {
  silas: {
    id: 'hound', name: 'Huesos', kind: 'Sabueso espectral', fly: false, attack: 'lunge',
    dmg: 11, cd: 1.25, speed: 460, range: 230,
    power: { id: 'knock', name: 'Aullido de Ultratumba', desc: 'Empuja y aturde a la horda que rodea a Silas.', radius: 170 }, powerCd: 9,
    desc: 'Un perro que murió en Boot Hill con su amo y volvió con él. Embiste a los muertos que se acercan demasiado.',
  },
  maeve: {
    id: 'cat', name: 'Medianoche', kind: 'Gato negro de la Sota', fly: false, attack: 'bolt',
    dmg: 8.5, cd: 1.05, speed: 520, range: 280,
    power: { id: 'shield', name: 'Siete Vidas', desc: 'Escudo de tinta que absorbe daño durante 6 s.', time: 6 }, powerCd: 16,
    desc: 'Gato negro con un naipe de picas en el collar. Escupe gotas de tinta maldita a lo que mira mal a Maeve.',
  },
  caleb: {
    id: 'crow', name: 'Nevermore', kind: 'Cuervo sombrío', fly: true, attack: 'swoop',
    dmg: 7.5, cd: 0.85, speed: 560, range: 260,
    power: { id: 'loot', name: 'Rapiña del Cuervo', desc: 'Trae almas, naipes y botín lejanos; cada pieza suma oro.', radius: 520 }, powerCd: 7,
    desc: 'Le recita sus versos al oído. Cae en picado sobre ojos y gargantas, y vuelve al hombro del poeta.',
  },
  barnaby: {
    id: 'hawk', name: 'Don Carroña', kind: 'Halcón del desierto', fly: true, attack: 'bolt',
    dmg: 9, cd: 1.1, speed: 600, range: 300,
    power: { id: 'slow', name: 'Sombra del Halcón', desc: 'Su sombra cae sobre la horda y la ralentiza 3 s.', radius: 160 }, powerCd: 10,
    desc: 'Halcón de cetrería que solo ríe los chistes de Barnaby. Lanza plumas de tinta afiladas como cuchillas.',
  },
};

export const PET_TIER = ['Cría', 'Curtida', 'Leyenda'];
export function petTier(level) { return level >= 30 ? 2 : level >= 10 ? 1 : 0; }
// Potencia por nivel del forajido: daño +2 %/NV, tamaño hasta ×1,38, recarga algo más rápida.
export function petStats(heroId, level) {
  const P = PETS[heroId], L = Math.max(1, level | 0), tier = petTier(L);
  return {
    def: P, tier, level: L,
    dmg: Math.round(P.dmg * (1 + (L - 1) * 0.02) * 10) / 10,
    cd: P.cd * (1 - Math.min(0.3, (L - 1) * 0.006)),
    size: 1 + Math.min(0.38, (L - 1) * 0.008),
    powerCd: P.powerCd * (1 - tier * 0.1), // cada evolución acorta un 10 % el poder
    shield: Math.round(18 + L * 0.9),
  };
}
