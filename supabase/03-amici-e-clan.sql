-- Guerra degli Dèi: amici, clan e sfide passano da Supabase invece che da telefono a telefono.
-- Da incollare una volta sola in Supabase → SQL Editor → New query → Run.
--
-- 1) Ogni codice amico (6 lettere) è registrato e appartiene a un solo account:
--    nessuno può "rubare" il codice di un altro per fingersi lui.
-- 2) Ogni coppia di giocatori ha un canale privato "coppia:CODICE1-CODICE2" che possono usare
--    solo i due proprietari dei codici: chat, clan e battaglie viaggiano lì.
-- 3) Ognuno ha una "casella" "casella:CODICE" dove chiunque può bussare ("sono X, aggiungimi"),
--    ma che può leggere solo il proprietario.

create table if not exists public.giocatori (
  codice  text primary key check (codice ~ '^[A-HJ-NP-Z2-9]{6}$'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  creato  timestamptz not null default now()
);

alter table public.giocatori enable row level security;
revoke all on public.giocatori from anon, authenticated;
grant select on public.giocatori to authenticated;

drop policy if exists "vedo il mio codice" on public.giocatori;
create policy "vedo il mio codice" on public.giocatori
  for select to authenticated using ((select auth.uid()) = user_id);

-- Registra (o cambia) il proprio codice amico. Risponde 'ok' oppure 'occupato' (è di un altro).
create or replace function public.registra_codice(c text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me    uuid := auth.uid();
  owner uuid;
begin
  if me is null then
    return 'errore';
  end if;
  if c !~ '^[A-HJ-NP-Z2-9]{6}$' then
    return 'errore';
  end if;
  select user_id into owner from public.giocatori where codice = c;
  if owner = me then
    return 'ok';
  end if;
  if owner is not null then
    return 'occupato';
  end if;
  delete from public.giocatori where user_id = me;
  insert into public.giocatori (codice, user_id) values (c, me);
  return 'ok';
end;
$$;
revoke all on function public.registra_codice(text) from public, anon;
grant execute on function public.registra_codice(text) to authenticated;

-- Canali delle coppie: solo i due proprietari dei codici
drop policy if exists "coppia: ricevono i due giocatori" on realtime.messages;
drop policy if exists "coppia: mandano i due giocatori" on realtime.messages;

create policy "coppia: ricevono i due giocatori" on realtime.messages
  for select to authenticated using (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select realtime.topic()) like 'coppia:%'
    and exists (
      select 1 from public.giocatori g
      where g.user_id = (select auth.uid())
        and g.codice in (split_part(substr((select realtime.topic()), 8), '-', 1),
                         split_part(substr((select realtime.topic()), 8), '-', 2))
    )
  );
create policy "coppia: mandano i due giocatori" on realtime.messages
  for insert to authenticated with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select realtime.topic()) like 'coppia:%'
    and exists (
      select 1 from public.giocatori g
      where g.user_id = (select auth.uid())
        and g.codice in (split_part(substr((select realtime.topic()), 8), '-', 1),
                         split_part(substr((select realtime.topic()), 8), '-', 2))
    )
  );

-- Caselle: legge solo il proprietario, bussare può chiunque abbia fatto l'accesso
drop policy if exists "casella: legge il proprietario" on realtime.messages;
drop policy if exists "casella: chiunque bussa" on realtime.messages;

create policy "casella: legge il proprietario" on realtime.messages
  for select to authenticated using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) like 'casella:%'
    and exists (
      select 1 from public.giocatori g
      where g.user_id = (select auth.uid()) and g.codice = substr((select realtime.topic()), 9)
    )
  );
create policy "casella: chiunque bussa" on realtime.messages
  for insert to authenticated with check (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) like 'casella:%'
  );
