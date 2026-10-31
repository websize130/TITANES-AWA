/* Prueba de la migración de Supabase en un Postgres local (PGlite), con un esquema auth simulado.
 *   npm i --no-save @electric-sql/pglite@0.3.7 && node tests/migration.test.mjs
 */
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
const q = (s, p) => db.query(s, p);
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema extensions; create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public, extensions to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create publication supabase_realtime;
  -- pgcrypto no está en PGlite: digest() equivalente con sha256() del núcleo de Postgres.
  create function extensions.digest(t text, alg text) returns bytea language sql immutable as $$ select sha256(convert_to(t, 'UTF8')) $$;
`);
await db.exec(fs.readFileSync(new URL('../supabase/migrations/20261030120000_pokervegaspro.sql', import.meta.url), 'utf8').replace('create extension if not exists pgcrypto with schema extensions;', ''));
console.log('migración aplicada');

const users = [];
for (let i = 0; i < 17; i++) { const id = `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`; users.push(id); await q('insert into auth.users values ($1)', [id]); }
async function as(uid, sql, params) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await q(sql, params); } finally { await db.exec('reset role;'); }
}
const ok = (c, m) => { if (!c) { console.error('FALLO: ' + m); process.exit(1); } };

// Perfil + bono de bienvenida
const p = (await as(users[0], `select (pvp_ensure_profile('Josue')).*`)).rows[0];
ok(p.coins == 50000 && /^PVP-/.test(p.player_code), 'perfil con 50.000');
// RLS: no puede tocar monedas ni nivel directamente
let denied = false;
try { await as(users[0], `update pvp_profiles set coins = 999999999 where id = $1`, [users[0]]); } catch (e) { denied = true; }
ok(denied, 'el cliente no puede cambiar monedas');
await as(users[0], `update pvp_profiles set prefs = '{"a":1}' where id = $1`, [users[0]]);

// Recompensa diaria
const st = (await as(users[0], `select pvp_daily_status() s`)).rows[0].s;
const day = st.today;
const r = (await as(users[0], `select pvp_claim_daily() r`)).rows[0].r;
ok(Number(r.amount) === 4000 * 2 ** (day - 1), 'importe del día ' + day + ' = ' + r.amount);
let twice = false;
try { await as(users[0], `select pvp_claim_daily()`); } catch (e) { twice = /Ya reclamaste/.test(e.message); }
ok(twice, 'una sola vez por día');
const amounts = (await q(`select array_agg(pvp_daily_amount(d) order by d) a from generate_series(1,7) d`)).rows[0].a.map(Number);
ok(JSON.stringify(amounts) === JSON.stringify([4000, 8000, 16000, 32000, 64000, 128000, 256000]), 'escala x2: ' + amounts);

// damaocho: 15 canjes en total, sumando cuentas e invitados (sin registro).
async function anon(sql, params) {
  await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try { return await q(sql, params); } finally { await db.exec('reset role;'); }
}
let granted = 0, expired = '';
for (let i = 1; i <= 16; i++) await as(users[i], `select pvp_ensure_profile('Jugador${i}')`);
for (let i = 1; i <= 10; i++) { await as(users[i], `select pvp_redeem_code('damaocho')`); granted++; }
for (let g = 1; g <= 6; g++) {
  try { const r = (await anon(`select pvp_redeem_guest(' DamaOcho ', 'device-guest-${g}') r`)).rows[0].r; ok(r.tier === 'legend', 'invitado recibe Leyenda'); granted++; }
  catch (e) { expired = e.message; }
}
ok(granted === 15, 'damaocho se canjea 15 veces entre cuentas e invitados (fueron ' + granted + ')');
ok(/expirado/.test(expired), 'el 16º recibe «expirado»: ' + expired);
let guestTwice = false;
try { await anon(`select pvp_redeem_guest('damaocho', 'device-guest-1')`); } catch (e) { guestTwice = /Ya canjeaste|expirado/.test(e.message); }
ok(guestTwice, 'el mismo dispositivo no repite');
let anonDenied = false;
try { await anon(`select pvp_redeem_code('damaocho')`); } catch (e) { anonDenied = true; }
ok(anonDenied, 'pvp_redeem_code exige cuenta');
const tier = (await q(`select tier from pvp_profiles where id = $1`, [users[1]])).rows[0].tier;
ok(tier === 'legend', 'damaocho da Leyenda');
let again = false;
try { await as(users[1], `select pvp_redeem_code('DAMAOCHO')`); } catch (e) { again = /expirado|Ya canjeaste/.test(e.message); }
ok(again, 'no se puede repetir');
// El invitado que se registra conserva Leyenda sin gastar otro uso; el dispositivo no se puede reutilizar.
const claimed = (await as(users[11], `select pvp_claim_guest_codes('device-guest-1') t`)).rows[0].t;
ok(claimed === 'legend', 'la cuenta hereda Leyenda del invitado: ' + claimed);
const reuse = (await as(users[12], `select pvp_claim_guest_codes('device-guest-1') t`)).rows[0].t;
ok(reuse === 'free', 'un dispositivo ya traspasado no da Leyenda a otra cuenta: ' + reuse);
const uses = (await q(`select uses from pvp_codes where label = 'Creador'`)).rows[0].uses;
ok(uses === 15, 'usos totales 15: ' + uses);

// Compra pendiente → confirmación de admin
const pur = (await as(users[0], `select (pvp_create_purchase('legend')).*`)).rows[0];
ok(pur.status === 'pending' && Number(pur.amount) === 9.99, 'compra pendiente 9,99');
let notAdmin = false;
try { await as(users[0], `select pvp_admin_confirm_purchase($1)`, [pur.id]); } catch (e) { notAdmin = /administradores/.test(e.message); }
ok(notAdmin, 'solo un admin confirma');
await q(`update pvp_profiles set is_admin = true where id = $1`, [users[16]]);
await as(users[16], `select pvp_admin_confirm_purchase($1, 'TX123')`, [pur.id]);
const after = (await q(`select coins, tier from pvp_profiles where id = $1`, [users[0]])).rows[0];
ok(after.tier === 'legend' && Number(after.coins) === 50000 + Number(r.amount) + 2000000, 'pack entregado: ' + JSON.stringify(after));
await as(users[16], `select pvp_admin_confirm_purchase($1)`, [pur.id]); // idempotente
const after2 = (await q(`select coins from pvp_profiles where id = $1`, [users[0]])).rows[0];
ok(Number(after2.coins) === Number(after.coins), 'confirmar dos veces no duplica');
// Juego: límites
let range = false;
try { await as(users[0], `select pvp_adjust_coins(7000000, 'cash_out')`); } catch (e) { range = /fuera de rango/.test(e.message); }
ok(range, 'límite por movimiento');
console.log('OK — migración válida: RLS, recompensa diaria x2 (hoy día ' + day + '), damaocho 15 usos (cuentas + invitados), compras y admin.');
