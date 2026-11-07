-- AgendaSavia · 002: plan VIP gratuito e ilimitado, exclusivo para aurabeuty2026@gmail.com
-- Ejecutar DESPUÉS de 001. Se puede ejecutar varias veces.

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

-- Si la cuenta ya existe, pasa a VIP y queda al día
update public.centros set plan = 'vip', promo = null, status = 'aldia' where user_email = 'aurabeuty2026@gmail.com';
