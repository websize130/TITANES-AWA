// Qué pasa al hablar con cada personaje (según su rol en NpcData).
import { MASTER_TIPS } from './NpcData.js';
import { GOLDEN_BONES, GUARDIAN_REWARDS } from '../worlds/GoldenBones.js';
import { COSMETIC_BY_ID } from '../cosmetics/CosmeticData.js';

const DAILY_GIFT = 15;
const MAGIC_COOLDOWN_MS = 60000;

/** game: instancia de Game (wallet, dialog, hud, shop, abilities…). entry: { def, npc } */
export function interactWithNpc(game, entry) {
  const { def, npc } = entry;
  const w = game.wallet;
  const speaker = { name: def.name, title: def.title, portrait: def.portrait, color: def.color };
  entry.talked = true;
  npc.wave();
  const say = (pages, onClose) => game.dialog.open(pages, onClose, speaker);

  switch (def.role) {
    case 'shop':
      say([def.greeting], () => game.openShop());
      break;

    case 'bakery': {
      const today = new Date().toISOString().slice(0, 10);
      const pages = [def.greeting];
      if (w.flag('bakeryDay') !== today) {
        pages.push(`¡Toma, tu bandeja del día: ${DAILY_GIFT} galletas recién horneadas! 🍪`);
        say(pages, () => {
          w.flag('bakeryDay', today);
          w.addCookies(DAILY_GIFT);
          game.effects.emit('confetti', npc.root.position.x, npc.root.position.y + 2, npc.root.position.z);
          game.hud.toast(`+${DAILY_GIFT} 🍪 de Chalai`, 2000);
        });
      } else {
        pages.push('Las galletas sueltas por el castillo vuelven a salir del horno cada poquito. ¡Y los tesoros y las reliquias dan muchas más!');
        pages.push('Vuelve mañana y tendré otra bandeja para ti. 💕');
        say(pages);
      }
      break;
    }

    case 'master': {
      const i = (w.flag('tip') ?? 0) % MASTER_TIPS.length;
      w.flag('tip', i + 1);
      say([def.greeting, `Lección ${i + 1}: ${MASTER_TIPS[i]}`, 'Vuelve cuando quieras otra lección. Hiiii-ya! 🥋']);
      break;
    }

    case 'guardian': {
      const have = w.golden.size;
      const total = GOLDEN_BONES.length;
      const pages = [def.greeting, `Llevas ${have} de ${total} Huesos Dorados.`];
      const pending = GUARDIAN_REWARDS.filter((r) => have >= r.count && !w.owned.has(r.item));
      const next = GUARDIAN_REWARDS.find((r) => have < r.count);
      if (pending.length) {
        pages.push(`¡Bien hecho! Por tu valor te entrego: ${pending.map((r) => `${COSMETIC_BY_ID[r.item].icon} ${COSMETIC_BY_ID[r.item].name}`).join(' y ')}. Póntelo en la tienda de Cheila.`);
      } else if (next) {
        pages.push(`Cuando tengas ${next.count}, te daré ${COSMETIC_BY_ID[next.item].icon} ${COSMETIC_BY_ID[next.item].name}.`);
      } else {
        pages.push('¡Tienes todos los Huesos Dorados! Eres un auténtico caballero del castillo. 🦁');
      }
      const missing = GOLDEN_BONES.find((b) => !w.hasGolden(b.id));
      if (missing) pages.push(`Una pista: hay uno ${missing.hint}.`);
      say(pages, () => {
        for (const r of pending) w.grant(r.item);
        if (pending.length) {
          game.hud.toast(`🎁 Nueva recompensa de Josh: ${pending.map((r) => COSMETIC_BY_ID[r.item].name).join(', ')}`, 3000);
          game.effects.emit('gold', npc.root.position.x, npc.root.position.y + 2, npc.root.position.z);
        }
      });
      break;
    }

    case 'pixel': {
      const pages = [def.greeting,
        'Abre el menú en la tele o el ordenador y pulsa «📺 Modo TV»: verás un código de 4 cifras.',
        'En tu móvil, abre el juego y pulsa «🎮 Usar como mando», escribe el código… ¡y listo! El móvil vibra y tiene botones enormes.'];
      const gift = !w.owned.has('pixel_glasses');
      if (gift) pages.push('Y toma, unas gafas pixeladas de regalo. ¡Así ves el mundo como yo! 🟫');
      say(pages, () => {
        if (gift && w.grant('pixel_glasses')) game.hud.toast('🎁 ¡Gafas pixeladas! Póntelas en la tienda de Cheila', 2600);
      });
      break;
    }

    case 'magic': {
      const last = w.flag('magicAt') ?? 0;
      if (Date.now() - last > MAGIC_COOLDOWN_MS) {
        say([def.greeting, '¡Por la luna roja… que tus patas vuelen! 🌙✨ (súper salto durante 20 segundos)'], () => {
          w.flag('magicAt', Date.now());
          game.abilities.partyT = Math.max(game.abilities.partyT, 20);
          const p = game.player.position;
          game.effects.emit('confetti', p.x, p.y + 1.5, p.z);
          game.effects.emit('sparkle', p.x, p.y + 1, p.z);
        });
      } else {
        say(['La luna necesita descansar un poquito… vuelve en un minuto y te lanzo otra bendición. 🌙']);
      }
      break;
    }
    default:
      say([def.greeting]);
  }
}
