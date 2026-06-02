begin;

alter table public.cravou_users enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cravou_users'
      and policyname = 'users can update own profile'
  ) then
    create policy "users can update own profile"
    on public.cravou_users
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);
  end if;
end
$$;

commit;
