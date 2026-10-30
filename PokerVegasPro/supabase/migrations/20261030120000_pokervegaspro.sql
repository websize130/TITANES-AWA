-- PokerVegasPro · esquema de Supabase
-- Prefijo pvp_ para convivir con otras apps del mismo proyecto. Sin triggers en auth.users:
-- el perfil se crea con pvp_ensure_profile() al iniciar sesión por primera vez.
--
-- Seguridad:
--  * El cliente solo puede LEER su perfil y ACTUALIZAR columnas cosméticas (prefs, stats, adv, xp).
--  * Monedas, nivel (tier), compras y códigos solo cambian mediante funciones SECURITY DEFINER.
--  * Precios y recompensas de los packs viven aquí (pvp_pack_info), no en el navegador.

create extension if not exists pgcrypto with schema extensions;

-- ===================== Tablas =====================

create table if not exists public.pvp_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null check (username ~ '^[A-Za-z0-9À-ÿ._-]{3,16}$'),
  player_code text not null unique,
  coins       bigint not null default 0 check (coins >= 0),
  tier        text not null default 'free' check (tier in ('free', 'elite', 'legend')),
  xp          integer not null default 0 check (xp >= 0),
  prefs       jsonb not null default '{}'::jsonb,
  stats       jsonb not null default '{}'::jsonb,
  adv         jsonb,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists pvp_profiles_username_lower on public.pvp_profiles (lower(username));

create table if not exists public.pvp_purchases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.pvp_profiles (id) on delete cascade,
  pack         text not null check (pack in ('elite', 'legend')),
  amount       numeric(10, 2) not null,
  currency     text not null default 'EUR',
  provider     text not null default 'paypal_me',   -- paypal_me | manual | stripe | paypal_checkout
  reference    text not null unique,                -- lo que el jugador escribe en la nota del pago
  provider_ref text,                                -- id de transacción de PayPal / Stripe
  status       text not null default 'pending' check (status in ('pending', 'paid', 'rejected', 'cancelled')),
  admin_note   text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.pvp_profiles (id)
);
create unique index if not exists pvp_purchases_one_pending on public.pvp_purchases (user_id, pack) where status = 'pending';
create index if not exists pvp_purchases_status on public.pvp_purchases (status, created_at desc);
create index if not exists pvp_purchases_user on public.pvp_purchases (user_id, created_at desc);

create table if not exists public.pvp_coin_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.pvp_profiles (id) on delete cascade,
  delta      bigint not null,
  balance    bigint not null,
  reason     text not null,
  ref        text,
  created_at timestamptz not null default now()
);
create index if not exists pvp_coin_ledger_user on public.pvp_coin_ledger (user_id, created_at desc);

-- Códigos promocionales y de creador: solo se guarda el hash SHA-256 del código.
create table if not exists public.pvp_codes (
  code_hash   text primary key,
  label       text not null default '',
  kind        text not null default 'promo' check (kind in ('promo', 'creator')),
  coins       bigint not null default 0 check (coins >= 0),
  grants_tier text check (grants_tier in ('elite', 'legend')),
  max_uses    integer,
  uses        integer not null default 0,
  active      boolean not null default true,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.pvp_redemptions (
  user_id    uuid not null references public.pvp_profiles (id) on delete cascade,
  code_hash  text not null references public.pvp_codes (code_hash) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, code_hash)
);
create index if not exists pvp_redemptions_code on public.pvp_redemptions (code_hash);

-- ===================== Utilidades =====================

create or replace function public.pvp_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.pvp_profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.pvp_tier_rank(p_tier text)
returns integer language sql immutable set search_path = '' as $$
  select case p_tier when 'legend' then 2 when 'elite' then 1 else 0 end;
$$;

-- Fuente única de precios y recompensas (pago único y permanente).
create or replace function public.pvp_pack_info(p_pack text, out price numeric, out coins bigint)
language sql immutable set search_path = '' as $$
  select case p_pack when 'elite' then 4.99 when 'legend' then 9.99 end::numeric,
         case p_pack when 'elite' then 500000 when 'legend' then 2000000 end::bigint;
$$;

create or replace function public.pvp_random_code(p_prefix text)
returns text language sql volatile set search_path = '' as $$
  select p_prefix || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
  from generate_series(1, 6);
$$;

create or replace function public.pvp_hash_code(p_code text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')), 'sha256'), 'hex');
$$;

-- Movimiento de monedas con registro (uso interno).
create or replace function public.pvp__move_coins(p_user uuid, p_delta bigint, p_reason text, p_ref text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_balance bigint;
begin
  update public.pvp_profiles set coins = coins + p_delta, updated_at = now()
   where id = p_user and coins + p_delta >= 0
  returning coins into v_balance;
  if v_balance is null then
    raise exception 'Saldo insuficiente' using errcode = 'P0001';
  end if;
  insert into public.pvp_coin_ledger (user_id, delta, balance, reason, ref) values (p_user, p_delta, v_balance, p_reason, p_ref);
  return v_balance;
end $$;

-- Entrega de un pack: monedas permanentes + nivel (nunca baja de nivel). Uso interno.
create or replace function public.pvp__grant_pack(p_user uuid, p_pack text, p_reason text, p_ref text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_coins bigint;
begin
  select coins into v_coins from public.pvp_pack_info(p_pack);
  if v_coins is null then raise exception 'Pack desconocido' using errcode = 'P0001'; end if;
  perform public.pvp__move_coins(p_user, v_coins, p_reason, p_ref);
  update public.pvp_profiles
     set tier = case when public.pvp_tier_rank(p_pack) > public.pvp_tier_rank(tier) then p_pack else tier end,
         updated_at = now()
   where id = p_user;
end $$;

-- ===================== Jugador =====================

create or replace function public.pvp_username_available(p_username text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.pvp_profiles where lower(username) = lower(trim(p_username)));
$$;

-- Crea el perfil la primera vez (bono de bienvenida de 50.000 monedas) o devuelve el existente.
create or replace function public.pvp_ensure_profile(p_username text)
returns public.pvp_profiles language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_row public.pvp_profiles;
  v_name text := trim(coalesce(p_username, ''));
  v_code text;
begin
  if v_uid is null then raise exception 'No autenticado' using errcode = '28000'; end if;
  select * into v_row from public.pvp_profiles where id = v_uid;
  if found then return v_row; end if;

  if v_name !~ '^[A-Za-z0-9À-ÿ._-]{3,16}$' then
    v_name := 'Jugador_' || substr(replace(v_uid::text, '-', ''), 1, 6);
  end if;
  if exists (select 1 from public.pvp_profiles where lower(username) = lower(v_name)) then
    v_name := left(v_name, 11) || '_' || substr(replace(v_uid::text, '-', ''), 1, 4);
  end if;
  loop
    v_code := public.pvp_random_code('PVP-');
    exit when not exists (select 1 from public.pvp_profiles where player_code = v_code);
  end loop;

  insert into public.pvp_profiles (id, username, player_code, coins) values (v_uid, v_name, v_code, 0)
  returning * into v_row;
  perform public.pvp__move_coins(v_uid, 50000, 'signup_bonus');
  select * into v_row from public.pvp_profiles where id = v_uid;
  return v_row;
end $$;

-- Movimientos de monedas del juego (entradas, cobros, premios). El juego contra bots corre en el navegador,
-- así que aquí solo se aplican límites de cordura y queda todo registrado.
create or replace function public.pvp_adjust_coins(p_delta bigint, p_reason text)
returns bigint language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'No autenticado' using errcode = '28000'; end if;
  if p_reason not in ('buy_in', 'cash_out', 'rebuy', 'tournament_fee', 'tournament_prize', 'bounty') then
    raise exception 'Motivo no válido' using errcode = 'P0001';
  end if;
  if p_delta > 6000000 or p_delta < -100000000 then
    raise exception 'Movimiento fuera de rango' using errcode = 'P0001';
  end if;
  return public.pvp__move_coins(auth.uid(), p_delta, p_reason);
end $$;

-- Solicita la compra de un pack (pago único). Devuelve la compra pendiente (o la ya existente).
create or replace function public.pvp_create_purchase(p_pack text, p_provider text default 'paypal_me')
returns public.pvp_purchases language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_tier text;
  v_row public.pvp_purchases;
  v_ref text;
  v_price numeric;
begin
  if v_uid is null then raise exception 'No autenticado' using errcode = '28000'; end if;
  select price into v_price from public.pvp_pack_info(p_pack);
  if v_price is null then raise exception 'Pack desconocido' using errcode = 'P0001'; end if;
  if p_provider not in ('paypal_me', 'stripe', 'paypal_checkout') then raise exception 'Proveedor no válido' using errcode = 'P0001'; end if;
  select tier into v_tier from public.pvp_profiles where id = v_uid;
  if v_tier is null then raise exception 'Perfil no encontrado' using errcode = 'P0001'; end if;
  if public.pvp_tier_rank(v_tier) >= public.pvp_tier_rank(p_pack) then
    raise exception 'Ya tienes este pack o uno superior' using errcode = 'P0001';
  end if;
  select * into v_row from public.pvp_purchases where user_id = v_uid and pack = p_pack and status = 'pending';
  if found then return v_row; end if;
  loop
    v_ref := public.pvp_random_code('PV-');
    exit when not exists (select 1 from public.pvp_purchases where reference = v_ref);
  end loop;
  insert into public.pvp_purchases (user_id, pack, amount, provider, reference)
  values (v_uid, p_pack, v_price, p_provider, v_ref) returning * into v_row;
  return v_row;
end $$;

create or replace function public.pvp_cancel_purchase(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.pvp_purchases set status = 'cancelled', reviewed_at = now()
   where id = p_id and user_id = auth.uid() and status = 'pending';
end $$;

-- Canjea un código promocional o de creador.
create or replace function public.pvp_redeem_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hash text := public.pvp_hash_code(p_code);
  v_code public.pvp_codes;
begin
  if v_uid is null then raise exception 'No autenticado' using errcode = '28000'; end if;
  if not exists (select 1 from public.pvp_profiles where id = v_uid) then raise exception 'Perfil no encontrado' using errcode = 'P0001'; end if;
  select * into v_code from public.pvp_codes where code_hash = v_hash for update;
  if not found or not v_code.active then raise exception 'Código no válido' using errcode = 'P0001'; end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then raise exception 'Este código ha caducado' using errcode = 'P0001'; end if;
  if v_code.max_uses is not null and v_code.uses >= v_code.max_uses then raise exception 'Este código ya se ha agotado' using errcode = 'P0001'; end if;
  if exists (select 1 from public.pvp_redemptions where user_id = v_uid and code_hash = v_hash) then
    raise exception 'Ya canjeaste este código' using errcode = 'P0001';
  end if;

  insert into public.pvp_redemptions (user_id, code_hash) values (v_uid, v_hash);
  update public.pvp_codes set uses = uses + 1 where code_hash = v_hash;
  if v_code.coins > 0 then perform public.pvp__move_coins(v_uid, v_code.coins, 'code:' || v_code.kind, left(v_hash, 12)); end if;
  if v_code.grants_tier is not null then
    update public.pvp_profiles
       set tier = case when public.pvp_tier_rank(v_code.grants_tier) > public.pvp_tier_rank(tier) then v_code.grants_tier else tier end,
           updated_at = now()
     where id = v_uid;
  end if;
  return jsonb_build_object('kind', v_code.kind, 'coins', v_code.coins, 'tier', v_code.grants_tier);
end $$;

-- ===================== Confirmación de pagos =====================

-- Interna: la usa el panel de admin y, en el futuro, los webhooks de Stripe / PayPal Checkout (con service_role).
create or replace function public.pvp_confirm_purchase_internal(p_id uuid, p_provider_ref text, p_reviewer uuid)
returns public.pvp_purchases language plpgsql security definer set search_path = '' as $$
declare v_row public.pvp_purchases;
begin
  select * into v_row from public.pvp_purchases where id = p_id for update;
  if not found then raise exception 'Compra no encontrada' using errcode = 'P0001'; end if;
  if v_row.status = 'paid' then return v_row; end if;              -- idempotente (webhooks repetidos)
  if v_row.status <> 'pending' then raise exception 'La compra no está pendiente' using errcode = 'P0001'; end if;
  perform public.pvp__grant_pack(v_row.user_id, v_row.pack, 'purchase', v_row.reference);
  update public.pvp_purchases
     set status = 'paid', provider_ref = coalesce(nullif(trim(p_provider_ref), ''), provider_ref),
         reviewed_at = now(), reviewed_by = p_reviewer
   where id = p_id returning * into v_row;
  return v_row;
end $$;

-- ===================== Administración =====================

create or replace function public.pvp__require_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.pvp_is_admin() then raise exception 'Solo administradores' using errcode = '42501'; end if;
end $$;

create or replace function public.pvp_admin_confirm_purchase(p_id uuid, p_provider_ref text default null)
returns public.pvp_purchases language plpgsql security definer set search_path = '' as $$
begin
  perform public.pvp__require_admin();
  return public.pvp_confirm_purchase_internal(p_id, p_provider_ref, auth.uid());
end $$;

create or replace function public.pvp_admin_reject_purchase(p_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.pvp__require_admin();
  update public.pvp_purchases set status = 'rejected', admin_note = p_note, reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_id and status = 'pending';
  if not found then raise exception 'La compra no está pendiente' using errcode = 'P0001'; end if;
end $$;

-- Entrega directa de un pack (pagos verificados fuera de una solicitud). Queda registrada como compra.
create or replace function public.pvp_admin_grant_pack(p_user uuid, p_pack text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_price numeric; v_ref text;
begin
  perform public.pvp__require_admin();
  select price into v_price from public.pvp_pack_info(p_pack);
  if v_price is null then raise exception 'Pack desconocido' using errcode = 'P0001'; end if;
  loop
    v_ref := public.pvp_random_code('PV-');
    exit when not exists (select 1 from public.pvp_purchases where reference = v_ref);
  end loop;
  insert into public.pvp_purchases (user_id, pack, amount, provider, reference, status, admin_note, reviewed_at, reviewed_by)
  values (p_user, p_pack, v_price, 'manual', v_ref, 'paid', p_note, now(), auth.uid());
  perform public.pvp__grant_pack(p_user, p_pack, 'admin_grant', v_ref);
end $$;

create or replace function public.pvp_admin_adjust_coins(p_user uuid, p_delta bigint, p_note text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
begin
  perform public.pvp__require_admin();
  return public.pvp__move_coins(p_user, p_delta, 'admin', p_note);
end $$;

create or replace function public.pvp_admin_set_tier(p_user uuid, p_tier text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.pvp__require_admin();
  if p_tier not in ('free', 'elite', 'legend') then raise exception 'Nivel no válido' using errcode = 'P0001'; end if;
  update public.pvp_profiles set tier = p_tier, updated_at = now() where id = p_user;
end $$;

-- Crea un código; el texto no se guarda, solo su hash.
create or replace function public.pvp_admin_create_code(
  p_code text, p_kind text default 'promo', p_coins bigint default 0, p_tier text default null,
  p_max_uses integer default null, p_expires_at timestamptz default null, p_label text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare v_hash text := public.pvp_hash_code(p_code);
begin
  perform public.pvp__require_admin();
  if length(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')) < 4 then raise exception 'El código debe tener al menos 4 caracteres' using errcode = 'P0001'; end if;
  insert into public.pvp_codes (code_hash, label, kind, coins, grants_tier, max_uses, expires_at)
  values (v_hash, coalesce(p_label, ''), p_kind, greatest(coalesce(p_coins, 0), 0), p_tier, p_max_uses, p_expires_at)
  on conflict (code_hash) do update
    set label = excluded.label, kind = excluded.kind, coins = excluded.coins, grants_tier = excluded.grants_tier,
        max_uses = excluded.max_uses, expires_at = excluded.expires_at, active = true;
  return v_hash;
end $$;

create or replace function public.pvp_admin_set_code_active(p_hash text, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.pvp__require_admin();
  update public.pvp_codes set active = p_active where code_hash = p_hash;
end $$;

-- ===================== RLS y permisos =====================

alter table public.pvp_profiles    enable row level security;
alter table public.pvp_purchases   enable row level security;
alter table public.pvp_coin_ledger enable row level security;
alter table public.pvp_codes       enable row level security;
alter table public.pvp_redemptions enable row level security;

drop policy if exists pvp_profiles_select on public.pvp_profiles;
create policy pvp_profiles_select on public.pvp_profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.pvp_is_admin()));
drop policy if exists pvp_profiles_update on public.pvp_profiles;
create policy pvp_profiles_update on public.pvp_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists pvp_purchases_select on public.pvp_purchases;
create policy pvp_purchases_select on public.pvp_purchases for select to authenticated
  using (user_id = (select auth.uid()) or (select public.pvp_is_admin()));

drop policy if exists pvp_ledger_select on public.pvp_coin_ledger;
create policy pvp_ledger_select on public.pvp_coin_ledger for select to authenticated
  using (user_id = (select auth.uid()) or (select public.pvp_is_admin()));

drop policy if exists pvp_codes_admin on public.pvp_codes;
create policy pvp_codes_admin on public.pvp_codes for select to authenticated using ((select public.pvp_is_admin()));

drop policy if exists pvp_redemptions_select on public.pvp_redemptions;
create policy pvp_redemptions_select on public.pvp_redemptions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.pvp_is_admin()));

-- Escrituras directas: solo columnas cosméticas del propio perfil.
revoke all on public.pvp_profiles, public.pvp_purchases, public.pvp_coin_ledger, public.pvp_codes, public.pvp_redemptions from anon, authenticated;
grant select on public.pvp_profiles, public.pvp_purchases, public.pvp_coin_ledger, public.pvp_codes, public.pvp_redemptions to authenticated;
grant update (prefs, stats, adv, xp, updated_at) on public.pvp_profiles to authenticated;

-- Funciones (solo las pvp_*; no se tocan las de otras apps): nada para anónimos salvo comprobar nombres;
-- las internas (pvp__*, pvp_confirm_purchase_internal), solo service_role.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'pvp%'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    if f.proname in ('pvp_is_admin', 'pvp_tier_rank', 'pvp_pack_info', 'pvp_ensure_profile', 'pvp_adjust_coins', 'pvp_create_purchase',
                     'pvp_cancel_purchase', 'pvp_redeem_code', 'pvp_username_available', 'pvp_admin_confirm_purchase',
                     'pvp_admin_reject_purchase', 'pvp_admin_grant_pack', 'pvp_admin_adjust_coins', 'pvp_admin_set_tier',
                     'pvp_admin_create_code', 'pvp_admin_set_code_active') then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
    if f.proname in ('pvp_username_available', 'pvp_pack_info') then
      execute format('grant execute on function %s to anon', f.sig);
    end if;
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- Tiempo real: el jugador ve al instante sus monedas, nivel y el estado de sus compras.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pvp_profiles') then
    alter publication supabase_realtime add table public.pvp_profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pvp_purchases') then
    alter publication supabase_realtime add table public.pvp_purchases;
  end if;
end $$;

-- Códigos promocionales iniciales (públicos): BIENVENIDO (10.000) y VEGASPRO (25.000).
insert into public.pvp_codes (code_hash, label, kind, coins) values
  (public.pvp_hash_code('BIENVENIDO'), 'BIENVENIDO', 'promo', 10000),
  (public.pvp_hash_code('VEGASPRO'), 'VEGASPRO', 'promo', 25000)
on conflict (code_hash) do nothing;
