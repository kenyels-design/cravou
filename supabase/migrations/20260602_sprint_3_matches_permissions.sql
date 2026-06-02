begin;

create schema if not exists cravou;
create schema if not exists private;

grant usage on schema cravou to authenticated;
grant usage on schema cravou to anon;
grant usage on schema cravou to service_role;

create or replace function private.cravou_match_open_for_prediction(p_match_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from cravou.matches m
    where m.id::text = p_match_id
      and coalesce(m.status, 'pendente') = 'pendente'
      and now() < m.match_time
  );
$$;

do $$
begin
  if to_regclass('cravou.matches') is not null then
    execute 'grant select, insert, update, delete on table cravou.matches to authenticated';
    execute 'grant all on table cravou.matches to service_role';
    execute 'alter table cravou.matches enable row level security';

    execute 'drop policy if exists "cravou_matches_select_authenticated" on cravou.matches';
    execute 'drop policy if exists "cravou_matches_insert_admin_only" on cravou.matches';
    execute 'drop policy if exists "cravou_matches_update_admin_only" on cravou.matches';
    execute 'drop policy if exists "cravou_matches_delete_admin_only" on cravou.matches';

    execute $policy$
      create policy "cravou_matches_select_authenticated"
      on cravou.matches
      for select
      to authenticated
      using (true)
    $policy$;

    execute $policy$
      create policy "cravou_matches_insert_admin_only"
      on cravou.matches
      for insert
      to authenticated
      with check (cravou.is_admin())
    $policy$;

    execute $policy$
      create policy "cravou_matches_update_admin_only"
      on cravou.matches
      for update
      to authenticated
      using (cravou.is_admin())
      with check (cravou.is_admin())
    $policy$;

    execute $policy$
      create policy "cravou_matches_delete_admin_only"
      on cravou.matches
      for delete
      to authenticated
      using (cravou.is_admin())
    $policy$;
  end if;

  if to_regclass('cravou.predictions') is not null then
    execute 'grant select, insert, update on table cravou.predictions to authenticated';
    execute 'grant all on table cravou.predictions to service_role';
    execute 'alter table cravou.predictions enable row level security';

    execute 'drop policy if exists "cravou_predictions_select_own" on cravou.predictions';
    execute 'drop policy if exists "cravou_predictions_insert_own_open_match" on cravou.predictions';
    execute 'drop policy if exists "cravou_predictions_update_own_open_match" on cravou.predictions';

    execute $policy$
      create policy "cravou_predictions_select_own"
      on cravou.predictions
      for select
      to authenticated
      using ((select auth.uid()) = user_id)
    $policy$;

    execute $policy$
      create policy "cravou_predictions_insert_own_open_match"
      on cravou.predictions
      for insert
      to authenticated
      with check (
        (select auth.uid()) = user_id
        and private.cravou_match_open_for_prediction(match_id::text)
      )
    $policy$;

    execute $policy$
      create policy "cravou_predictions_update_own_open_match"
      on cravou.predictions
      for update
      to authenticated
      using (
        (select auth.uid()) = user_id
        and private.cravou_match_open_for_prediction(match_id::text)
      )
      with check (
        (select auth.uid()) = user_id
        and private.cravou_match_open_for_prediction(match_id::text)
      )
    $policy$;
  end if;
end
$$;

commit;
