begin;

create schema if not exists cravou;

do $$
declare
  fk record;
begin
  if to_regclass('cravou.settings') is not null then
    for fk in
      select con.conname
      from pg_constraint con
      join pg_class rel
        on rel.oid = con.conrelid
      join pg_namespace nsp
        on nsp.oid = rel.relnamespace
      join pg_attribute att
        on att.attrelid = rel.oid
       and att.attnum = any (con.conkey)
      where con.contype = 'f'
        and nsp.nspname = 'cravou'
        and rel.relname = 'settings'
        and att.attname = 'updated_by'
    loop
      execute format('alter table cravou.settings drop constraint %I', fk.conname);
    end loop;

    alter table cravou.settings
      add constraint cravou_settings_updated_by_fkey
      foreign key (updated_by)
      references public.cravou_users(id)
      on delete set null;
  end if;

  if to_regclass('cravou.final_result') is not null then
    for fk in
      select con.conname
      from pg_constraint con
      join pg_class rel
        on rel.oid = con.conrelid
      join pg_namespace nsp
        on nsp.oid = rel.relnamespace
      join pg_attribute att
        on att.attrelid = rel.oid
       and att.attnum = any (con.conkey)
      where con.contype = 'f'
        and nsp.nspname = 'cravou'
        and rel.relname = 'final_result'
        and att.attname = 'updated_by'
    loop
      execute format('alter table cravou.final_result drop constraint %I', fk.conname);
    end loop;

    alter table cravou.final_result
      add constraint cravou_final_result_updated_by_fkey
      foreign key (updated_by)
      references public.cravou_users(id)
      on delete set null;
  end if;

  if to_regclass('cravou.predictions') is not null then
    for fk in
      select con.conname
      from pg_constraint con
      join pg_class rel
        on rel.oid = con.conrelid
      join pg_namespace nsp
        on nsp.oid = rel.relnamespace
      join pg_attribute att
        on att.attrelid = rel.oid
       and att.attnum = any (con.conkey)
      where con.contype = 'f'
        and nsp.nspname = 'cravou'
        and rel.relname = 'predictions'
        and att.attname = 'user_id'
    loop
      execute format('alter table cravou.predictions drop constraint %I', fk.conname);
    end loop;

    alter table cravou.predictions
      add constraint cravou_predictions_user_id_fkey
      foreign key (user_id)
      references public.cravou_users(id)
      on delete cascade;
  end if;

  if to_regclass('cravou.top3_predictions') is not null then
    for fk in
      select con.conname
      from pg_constraint con
      join pg_class rel
        on rel.oid = con.conrelid
      join pg_namespace nsp
        on nsp.oid = rel.relnamespace
      join pg_attribute att
        on att.attrelid = rel.oid
       and att.attnum = any (con.conkey)
      where con.contype = 'f'
        and nsp.nspname = 'cravou'
        and rel.relname = 'top3_predictions'
        and att.attname = 'user_id'
    loop
      execute format('alter table cravou.top3_predictions drop constraint %I', fk.conname);
    end loop;

    alter table cravou.top3_predictions
      add constraint cravou_top3_predictions_user_id_fkey
      foreign key (user_id)
      references public.cravou_users(id)
      on delete cascade;
  end if;
end
$$;

commit;
