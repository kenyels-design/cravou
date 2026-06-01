begin;

create schema if not exists cravou;

create or replace function cravou.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function cravou.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

create table if not exists cravou.settings (
  setting_key text primary key,
  setting_value_text text,
  updated_by uuid references public.cravou_users(id),
  updated_at timestamptz not null default now()
);

create or replace function cravou.top3_window_open()
returns boolean
language sql
stable
as $$
  select coalesce(
    (
      select setting_value_text::timestamptz > now()
      from cravou.settings
      where setting_key = 'top3_predictions_lock_at'
    ),
    true
  );
$$;

create table if not exists cravou.teams (
  id bigint generated always as identity primary key,
  name text not null unique,
  fifa_code text unique,
  flag_emoji text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cravou.top3_predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.cravou_users(id) on delete cascade,
  champion_team_id bigint not null references cravou.teams(id),
  vice_team_id bigint not null references cravou.teams(id),
  third_place_team_id bigint not null references cravou.teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cravou_top3_predictions_user_unique unique (user_id),
  constraint cravou_top3_predictions_distinct_choices check (
    champion_team_id <> vice_team_id
    and champion_team_id <> third_place_team_id
    and vice_team_id <> third_place_team_id
  )
);

create table if not exists cravou.final_result (
  id boolean primary key default true check (id),
  champion_team_id bigint references cravou.teams(id),
  vice_team_id bigint references cravou.teams(id),
  third_place_team_id bigint references cravou.teams(id),
  updated_by uuid references public.cravou_users(id),
  updated_at timestamptz not null default now(),
  constraint cravou_final_result_distinct_1 check (
    champion_team_id is null or vice_team_id is null or champion_team_id <> vice_team_id
  ),
  constraint cravou_final_result_distinct_2 check (
    champion_team_id is null or third_place_team_id is null or champion_team_id <> third_place_team_id
  ),
  constraint cravou_final_result_distinct_3 check (
    vice_team_id is null or third_place_team_id is null or vice_team_id <> third_place_team_id
  )
);

insert into cravou.settings (setting_key, setting_value_text)
values ('top3_predictions_lock_at', null)
on conflict (setting_key) do nothing;

insert into cravou.teams (name, fifa_code, flag_emoji, display_order)
values
  ('Brasil', 'BRA', '🇧🇷', 1),
  ('Argentina', 'ARG', '🇦🇷', 2),
  ('França', 'FRA', '🇫🇷', 3),
  ('Inglaterra', 'ENG', '🏴', 4),
  ('Espanha', 'ESP', '🇪🇸', 5),
  ('Alemanha', 'GER', '🇩🇪', 6),
  ('Portugal', 'POR', '🇵🇹', 7),
  ('Itália', 'ITA', '🇮🇹', 8),
  ('Holanda', 'NED', '🇳🇱', 9),
  ('Bélgica', 'BEL', '🇧🇪', 10),
  ('Uruguai', 'URU', '🇺🇾', 11),
  ('Croácia', 'CRO', '🇭🇷', 12),
  ('Marrocos', 'MAR', '🇲🇦', 13),
  ('Estados Unidos', 'USA', '🇺🇸', 14),
  ('México', 'MEX', '🇲🇽', 15),
  ('Japão', 'JPN', '🇯🇵', 16)
on conflict (name) do nothing;

drop trigger if exists trg_cravou_teams_updated_at on cravou.teams;
create trigger trg_cravou_teams_updated_at
before update on cravou.teams
for each row
execute function cravou.set_updated_at();

drop trigger if exists trg_cravou_top3_predictions_updated_at on cravou.top3_predictions;
create trigger trg_cravou_top3_predictions_updated_at
before update on cravou.top3_predictions
for each row
execute function cravou.set_updated_at();

drop trigger if exists trg_cravou_final_result_updated_at on cravou.final_result;
create trigger trg_cravou_final_result_updated_at
before update on cravou.final_result
for each row
execute function cravou.set_updated_at();

drop trigger if exists trg_cravou_settings_updated_at on cravou.settings;
create trigger trg_cravou_settings_updated_at
before update on cravou.settings
for each row
execute function cravou.set_updated_at();

grant usage on schema cravou to authenticated;
grant usage on schema cravou to anon;
grant usage on schema cravou to service_role;

grant all on all tables in schema cravou to authenticated;
grant all on all tables in schema cravou to service_role;

grant all on all sequences in schema cravou to authenticated;
grant all on all sequences in schema cravou to service_role;

alter table cravou.teams enable row level security;
alter table cravou.top3_predictions enable row level security;
alter table cravou.final_result enable row level security;
alter table cravou.settings enable row level security;

drop policy if exists "cravou_teams_select_authenticated" on cravou.teams;
drop policy if exists "cravou_teams_insert_admin" on cravou.teams;
drop policy if exists "cravou_teams_update_admin" on cravou.teams;
drop policy if exists "cravou_teams_delete_admin" on cravou.teams;

create policy "cravou_teams_select_authenticated"
on cravou.teams
for select
to authenticated
using (true);

create policy "cravou_teams_insert_admin"
on cravou.teams
for insert
to authenticated
with check (cravou.is_admin());

create policy "cravou_teams_update_admin"
on cravou.teams
for update
to authenticated
using (cravou.is_admin())
with check (cravou.is_admin());

create policy "cravou_teams_delete_admin"
on cravou.teams
for delete
to authenticated
using (cravou.is_admin());

drop policy if exists "cravou_top3_predictions_select_own" on cravou.top3_predictions;
drop policy if exists "cravou_top3_predictions_insert_own_open" on cravou.top3_predictions;
drop policy if exists "cravou_top3_predictions_update_own_open" on cravou.top3_predictions;

create policy "cravou_top3_predictions_select_own"
on cravou.top3_predictions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "cravou_top3_predictions_insert_own_open"
on cravou.top3_predictions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and cravou.top3_window_open()
);

create policy "cravou_top3_predictions_update_own_open"
on cravou.top3_predictions
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and cravou.top3_window_open()
)
with check (
  (select auth.uid()) = user_id
  and cravou.top3_window_open()
);

drop policy if exists "cravou_final_result_select_authenticated" on cravou.final_result;
drop policy if exists "cravou_final_result_insert_admin" on cravou.final_result;
drop policy if exists "cravou_final_result_update_admin" on cravou.final_result;
drop policy if exists "cravou_final_result_delete_admin" on cravou.final_result;

create policy "cravou_final_result_select_authenticated"
on cravou.final_result
for select
to authenticated
using (true);

create policy "cravou_final_result_insert_admin"
on cravou.final_result
for insert
to authenticated
with check (cravou.is_admin());

create policy "cravou_final_result_update_admin"
on cravou.final_result
for update
to authenticated
using (cravou.is_admin())
with check (cravou.is_admin());

create policy "cravou_final_result_delete_admin"
on cravou.final_result
for delete
to authenticated
using (cravou.is_admin());

drop policy if exists "cravou_settings_select_authenticated" on cravou.settings;
drop policy if exists "cravou_settings_insert_admin" on cravou.settings;
drop policy if exists "cravou_settings_update_admin" on cravou.settings;
drop policy if exists "cravou_settings_delete_admin" on cravou.settings;

create policy "cravou_settings_select_authenticated"
on cravou.settings
for select
to authenticated
using (true);

create policy "cravou_settings_insert_admin"
on cravou.settings
for insert
to authenticated
with check (cravou.is_admin());

create policy "cravou_settings_update_admin"
on cravou.settings
for update
to authenticated
using (cravou.is_admin())
with check (cravou.is_admin());

create policy "cravou_settings_delete_admin"
on cravou.settings
for delete
to authenticated
using (cravou.is_admin());

commit;
