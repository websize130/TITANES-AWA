-- AGENCY OS — esquema inicial
-- Cada fila pertenece a un usuario (owner_id = auth.uid()). RLS impide ver o modificar datos de otros usuarios.

create extension if not exists pgcrypto;

-- ───────── Tablas de catálogo (id de texto, único por propietario) ─────────

create table if not exists public.agents (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (id in ('eminem','fifty-cent','tupac','canserbero','nas','biggie','ice-cube')),
  enabled boolean not null default true,
  model text,
  instructions_override text,
  max_runs_per_day int not null default 15 check (max_runs_per_day between 0 and 200),
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.services (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  price_min numeric(10,2) not null check (price_min >= 0),
  price_max numeric(10,2) check (price_max is null or price_max >= price_min),
  cost numeric(10,2) not null default 0 check (cost >= 0),
  deliverables text[] not null default '{}',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.workflows (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  category text not null default '',
  webhook_path text not null,
  sensitive boolean not null default false,
  enabled boolean not null default true,
  owner_agent text not null,
  last_run_at timestamptz,
  last_status text check (last_status in ('ok','error','pendiente')),
  run_count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);

-- ───────── Tablas operativas ─────────

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_name text not null check (length(business_name) between 1 and 200),
  sector text not null default '',
  city text not null default '',
  website text,
  phone text,
  email text,
  contact_name text,
  status text not null default 'nuevo' check (status in ('nuevo','investigando','auditado','contactado','propuesta','negociacion','ganado','perdido')),
  priority text not null default 'media' check (priority in ('alta','media','baja')),
  source text,
  notes text,
  estimated_value numeric(10,2),
  client_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists leads_owner_website_uq on public.leads (owner_id, lower(website)) where website is not null;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  sector text not null default '',
  city text not null default '',
  website text,
  email text,
  phone text,
  contact_name text,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'onboarding' check (status in ('onboarding','activo','mantenimiento','inactivo')),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.leads drop constraint if exists leads_client_fk;
alter table public.leads add constraint leads_client_fk foreign key (client_id) references public.clients(id) on delete set null;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  service text not null default '',
  status text not null default 'planificacion' check (status in ('planificacion','diseno','desarrollo','qa','entregado','mantenimiento')),
  progress int not null default 0 check (progress between 0 and 100),
  budget numeric(10,2) not null default 0,
  paid numeric(10,2) not null default 0,
  due_date date,
  qa_passed boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- Un proyecto no puede marcarse "entregado" sin QA superado (control de ICE CUBE).
create or replace function public.enforce_qa_before_delivery() returns trigger language plpgsql as $$
begin
  if new.status = 'entregado' and not new.qa_passed then
    raise exception 'No se puede entregar un proyecto sin QA superado';
  end if;
  return new;
end $$;
drop trigger if exists projects_qa_gate on public.projects;
create trigger projects_qa_gate before insert or update on public.projects for each row execute function public.enforce_qa_before_delivery();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  agent_id text not null check (agent_id in ('eminem','fifty-cent','tupac','canserbero','nas','biggie','ice-cube')),
  status text not null default 'pendiente' check (status in ('pendiente','en_curso','pendiente_aprobacion','completada','error','cancelada')),
  priority text not null default 'media' check (priority in ('baja','media','alta','urgente')),
  plan_id uuid,
  depends_on uuid[] not null default '{}',
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  result jsonb,
  error text,
  created_by text not null default 'usuario',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_owner_status_idx on public.tasks (owner_id, status);
create index if not exists tasks_plan_idx on public.tasks (plan_id);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id text not null,
  task_id uuid references public.tasks(id) on delete set null,
  kind text not null check (kind in ('plan','task')),
  status text not null check (status in ('thinking','running','succeeded','failed','refused')),
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(12,6) not null default 0,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists agent_runs_owner_created_idx on public.agent_runs (owner_id, created_at desc);

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  url text,
  score int check (score between 0 and 100),
  summary text not null,
  findings jsonb not null default '[]',
  author text not null default 'usuario',
  created_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  items jsonb not null default '[]',
  total numeric(10,2) not null default 0,
  cost_total numeric(10,2) not null default 0,
  status text not null default 'borrador' check (status in ('borrador','pendiente_aprobacion','aprobada','enviada','aceptada','rechazada')),
  notes text,
  created_by text not null default 'usuario',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('enviar_mensaje','enviar_propuesta','publicar_web','pago','produccion','ejecutar_workflow','accion_agente')),
  title text not null,
  description text not null default '',
  payload jsonb not null default '{}',
  requested_by text not null,
  status text not null default 'pendiente' check (status in ('pendiente','aprobada','rechazada','ejecutada')),
  related_table text,
  related_id text,
  decided_at timestamptz,
  decided_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  actor text not null,
  action text not null,
  entity text,
  entity_id text,
  detail text,
  level text not null default 'info' check (level in ('info','warn','error')),
  created_at timestamptz not null default now()
);
create index if not exists activity_owner_created_idx on public.activity_logs (owner_id, created_at desc);

-- ───────── RLS: separación de datos por usuario ─────────

do $$
declare t text;
begin
  foreach t in array array['agents','services','workflows','leads','clients','projects','tasks','agent_runs','audits','proposals','approvals','activity_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists owner_select on public.%I', t);
    execute format('drop policy if exists owner_insert on public.%I', t);
    execute format('drop policy if exists owner_update on public.%I', t);
    execute format('drop policy if exists owner_delete on public.%I', t);
    execute format('create policy owner_select on public.%I for select to authenticated using (owner_id = (select auth.uid()))', t);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))', t);
    execute format('create policy owner_update on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
    execute format('create policy owner_delete on public.%I for delete to authenticated using (owner_id = (select auth.uid()))', t);
  end loop;
end $$;

-- El registro de actividad y las ejecuciones son de solo inserción para el usuario (auditoría inmutable).
drop policy if exists owner_delete on public.activity_logs;
drop policy if exists owner_update on public.activity_logs;
