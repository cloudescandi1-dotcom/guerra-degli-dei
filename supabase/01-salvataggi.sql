-- Guerra degli Dèi e Scacchi: salvataggi dei giocatori su Supabase.
-- Da incollare una volta sola in Supabase → SQL Editor → New query → Run.
--
-- Ogni giocatore (anche ospite) ha una riga per gioco con i suoi dati.
-- Le regole (RLS) fanno sì che ognuno possa leggere e modificare SOLO i propri salvataggi.

create table if not exists public.salvataggi (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  gioco      text not null check (gioco in ('guerra', 'scacchi')),
  dati       jsonb not null,
  aggiornato timestamptz not null default now(),
  primary key (user_id, gioco),
  -- niente salvataggi enormi (protegge lo spazio gratuito da chi vuole fare danni)
  constraint dati_non_troppo_grandi check (pg_column_size(dati) < 300000)
);

alter table public.salvataggi enable row level security;

-- Solo chi ha fatto l'accesso (anche come ospite) può usare la tabella; chi non è entrato no.
revoke all on public.salvataggi from anon, authenticated;
grant select, insert, update, delete on public.salvataggi to authenticated;

drop policy if exists "leggo i miei salvataggi" on public.salvataggi;
drop policy if exists "creo i miei salvataggi" on public.salvataggi;
drop policy if exists "modifico i miei salvataggi" on public.salvataggi;
drop policy if exists "cancello i miei salvataggi" on public.salvataggi;

create policy "leggo i miei salvataggi" on public.salvataggi
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "creo i miei salvataggi" on public.salvataggi
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "modifico i miei salvataggi" on public.salvataggi
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cancello i miei salvataggi" on public.salvataggi
  for delete to authenticated using ((select auth.uid()) = user_id);

-- "Elimina account": il giocatore può cancellare se stesso e tutti i suoi dati (diritto alla
-- cancellazione del GDPR). La funzione cancella SOLO l'utente che la chiama.
create or replace function public.elimina_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'non autenticato';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.elimina_account() from public, anon;
grant execute on function public.elimina_account() to authenticated;
