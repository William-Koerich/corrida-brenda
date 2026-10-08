-- Corrida inicial (opcional)
insert into public.races (name, distance_km)
select 'Corrida 3,1 km', 3.1
where not exists (select 1 from public.races);
