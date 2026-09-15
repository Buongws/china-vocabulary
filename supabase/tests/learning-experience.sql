begin;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000011'),('10000000-0000-0000-0000-000000000012');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000011',true);
set local role authenticated;
select public.set_preferred_language('en');
select public.start_daily_sessions();
do $$ declare v_item uuid; v_snapshot jsonb; v_before jsonb; v_viewed timestamptz; begin
  v_snapshot:=public.get_app_data();
  if v_snapshot->'profile'->>'preferred_language'<>'en' or jsonb_array_length(v_snapshot->'sessions')<>1 or v_snapshot->'sessions'->0->>'language'<>'en' then raise exception 'Onboarding did not enable English only'; end if;
  v_item:=(v_snapshot->'items'->0->>'id')::uuid;
  perform public.mark_item_viewed(v_item);
  select viewed_at into v_viewed from public.session_items where id=v_item;
  perform public.mark_item_viewed(v_item);
  if v_viewed is null or (select viewed_at from public.session_items where id=v_item)<>v_viewed then raise exception 'Viewed timestamp must be idempotent'; end if;
  v_snapshot:=public.get_app_data();
  if jsonb_array_length(v_snapshot->'progress')<>0 or jsonb_array_length(v_snapshot->'attempts')<>0 or jsonb_array_length(v_snapshot->'completed_days')<>0 or (v_snapshot->'items'->0->>'completed_at') is not null then raise exception 'Viewing incorrectly changes learning results'; end if;
  v_before:=v_snapshot->'items';
  perform public.save_learning_settings('Test','20:00',true,'[{"language":"en","enabled":false,"daily_target":5,"deck_ids":[]},{"language":"zh","enabled":true,"daily_target":5,"deck_ids":[]}]','zh');
  v_snapshot:=public.get_app_data();
  if v_snapshot->'profile'->>'preferred_language'<>'zh' or v_snapshot->'items'<>v_before then raise exception 'Settings changed session items'; end if;
  if not exists(select 1 from public.language_settings where user_id=auth.uid() and language='en' and enabled and pending_enabled=false) then raise exception 'Settings did not defer'; end if;
  perform public.set_preferred_language('en');
  if not exists(select 1 from public.language_settings where user_id=auth.uid() and language='en' and pending_enabled=false) then raise exception 'Changing priority overwrote schedule'; end if;
  perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000012',true);
  begin
    perform public.mark_item_viewed(v_item);
    raise exception 'Another user could mark item viewed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_preferred_language(null);
    raise exception 'Accepted null language';
  exception when raise_exception then
    if sqlerrm='Accepted null language' then raise; end if;
  end;
end $$;
reset role;
rollback;
