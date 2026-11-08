// Modo TV: empareja una pantalla grande (TV) con un móvil que hace de mando.
// El servidor solo reenvía: entradas del mando -> TV y vibración/estado TV -> mando.
import { MSG } from '../public/src/net/protocol.js';

/** code -> { tv: Client, pad: Client|null } */
const sessions = new Map();

function newCode() {
  for (let i = 0; i < 50; i++) {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    if (!sessions.has(code)) return code;
  }
  return null;
}

export function handleTv(client, msg) {
  switch (msg.t) {
    case MSG.TV_HOST: {
      dropTv(client);
      const code = newCode();
      if (!code) return;
      sessions.set(code, { tv: client, pad: null });
      client.tv = { code, role: 'tv' };
      client.send({ t: MSG.TV_CODE, code });
      break;
    }
    case MSG.TV_JOIN: {
      const code = String(msg.code ?? '').replace(/\D/g, '').slice(0, 4);
      const s = sessions.get(code);
      if (!s) {
        client.send({ t: MSG.ERROR, code: 'tv', msg: 'No hay ninguna TV con ese código.' });
        return;
      }
      if (s.pad && s.pad !== client) s.pad.send({ t: MSG.TV_LOST });
      dropTv(client);
      s.pad = client;
      client.tv = { code, role: 'pad' };
      client.send({ t: MSG.TV_PAIRED, role: 'pad', code });
      s.tv.send({ t: MSG.TV_PAIRED, role: 'tv', code });
      break;
    }
    case MSG.TV_INPUT: {
      // Mando -> TV (se reenvía tal cual tras validar la forma).
      if (client.tv?.role !== 'pad') return;
      const s = sessions.get(client.tv.code);
      if (!s || s.pad !== client) return;
      const m = Array.isArray(msg.m) ? msg.m.slice(0, 2).map(clampNum) : [0, 0];
      const l = Array.isArray(msg.l) ? msg.l.slice(0, 2).map(clampNum) : [0, 0];
      const b = Number.isInteger(msg.b) ? msg.b & 0xffff : 0;
      s.tv.send({ t: MSG.TV_INPUT, m, l, b });
      break;
    }
    case MSG.TV_FEEDBACK: {
      // TV -> mando (vibración y estado para pintar los botones).
      if (client.tv?.role !== 'tv') return;
      const s = sessions.get(client.tv.code);
      if (!s?.pad) return;
      const out = { t: MSG.TV_FEEDBACK };
      if (Array.isArray(msg.hap)) out.hap = msg.hap.slice(0, 6).map((n) => Math.max(0, Math.min(400, Number(n) || 0)));
      if (msg.st && typeof msg.st === 'object') {
        // Solo campos conocidos y acotados (estado para pintar el mando).
        const st = msg.st;
        out.st = {
          mode: String(st.mode ?? '').slice(0, 12),
          icon: String(st.icon ?? '').slice(0, 8),
          ability: String(st.ability ?? '').slice(0, 24),
          accent: /^#[0-9a-f]{6}$/i.test(st.accent) ? st.accent : '#ffc94a',
          cookies: Number.isInteger(st.cookies) ? st.cookies : 0,
          prompt: String(st.prompt ?? '').slice(0, 32),
        };
      }
      s.pad.send(out);
      break;
    }
    default: break;
  }
}

function clampNum(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(-5, Math.min(5, Math.round(v * 1000) / 1000)) : 0;
}

/** Al desconectarse (o re-emparejarse) se avisa a la otra parte. */
export function dropTv(client) {
  const info = client.tv;
  if (!info) return;
  const s = sessions.get(info.code);
  client.tv = null;
  if (!s) return;
  if (info.role === 'tv' && s.tv === client) {
    s.pad?.send({ t: MSG.TV_LOST });
    if (s.pad) s.pad.tv = null;
    sessions.delete(info.code);
  } else if (info.role === 'pad' && s.pad === client) {
    s.pad = null;
    s.tv.send({ t: MSG.TV_LOST });
  }
}
