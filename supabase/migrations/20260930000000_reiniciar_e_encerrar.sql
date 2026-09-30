-- Reiniciar corrida e bloquear chegadas fora da janela largada → encerramento

alter table public.races add column if not exists finished_at timestamptz;

-- corridas já encerradas: usa a última chegada (ou agora) como horário de encerramento
update public.races r
   set finished_at = coalesce((select max(f.finish_time) from public.finishes f where f.race_id = r.id), now())
 where r.status = 'finished' and r.finished_at is null;

-- Encerrar grava o horário do servidor
create or replace function public.finish_race(p_race_id uuid)
returns public.races
language plpgsql
as $$
declare
  r public.races;
begin
  update public.races
     set status = 'finished',
         finished_at = now()
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

-- Reiniciar: apaga as chegadas e volta para "aguardando largada" (mantém os atletas)
create or replace function public.reset_race(p_race_id uuid)
returns public.races
language plpgsql
as $$
declare
  r public.races;
begin
  delete from public.finishes where race_id = p_race_id;

  update public.races
     set status = 'not_started',
         start_time = null,
         finished_at = null
   where id = p_race_id
  returning * into r;

  if r.id is null then
    raise exception 'Corrida não encontrada' using errcode = 'P0002';
  end if;

  return r;
end;
$$;

grant execute on function public.reset_race(uuid) to anon, authenticated;

-- Chegada só vale entre a largada e o encerramento.
-- Celular que ficou offline ainda consegue enviar o que registrou antes do
-- encerramento; chegadas de antes de um reinício são recusadas.
create or replace function public.check_finish_window()
returns trigger
language plpgsql
as $$
declare
  r public.races;
begin
  select * into r from public.races where id = new.race_id;

  if r.start_time is null then
    raise exception 'fora_da_corrida:nao_largou' using errcode = 'P0001';
  end if;
  if new.finish_time < r.start_time then
    raise exception 'fora_da_corrida:antes_da_largada' using errcode = 'P0001';
  end if;
  if r.status = 'finished' and new.finish_time > r.finished_at then
    raise exception 'fora_da_corrida:encerrada' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists finishes_check_window on public.finishes;
create trigger finishes_check_window
  before insert on public.finishes
  for each row execute function public.check_finish_window();
