-- Atualização incremental: as telas buscam só o que mudou desde a última consulta.

alter table public.finishes add column if not exists updated_at timestamptz not null default now();
alter table public.athletes add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists finishes_touch_updated_at on public.finishes;
create trigger finishes_touch_updated_at
  before update on public.finishes
  for each row execute function public.touch_updated_at();

drop trigger if exists athletes_touch_updated_at on public.athletes;
create trigger athletes_touch_updated_at
  before update on public.athletes
  for each row execute function public.touch_updated_at();

create index if not exists finishes_race_updated_idx on public.finishes (race_id, updated_at);
create index if not exists athletes_race_updated_idx on public.athletes (race_id, updated_at);
