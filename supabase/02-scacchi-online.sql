-- Scacchi online: le mosse passano dai canali in tempo reale di Supabase (veloci anche con i dati mobili).
-- Da incollare una volta sola in Supabase → SQL Editor → New query → Run.
--
-- Ogni partita ha un codice di 6 lettere, chi la crea ("host") e l'amico ("ospite").
-- Solo questi due possono ascoltare e mandare messaggi sul canale "scacchi:CODICE":
-- chi scopre il codice di una partita già piena non può né leggere le mosse né intromettersi.

create table if not exists public.partite_scacchi (
  codice text primary key check (codice ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ospite uuid references auth.users (id) on delete cascade,
  creata timestamptz not null default now()
);

alter table public.partite_scacchi enable row level security;

revoke all on public.partite_scacchi from anon, authenticated;
grant select, delete on public.partite_scacchi to authenticated;
grant insert (codice) on public.partite_scacchi to authenticated;   -- l'host è sempre chi crea

drop policy if exists "vedo le mie partite" on public.partite_scacchi;
drop policy if exists "creo una partita" on public.partite_scacchi;
drop policy if exists "chiudo le mie partite" on public.partite_scacchi;

create policy "vedo le mie partite" on public.partite_scacchi
  for select to authenticated using ((select auth.uid()) in (host, ospite));
create policy "creo una partita" on public.partite_scacchi
  for insert to authenticated with check ((select auth.uid()) = host and ospite is null);
create policy "chiudo le mie partite" on public.partite_scacchi
  for delete to authenticated using ((select auth.uid()) = host);

-- L'amico entra con il codice: prende il posto libero (o rientra se era già lui).
-- Risponde 'ok', 'piena' (c'è già un altro amico) o 'inesistente' (codice sbagliato o host non ancora pronto).
create or replace function public.entra_partita(c text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r  public.partite_scacchi%rowtype;
  me uuid := auth.uid();
begin
  if me is null then
    return 'errore';
  end if;
  select * into r from public.partite_scacchi where codice = c for update;
  if not found then
    return 'inesistente';
  end if;
  if r.host = me or r.ospite = me then
    return 'ok';
  end if;
  if r.ospite is not null then
    return 'piena';
  end if;
  update public.partite_scacchi set ospite = me where codice = c;
  return 'ok';
end;
$$;
revoke all on function public.entra_partita(text) from public, anon;
grant execute on function public.entra_partita(text) to authenticated;

-- Chi può usare i canali in tempo reale: solo i due giocatori della partita
drop policy if exists "giocatori ricevono i messaggi della partita" on realtime.messages;
drop policy if exists "giocatori mandano i messaggi della partita" on realtime.messages;

create policy "giocatori ricevono i messaggi della partita" on realtime.messages
  for select to authenticated using (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select realtime.topic()) like 'scacchi:%'
    and exists (
      select 1 from public.partite_scacchi p
      where p.codice = substr((select realtime.topic()), 9)
        and (select auth.uid()) in (p.host, p.ospite)
    )
  );
create policy "giocatori mandano i messaggi della partita" on realtime.messages
  for insert to authenticated with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select realtime.topic()) like 'scacchi:%'
    and exists (
      select 1 from public.partite_scacchi p
      where p.codice = substr((select realtime.topic()), 9)
        and (select auth.uid()) in (p.host, p.ospite)
    )
  );
