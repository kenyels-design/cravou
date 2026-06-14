do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'sync-matches-scheduled'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'sync-matches-scheduled',
  '0 */2 * * *',
  $$
  select
    net.http_post(
      url := 'https://egkhuqubeunojbrpambp.supabase.co/functions/v1/sync-matches?mode=scheduled',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
