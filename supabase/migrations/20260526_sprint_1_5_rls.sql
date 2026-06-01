begin;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.cravou_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

create or replace function private.cravou_match_open_for_prediction(p_match_id bigint)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.cravou_matches m
    where m.id = p_match_id
      and coalesce(m.status, 'pendente') in ('pendente', 'agendado')
      and now() < m.data_hora
  );
$$;

alter table public.cravou_users enable row level security;
alter table public.cravou_matches enable row level security;
alter table public.cravou_predictions enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cravou_users'
  loop
    execute format('drop policy if exists %I on public.cravou_users', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cravou_matches'
  loop
    execute format('drop policy if exists %I on public.cravou_matches', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cravou_predictions'
  loop
    execute format('drop policy if exists %I on public.cravou_predictions', pol.policyname);
  end loop;
end
$$;

create policy "cravou_users_select_own"
on public.cravou_users
for select
to authenticated
using (
  (select auth.uid()) = id
);

create policy "cravou_users_insert_own"
on public.cravou_users
for insert
to authenticated
with check (
  (select auth.uid()) = id
);

create policy "cravou_users_update_own"
on public.cravou_users
for update
to authenticated
using (
  (select auth.uid()) = id
)
with check (
  (select auth.uid()) = id
);

create policy "cravou_matches_select_authenticated"
on public.cravou_matches
for select
to authenticated
using (true);

create policy "cravou_matches_update_admin_only"
on public.cravou_matches
for update
to authenticated
using (
  private.cravou_is_admin()
)
with check (
  private.cravou_is_admin()
);

create policy "cravou_predictions_select_own"
on public.cravou_predictions
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "cravou_predictions_insert_own_open_match"
on public.cravou_predictions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and private.cravou_match_open_for_prediction(match_id)
);

create policy "cravou_predictions_update_own_open_match"
on public.cravou_predictions
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and private.cravou_match_open_for_prediction(match_id)
)
with check (
  (select auth.uid()) = user_id
  and private.cravou_match_open_for_prediction(match_id)
);

commit;
