begin;

create schema if not exists cravou;
create schema if not exists private;

create or replace function private.cravou_match_open_for_prediction_update(p_match_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from cravou.matches m
    where m.id::text = p_match_id
      and coalesce(m.status, 'pendente') = 'pendente'
      and now() < (m.match_time - interval '1 hour')
  );
$$;

drop policy if exists "cravou_predictions_update_own_open_match" on cravou.predictions;

create policy "cravou_predictions_update_own_open_match"
on cravou.predictions
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and private.cravou_match_open_for_prediction_update(match_id::text)
)
with check (
  (select auth.uid()) = user_id
  and private.cravou_match_open_for_prediction_update(match_id::text)
);

commit;
