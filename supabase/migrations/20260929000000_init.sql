-- Cronometragem de corrida: esquema inicial
-- Tabelas: races, athletes, finishes
-- RPCs: server_now, start_race, finish_race

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- races
-- ---------------------------------------------------------------------------
create table public.races (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  distance_km numeric not null default 3 check (distance_km > 0),
  start_time  timestamptz,
  status      text not null default 'not_started'
              check (status in ('not_started', 'running', 'finished')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- athletes
-- ---------------------------------------------------------------------------
create table public.athletes (
  id          uuid primary key default gen_random_uuid(),
  race_id     uuid not null references public.races (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  age         int  not null check (age between 1 and 120),
  sex         text not null check (sex in ('M', 'F')),
  bib_number  int  not null check (bib_number > 0),
  created_at  timestamptz not null default now(),
  constraint athletes_race_bib_unique unique (race_id, bib_number),
  -- permite FK composta em finishes garantindo atleta da mesma corrida
  constraint athletes_race_id_id_unique unique (race_id, id)
);

create index athletes_race_id_idx on public.athletes (race_id);

-- ---------------------------------------------------------------------------
-- finishes
-- ---------------------------------------------------------------------------
create table public.finishes (
  id          uuid primary key default gen_random_uuid(),
  race_id     uuid not null references public.races (id) on delete cascade,
  athlete_id  uuid,
  finish_time timestamptz not null,
  device_id   text,
  client_id   uuid not null unique,
  created_at  timestamptz not null default now(),
  -- o atleta precisa pertencer à mesma corrida; ao excluir o atleta,
  -- a chegada continua existindo, mas volta a ficar sem identificação
  constraint finishes_athlete_fk
    foreign key (race_id, athlete_id)
    references public.athletes (race_id, id)
    on delete set null (athlete_id)
);

-- Regra: um atleta só pode ter uma chegada válida
create unique index finishes_one_per_athlete
  on public.finishes (athlete_id)
  where athlete_id is not null;

create index finishes_race_id_idx on public.finishes (race_id, finish_time);

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Relógio do servidor, usado pelo celular para calcular o offset.
-- clock_timestamp() (e não now()) para refletir o instante real da chamada.
create or replace function public.server_now()
returns timestamptz
language sql
volatile
as $$
  select clock_timestamp();
$$;

-- Dá a largada com o horário do SERVIDOR. Idempotente: se a corrida já
-- largou, devolve a linha sem alterar o start_time.
create or replace function public.start_race(p_race_id uuid)
returns public.races
language plpgsql
as $$
declare
  r public.races;
begin
  update public.races
     set start_time = now(),
         status     = 'running'
   where id = p_race_id
     and status = 'not_started'
  returning * into r;

  if r.id is null then
    select * into r from public.races where id = p_race_id;
    if r.id is null then
      raise exception 'Corrida não encontrada' using errcode = 'P0002';
    end if;
  end if;

  return r;
end;
$$;

create or replace function public.finish_race(p_race_id uuid)
returns public.races
language plpgsql
as $$
declare
  r public.races;
begin
  update public.races
     set status = 'finished'
   where id = p_race_id
     and status = 'running'
  returning * into r;

  if r.id is null then
    select * into r from public.races where id = p_race_id;
    if r.id is null then
      raise exception 'Corrida não encontrada' using errcode = 'P0002';
    end if;
  end if;

  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Segurança (RLS)
-- Sem autenticação por enquanto: políticas abertas para anon/authenticated.
-- Para adicionar o PIN de administrador depois, basta trocar estas políticas
-- (ex.: escrita só via RPC security definer que valida o PIN).
-- ---------------------------------------------------------------------------
alter table public.races    enable row level security;
alter table public.athletes enable row level security;
alter table public.finishes enable row level security;

create policy "races_open_access"    on public.races    for all to anon, authenticated using (true) with check (true);
create policy "athletes_open_access" on public.athletes for all to anon, authenticated using (true) with check (true);
create policy "finishes_open_access" on public.finishes for all to anon, authenticated using (true) with check (true);

grant execute on function public.server_now()        to anon, authenticated;
grant execute on function public.start_race(uuid)    to anon, authenticated;
grant execute on function public.finish_race(uuid)   to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.races, public.finishes;
