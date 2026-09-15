-- Optional: run AFTER the migration in Supabase SQL Editor as postgres.
-- Re-running updates the same named job; it does not create duplicate jobs.
do $setup$
begin
  begin
    create extension if not exists pg_cron with schema pg_catalog;
  exception when others then
    raise notice 'Không bật được pg_cron: %. Hãy bật Cron trong Supabase Integrations rồi chạy lại file này.',sqlerrm;
    return;
  end;
  perform cron.schedule('tna-vocabulary-reminders','* * * * *','select tna_private.generate_reminders();');
  raise notice 'Đã bật nhắc học. Mỗi người tối đa một thông báo nhắc/ngày theo UTC+7.';
end
$setup$;

-- Inspect job status in Supabase > Integrations > Cron.
-- To stop reminders globally: select cron.unschedule('tna-vocabulary-reminders');
