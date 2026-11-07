-- AgendaSavia · backend Supabase (tablas + funciones RPC que usa index.html)
-- Proyecto: bwiiyqgrvsttedalyhdw. Todas las tablas tienen RLS sin políticas: el acceso anónimo
-- solo es posible a través de estas funciones SECURITY DEFINER, que validan el token de sesión.

-- ---------- Esquema ----------
alter table public.centros
  add column if not exists salt       text,
  add column if not exists rq         text,
  add column if not exists rsalt      text,
  add column if not exists rhash      text,
  add column if not exists status     text not null default 'aldia',
  add column if not exists fails      int  not null default 0,
  add column if not exists lock_until timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'centros_status_chk') then
    alter table public.centros add constraint centros_status_chk check (status in ('aldia','pendiente','bloqueado'));
  end if;
end $$;

alter table public.centro_operativa
  add column if not exists day    jsonb,
  add column if not exists future jsonb default '[]'::jsonb;

create table if not exists public.as_sesiones (
  token_hash text primary key,
  slug       text not null references public.centros(slug) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);
create index if not exists as_sesiones_slug_idx on public.as_sesiones(slug);
alter table public.as_sesiones enable row level security;

-- ---------- Funciones internas (no expuestas) ----------
create or replace function public._as_new_token(p_slug text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(gen_random_bytes(24), 'hex');
begin
  delete from as_sesiones where slug = p_slug and expires_at < now();
  insert into as_sesiones(token_hash, slug) values (encode(digest(t, 'sha256'), 'hex'), p_slug);
  return t;
end $$;

create or replace function public._as_auth(p_slug text, p_token text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from as_sesiones
                 where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
                   and slug = p_slug and expires_at > now());
$$;

create or replace function public._as_admin(p_token text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from as_sesiones s join centros c on c.slug = s.slug
                 where s.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
                   and s.expires_at > now() and c.user_email = 'websize130@gmail.com');
$$;

create or replace function public._as_account(c public.centros) returns jsonb
language sql stable as $$
  select jsonb_build_object('slug', c.slug, 'center', c.center_name, 'phone', coalesce(c.phone, ''),
    'user', c.user_email, 'rq', c.rq, 'rsalt', c.rsalt, 'plan', c.plan, 'promo', c.promo,
    'created', c.created_at, 'status', c.status);
$$;

create or replace function public._as_json(v jsonb, d jsonb) returns jsonb
language sql immutable as $$ select case when v is null or v = 'null'::jsonb then d else v end $$;

-- ---------- Cuentas ----------
create or replace function public.as_register(p_slug text, p_exact boolean, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  u text := lower(trim(coalesce(p->>'user', '')));
  pl text := coalesce(p->>'plan', '');
  pr text := upper(trim(coalesce(p->>'promo', '')));
  base text; s text; n int := 2;
begin
  if u !~ '^[a-z0-9._@+-]{3,60}$' then return jsonb_build_object('error', 'bad_user'); end if;
  if coalesce(p->>'hash', '') = '' or coalesce(p->>'salt', '') = '' then return jsonb_build_object('error', 'bad_password'); end if;
  if u = 'websize130@gmail.com' then pl := 'master'; pr := null;
  elsif u = 'aurabeuty2026@gmail.com' then pl := 'vip'; pr := null;      -- cuenta VIP: gratis e ilimitada
  elsif pl not in ('mensual', 'anual') then return jsonb_build_object('error', 'bad_plan');
  elsif not (pr = 'BIENVENIDA30' and pl = 'mensual') then pr := null;
  end if;
  if exists (select 1 from centros where user_email = u) then return jsonb_build_object('error', 'user_taken'); end if;
  base := trim(both '-' from regexp_replace(lower(coalesce(p_slug, '')), '[^a-z0-9-]+', '-', 'g'));
  base := left(coalesce(nullif(base, ''), 'centro'), 60);
  s := base;
  while exists (select 1 from centros where slug = s) loop
    if p_exact then return jsonb_build_object('error', 'slug_taken'); end if;
    s := base || '-' || n; n := n + 1;
  end loop;
  insert into centros(slug, center_name, phone, user_email, password_hash, salt, rq, rsalt, rhash, plan, promo, status, created_at)
  values (s, left(coalesce(nullif(trim(p->>'center'), ''), 'Centro'), 60), left(nullif(trim(coalesce(p->>'phone', '')), ''), 20), u,
          crypt(p->>'hash', gen_salt('bf')), p->>'salt', nullif(p->>'rq', ''), nullif(p->>'rsalt', ''),
          case when coalesce(p->>'rhash', '') = '' then null else crypt(p->>'rhash', gen_salt('bf')) end,
          pl, pr, 'aldia', now());
  return jsonb_build_object('ok', true, 'slug', s, 'token', _as_new_token(s));
exception when unique_violation then
  return jsonb_build_object('error', 'user_taken');
end $$;

create or replace function public.as_user_salt(p_user text) returns text
language sql stable security definer set search_path = public as $$
  select salt from centros where user_email = lower(trim(coalesce(p_user, '')));
$$;

create or replace function public.as_login(p_user text, p_hash text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c centros;
begin
  select * into c from centros where user_email = lower(trim(coalesce(p_user, ''))) for update;
  if not found then return jsonb_build_object('error', 'invalid'); end if;
  if c.lock_until is not null and c.lock_until > now() then
    return jsonb_build_object('error', 'locked', 'secs', ceil(extract(epoch from c.lock_until - now())));
  end if;
  if c.password_hash = crypt(coalesce(p_hash, ''), c.password_hash) then
    update centros set fails = 0, lock_until = null where id = c.id;
    return jsonb_build_object('ok', true, 'token', _as_new_token(c.slug), 'account', _as_account(c));
  end if;
  update centros set fails = case when c.fails + 1 >= 5 then 0 else c.fails + 1 end,
                     lock_until = case when c.fails + 1 >= 5 then now() + interval '30 seconds' else null end
   where id = c.id;
  return jsonb_build_object('error', 'invalid');
end $$;

create or replace function public.as_rq(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('rq', rq, 'rsalt', rsalt) from centros where user_email = lower(trim(coalesce(p_user, '')));
$$;

create or replace function public.as_recover(p_user text, p_rhash text, p_salt text, p_hash text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c centros;
begin
  if coalesce(p_salt, '') = '' or coalesce(p_hash, '') = '' then return jsonb_build_object('error', 'bad_password'); end if;
  select * into c from centros where user_email = lower(trim(coalesce(p_user, ''))) for update;
  if not found or c.rhash is null then return jsonb_build_object('error', 'invalid'); end if;
  if c.lock_until is not null and c.lock_until > now() then
    return jsonb_build_object('error', 'locked', 'secs', ceil(extract(epoch from c.lock_until - now())));
  end if;
  if c.rhash = crypt(coalesce(p_rhash, ''), c.rhash) then
    update centros set salt = p_salt, password_hash = crypt(p_hash, gen_salt('bf')), fails = 0, lock_until = null where id = c.id;
    delete from as_sesiones where slug = c.slug;           -- cierra las sesiones abiertas con la contraseña anterior
    return jsonb_build_object('ok', true, 'token', _as_new_token(c.slug), 'account', _as_account(c));
  end if;
  update centros set fails = case when c.fails + 1 >= 5 then 0 else c.fails + 1 end,
                     lock_until = case when c.fails + 1 >= 5 then now() + interval '5 minutes' else null end
   where id = c.id;
  return jsonb_build_object('error', 'invalid');
end $$;

create or replace function public.as_update_account(p_slug text, p_token text, p_center text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not _as_auth(p_slug, p_token) then return jsonb_build_object('error', 'unauthorized'); end if;
  update centros set center_name = left(coalesce(nullif(trim(p_center), ''), center_name), 60),
                     phone = left(nullif(trim(coalesce(p_phone, '')), ''), 20)
   where slug = p_slug;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.as_change_plan(p_slug text, p_token text, p_plan text, p_promo text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not _as_auth(p_slug, p_token) then return jsonb_build_object('error', 'unauthorized'); end if;
  if p_plan not in ('mensual', 'anual') then return jsonb_build_object('error', 'bad_plan'); end if;
  update centros set plan = p_plan,
         promo = case when promo is null and p_plan = 'mensual' and upper(coalesce(p_promo, '')) = 'BIENVENIDA30' then 'BIENVENIDA30' else promo end
   where slug = p_slug and plan not in ('master', 'vip');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.as_account_status(p_slug text, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not _as_auth(p_slug, p_token) then return jsonb_build_object('error', 'unauthorized'); end if;
  return (select jsonb_build_object('status', status, 'plan', plan, 'promo', promo) from centros where slug = p_slug);
end $$;

create or replace function public.as_promo_uses(p_codes text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(promo, n), '{}'::jsonb)
    from (select promo, count(*) n from centros where promo = any(coalesce(p_codes, '{}')) group by promo) t;
$$;

-- ---------- Datos del centro (caché local ⇄ nube) ----------
create or replace function public.as_save(p_slug text, p_token text, p_kind text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if not _as_auth(p_slug, p_token) then return jsonb_build_object('error', 'unauthorized'); end if;
  if (select status from centros where slug = p_slug) = 'bloqueado' then return jsonb_build_object('error', 'blocked'); end if;
  if p_kind = 'datos' then
    insert into centro_datos(slug, clients, services, pros, updated_at)
    values (p_slug, _as_json(p_data->'c', '[]'), _as_json(p_data->'s', '[]'), _as_json(p_data->'p', '[]'), clock_timestamp())
    on conflict (slug) do update set clients = excluded.clients, services = excluded.services, pros = excluded.pros, updated_at = excluded.updated_at
    returning updated_at into t;
  elsif p_kind = 'operativa' then
    insert into centro_operativa(slug, ops, day, future, updated_at)
    values (p_slug, _as_json(p_data->'ops', '{}'), _as_json(p_data->'day', null), _as_json(p_data->'future', '[]'), clock_timestamp())
    on conflict (slug) do update set ops = excluded.ops, day = excluded.day, future = excluded.future, updated_at = excluded.updated_at
    returning updated_at into t;
  else
    return jsonb_build_object('error', 'bad_kind');
  end if;
  return jsonb_build_object('ok', true, 'ts', t::text);
end $$;

create or replace function public.as_load(p_slug text, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d jsonb; o jsonb;
begin
  if not _as_auth(p_slug, p_token) then return jsonb_build_object('error', 'unauthorized'); end if;
  if (select status from centros where slug = p_slug) = 'bloqueado' then return jsonb_build_object('error', 'blocked'); end if;
  select jsonb_build_object('data', jsonb_build_object('c', clients, 's', services, 'p', pros), 'ts', updated_at::text)
    into d from centro_datos where slug = p_slug;
  select jsonb_build_object('data', jsonb_build_object('ops', ops, 'day', day, 'future', coalesce(future, '[]'::jsonb)), 'ts', updated_at::text)
    into o from centro_operativa where slug = p_slug;
  return jsonb_build_object('datos', d, 'operativa', o, 'inbox', '[]'::jsonb);
end $$;

-- Bandeja de reservas de clientes: el portal público se ha retirado (uso B2B); se mantiene por compatibilidad.
create or replace function public.as_ack_inbox(p_slug text, p_token text, p_rids text[]) returns jsonb
language sql stable as $$ select jsonb_build_object('ok', true) $$;

create or replace function public.as_wipe(p_slug text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not _as_auth(p_slug, p_token) then return jsonb_build_object('error', 'unauthorized'); end if;
  delete from centro_datos where slug = p_slug;
  delete from centro_operativa where slug = p_slug;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Master Admin (solo la cuenta websize130@gmail.com) ----------
create or replace function public.as_admin_list(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not _as_admin(p_token) then return jsonb_build_object('error', 'forbidden'); end if;
  return coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'center', center_name, 'user', user_email,
            'phone', coalesce(phone, ''), 'plan', plan, 'promo', promo, 'created', created_at, 'status', status)
            order by created_at desc)
          from centros where user_email <> 'websize130@gmail.com'), '[]'::jsonb);
end $$;

create or replace function public.as_admin_set_status(p_token text, p_slug text, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not _as_admin(p_token) then return jsonb_build_object('error', 'forbidden'); end if;
  if p_status not in ('aldia', 'pendiente', 'bloqueado') then return jsonb_build_object('error', 'bad_status'); end if;
  update centros set status = p_status where slug = p_slug and user_email <> 'websize130@gmail.com';
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Permisos ----------
revoke all on function public._as_new_token(text), public._as_auth(text, text), public._as_admin(text),
                       public._as_account(public.centros), public._as_json(jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.as_register(text, boolean, jsonb), public.as_user_salt(text), public.as_login(text, text),
  public.as_rq(text), public.as_recover(text, text, text, text), public.as_update_account(text, text, text, text),
  public.as_change_plan(text, text, text, text), public.as_account_status(text, text), public.as_promo_uses(text[]),
  public.as_save(text, text, text, jsonb), public.as_load(text, text), public.as_ack_inbox(text, text, text[]),
  public.as_wipe(text, text), public.as_admin_list(text), public.as_admin_set_status(text, text, text)
  from public;
grant execute on function public.as_register(text, boolean, jsonb), public.as_user_salt(text), public.as_login(text, text),
  public.as_rq(text), public.as_recover(text, text, text, text), public.as_update_account(text, text, text, text),
  public.as_change_plan(text, text, text, text), public.as_account_status(text, text), public.as_promo_uses(text[]),
  public.as_save(text, text, text, jsonb), public.as_load(text, text), public.as_ack_inbox(text, text, text[]),
  public.as_wipe(text, text), public.as_admin_list(text), public.as_admin_set_status(text, text, text)
  to anon, authenticated;
