-- Run as postgres after the migration. Every fixture is rolled back.
begin;
set local timezone='UTC';
insert into auth.users(id,email,raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000001','tna-test-a@example.invalid','{"display_name":"An"}'),
  ('10000000-0000-0000-0000-000000000002','tna-test-b@example.invalid','{"display_name":"Bình"}'),
  ('10000000-0000-0000-0000-000000000003','tna-test-c@example.invalid','{"display_name":"Chi"}');
insert into public.decks(id,language,name) values
  ('20000000-0000-0000-0000-000000000001','en','Test English'),
  ('20000000-0000-0000-0000-000000000002','zh','Test Chinese');
insert into public.words(id,deck_id,language,term,meaning,order_index,accepted_answers) values
  ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','en','hello','xin chào',1,'{hi}'),
  ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','en','goodbye','tạm biệt',2,'{}'),
  ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','zh','你好','xin chào',1,'{}');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.save_settings('An','20:00',true,'[
  {"language":"en","enabled":true,"daily_target":5,"deck_ids":["20000000-0000-0000-0000-000000000001"]},
  {"language":"zh","enabled":true,"daily_target":5,"deck_ids":["20000000-0000-0000-0000-000000000002"]}
]');

do $$ declare v_data jsonb; v_result jsonb; v_item uuid; v_attempt uuid:=gen_random_uuid(); v_progress jsonb; v_count integer; begin
  v_data:=public.start_daily_sessions();
  if jsonb_array_length(v_data->'sessions')<>2 or jsonb_array_length(v_data->'items')<>3 then raise exception 'Daily snapshot must include both tracks and available words only'; end if;
  v_data:=public.start_daily_sessions();
  if jsonb_array_length(v_data->'items')<>3 then raise exception 'Resume created duplicate items'; end if;
  if exists(select 1 from public.completed_days where user_id=auth.uid()) then raise exception 'Day completed too early'; end if;
  select i.id into v_item from public.session_items i join public.study_sessions s on s.id=i.session_id where s.user_id=auth.uid() and i.word_id='30000000-0000-0000-0000-000000000001';
  v_result:=public.submit_answer(v_item,v_attempt,'good',' HELLO ','meaning',false);
  if not (v_result->>'is_correct')::boolean or (v_result->'progress'->>'interval_days')::integer<>1 then raise exception 'First correct answer schedule wrong'; end if;
  if (v_result->'progress'->>'ease_factor')::numeric<>2.5 then raise exception 'Good rating should retain initial ease'; end if;
  v_progress:=v_result->'progress';
  if public.submit_answer(v_item,v_attempt,'easy','wrong','meaning',true)<>v_result then raise exception 'Retry did not replay original response'; end if;
  if public.submit_answer(v_item,gen_random_uuid(),'easy','wrong','meaning',true)<>v_result then raise exception 'Same item counted twice'; end if;
  select count(*) into v_count from public.practice_attempts where user_id=auth.uid();
  if v_count<>1 then raise exception 'Duplicate attempt recorded'; end if;
  if exists(select 1 from public.word_progress where user_id=auth.uid() and language='zh') then raise exception 'English answer altered Chinese progress'; end if;
  v_result:=public.practice_word('30000000-0000-0000-0000-000000000001',gen_random_uuid(),'hi','meaning',false);
  if not (v_result->>'is_correct')::boolean or v_result->'progress'<>v_progress then raise exception 'Accepted answer or free success mutated schedule'; end if;
  v_result:=public.practice_word('30000000-0000-0000-0000-000000000001',gen_random_uuid(),'wrong','meaning',true);
  if (v_result->'progress'->>'ease_factor')::numeric<>1.96 then raise exception 'First daily free failure did not penalize'; end if;
  v_progress:=v_result->'progress';
  v_result:=public.practice_word('30000000-0000-0000-0000-000000000001',gen_random_uuid(),'wrong again','meaning',true);
  if v_result->'progress'<>v_progress then raise exception 'Second free failure penalized twice'; end if;
  v_result:=public.practice_word('30000000-0000-0000-0000-000000000002',gen_random_uuid(),'goodbye','meaning',true);
  if v_result->'progress'<>'null'::jsonb then raise exception 'Free practice incorrectly introduced new SRS word'; end if;
end $$;

-- Settings changes after starting affect tomorrow; session targets remain fixed.
select public.save_settings('An mới','21:30',true,'[
  {"language":"en","enabled":true,"daily_target":10,"deck_ids":[]},
  {"language":"zh","enabled":false,"daily_target":8,"deck_ids":[]}
]');
do $$ begin
  if not exists(select 1 from public.language_settings where user_id=auth.uid() and language='zh' and enabled and pending_enabled=false and effective_date=tna_private.study_day()+1) then raise exception 'Language pause applied before tomorrow'; end if;
  if not exists(select 1 from public.study_sessions where user_id=auth.uid() and language='en' and new_target=2) then raise exception 'Frozen target changed'; end if;
  if (select daily_target from public.language_settings where user_id=auth.uid() and language='en')<>5 then raise exception 'Daily target changed mid-day'; end if;
end $$;

-- Exercise all SM-2 grades against a known mature baseline.
do $$ declare v_rating text; v_item uuid; v_result jsonb; v_expected numeric; begin
  select i.id into v_item from public.session_items i join public.study_sessions s on s.id=i.session_id where s.user_id=auth.uid() and i.word_id='30000000-0000-0000-0000-000000000001';
  foreach v_rating in array array['forgot','hard','good','easy'] loop
    delete from public.practice_attempts where item_id=v_item;
    update public.session_items set completed_at=null,rating=null,is_correct=null where id=v_item;
    update public.word_progress set repetitions=2,ease_factor=2.5,interval_days=3 where user_id=auth.uid() and word_id='30000000-0000-0000-0000-000000000001';
    v_result:=public.submit_answer(v_item,gen_random_uuid(),v_rating,'hello','meaning',true);
    v_expected:=case v_rating when 'forgot' then 1.96 when 'hard' then 2.36 when 'good' then 2.5 else 2.6 end;
    if (v_result->'progress'->>'ease_factor')::numeric<>v_expected then raise exception 'Wrong ease for %: %',v_rating,v_result; end if;
    if (v_result->'progress'->>'interval_days')::integer <> (case v_rating when 'forgot' then 1 when 'hard' then 7 else 8 end) then raise exception 'Wrong interval for %',v_rating; end if;
  end loop;
  delete from public.practice_attempts where item_id=v_item;
  update public.session_items set completed_at=null where id=v_item;
  v_result:=public.submit_answer(v_item,gen_random_uuid(),'easy','WRONG','meaning',true);
  if (v_result->'progress'->>'repetitions')::integer<>0 or (v_result->'progress'->>'interval_days')::integer<>1 then raise exception 'Wrong writing must override easy rating'; end if;
end $$;

-- Completing English alone does not finish the day; Chinese mistakes still count as work.
do $$ declare v_item uuid; v_result jsonb; begin
  select i.id into v_item from public.session_items i join public.study_sessions s on s.id=i.session_id where s.user_id=auth.uid() and i.word_id='30000000-0000-0000-0000-000000000002';
  perform public.submit_answer(v_item,gen_random_uuid(),'good','goodbye','dictation',true);
  if exists(select 1 from public.completed_days where user_id=auth.uid() and study_date=tna_private.study_day()) then raise exception 'One of two languages completed day'; end if;
  select i.id into v_item from public.session_items i join public.study_sessions s on s.id=i.session_id where s.user_id=auth.uid() and i.word_id='30000000-0000-0000-0000-000000000003';
  v_result:=public.submit_answer(v_item,gen_random_uuid(),'easy',null,'hanzi',false);
  if (v_result->>'is_correct')::boolean or not (v_result->>'day_completed')::boolean then raise exception 'Hanzi mistake or daily completion wrong'; end if;
  if (v_result->'progress'->>'repetitions')::integer<>0 then raise exception 'Hanzi first mistake did not override easy'; end if;
end $$;

-- Streak survives an unfinished today, breaks after a missed yesterday, timezone UTC+7.
do $$ begin
  delete from public.completed_days where user_id=auth.uid();
  insert into public.completed_days(user_id,study_date) values(auth.uid(),tna_private.study_day()-1),(auth.uid(),tna_private.study_day()-2);
  if tna_private.current_streak(auth.uid())<>2 then raise exception 'Unfinished today broke streak early'; end if;
  delete from public.completed_days where user_id=auth.uid() and study_date=tna_private.study_day()-1;
  if tna_private.current_streak(auth.uid())<>0 then raise exception 'Missed yesterday did not break streak'; end if;
  if ('2026-09-14 17:00:00+00'::timestamptz at time zone 'Asia/Ho_Chi_Minh')::date<>'2026-09-15'::date then raise exception 'UTC+7 rollover wrong'; end if;
end $$;

-- RPC writes enforce auth identity. Direct mutation grants are absent, RLS hides peers.
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles)<>1 then raise exception 'RLS leaked another profile'; end if;
  if exists(select 1 from public.word_progress where user_id<>auth.uid()) then raise exception 'RLS leaked another progress row'; end if;
  begin update public.word_progress set interval_days=999; raise exception 'Client could write progress'; exception when insufficient_privilege then null; end;
  begin insert into public.completed_days(user_id,study_date) values(auth.uid(),current_date); raise exception 'Client could forge completed day'; exception when insufficient_privilege then null; end;
  begin perform tna_private.generate_reminders(); raise exception 'Client could run global reminder job'; exception when insufficient_privilege then null; end;
  perform public.get_app_data();
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform public.get_app_data(); raise exception 'Anonymous RPC accepted'; exception when invalid_authorization_specification then null; end;
end $$;
set local role anon;
do $$ begin
  begin perform public.get_app_data(); raise exception 'Anonymous execute grant exists'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.decks; raise exception 'Anonymous table access exists'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Two people join; third use, self use, and expiry are refused. Shared content stays owner-editable.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare v_code text; begin
  v_code:=public.create_invite()->>'invite_code';
  begin perform public.join_couple(v_code); raise exception 'Self invite accepted'; exception when raise_exception then if sqlerrm='Self invite accepted' then raise; end if; end;
  if (select expires_at-created_at from public.couple_invites where code=v_code)<>interval '7 days' then raise exception 'Invite expiry not seven days'; end if;
end $$;
do $$ declare v_deck jsonb; begin
  begin perform public.save_deck('20000000-0000-0000-0000-000000000001','en','Unauthorized edit',''); raise exception 'Built-in edited'; exception when insufficient_privilege then null; end;
  v_deck:=public.save_deck(null,'en','Private test','Shared with partner');
  perform public.save_word(null,(v_deck->>'id')::uuid,'{"term":"together","meaning":"cùng nhau"}');
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select public.join_couple((select code from public.couple_invites where owner_id='10000000-0000-0000-0000-000000000001' and used_at is null limit 1));
do $$ declare v_deck uuid; v_data jsonb; begin
  select id into v_deck from public.decks where name='Private test';
  if not tna_private.can_access_deck(v_deck) then raise exception 'Pair cannot read shared deck'; end if;
  begin perform public.save_deck(v_deck,'en','Stolen deck',''); raise exception 'Partner edited owner deck'; exception when insufficient_privilege then null; end;
  begin perform public.save_word(null,v_deck,'{"term":"bad","meaning":"sai"}'); raise exception 'Partner added owner word'; exception when insufficient_privilege then null; end;
  v_data:=public.get_app_data();
  if v_data->'partner'->>'display_name'<>'An mới' then raise exception 'Partner summary unavailable'; end if;
  if v_data->'partner' ? 'reminder_time' or v_data->'partner' ? 'email' then raise exception 'Partner summary leaked private profile'; end if;
  perform public.encourage_partner(); perform public.encourage_partner();
  if (select count(*) from public.notifications where type='heart' and user_id='10000000-0000-0000-0000-000000000001')<>1 then raise exception 'Heart duplicate'; end if;
end $$;
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles)<>1 then raise exception 'Couple exposed full profiles'; end if;
  if exists(select 1 from public.practice_attempts) then raise exception 'Couple exposed partner detailed history'; end if;
  if not exists(select 1 from public.decks where name='Private test') then raise exception 'RLS blocked partner shared deck'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$ declare v_code text; begin
  select code into v_code from public.couple_invites where owner_id='10000000-0000-0000-0000-000000000001' limit 1;
  begin perform public.join_couple(v_code); raise exception 'Third member joined'; exception when raise_exception then if sqlerrm='Third member joined' then raise; end if; end;
  if (select count(*) from public.couple_members)<>2 then raise exception 'Couple membership cardinality violated'; end if;
  if exists(select 1 from public.decks where name='Private test' and tna_private.can_access_deck(id)) then raise exception 'Unrelated account can read deck'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select public.leave_couple();
do $$ begin
  if exists(select 1 from public.decks where name='Private test' and tna_private.can_access_deck(id)) then raise exception 'Leaving did not revoke deck access'; end if;
  if not exists(select 1 from public.practice_attempts where user_id='10000000-0000-0000-0000-000000000001') then raise exception 'Leaving erased personal history'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select public.create_invite();
update public.couple_invites set expires_at=now()-interval '1 second' where owner_id=auth.uid();
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ declare v_code text; begin
  select code into v_code from public.couple_invites where owner_id='10000000-0000-0000-0000-000000000003' limit 1;
  begin perform public.join_couple(v_code); raise exception 'Expired invite accepted'; exception when raise_exception then if sqlerrm='Expired invite accepted' then raise; end if; end;
end $$;

-- Atomic import and ownership, archive preserves history; missing content skips blocked items.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare v_deck uuid; v_before integer; v_word uuid; begin
  select id into v_deck from public.decks where name='Private test';
  perform public.import_words(v_deck,'[{"term":"one","meaning":"một"},{"term":"two","meaning":"hai"}]');
  select count(*) into v_before from public.words where deck_id=v_deck;
  begin
    perform public.import_words(v_deck,'[{"term":"three","meaning":"ba"},{"term":"","meaning":"bad"}]');
    raise exception 'Invalid import accepted';
  exception when raise_exception then if sqlerrm='Invalid import accepted' then raise; end if; end;
  if (select count(*) from public.words where deck_id=v_deck)<>v_before then raise exception 'Failed import partially committed'; end if;
  select id into v_word from public.words where deck_id=v_deck and term='one';
  perform public.archive_word(v_word);
  if not exists(select 1 from public.words where id=v_word and archived) then raise exception 'Archival deleted word'; end if;
  perform public.archive_deck(v_deck);
end $$;

-- New user with only learned words receives one maintenance item per enabled language.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select public.save_settings('Bình','00:00',true,'[
  {"language":"en","enabled":true,"daily_target":5,"deck_ids":["20000000-0000-0000-0000-000000000001"]},
  {"language":"zh","enabled":false,"daily_target":5,"deck_ids":["20000000-0000-0000-0000-000000000002"]}
]');
insert into public.word_progress(user_id,word_id,language,next_review_date,repetitions,interval_days)
  select auth.uid(),id,language,tna_private.study_day()+10,3,10 from public.words where deck_id='20000000-0000-0000-0000-000000000001';
select public.start_daily_sessions();
do $$ begin
  if (select count(*) from public.session_items i join public.study_sessions s on s.id=i.session_id where s.user_id=auth.uid() and i.kind='maintenance')<>1 then raise exception 'Missing maintenance fallback'; end if;
  if exists(select 1 from public.study_sessions where user_id=auth.uid() and language='zh') then raise exception 'Disabled language started'; end if;
end $$;

-- Reminder job runs even without an open client; at most one per person per day.
update public.profiles set reminder_time='00:00',reminders_enabled=true where id=auth.uid();
select tna_private.generate_reminders();
select tna_private.generate_reminders();
do $$ begin
  if (select count(*) from public.notifications where user_id=auth.uid() and type='reminder')<>1 then raise exception 'Reminder missing or duplicated'; end if;
  perform public.mark_notifications_read();
  if exists(select 1 from public.notifications where user_id=auth.uid() and read_at is null) then raise exception 'Unread marks not persisted'; end if;
end $$;
rollback;
