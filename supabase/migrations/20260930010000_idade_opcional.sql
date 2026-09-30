-- Idade do atleta passa a ser opcional (a checagem 1–120 continua valendo quando informada)
alter table public.athletes alter column age drop not null;
