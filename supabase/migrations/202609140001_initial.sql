-- TNA Vocabulary. Apply once, as postgres, in the Supabase SQL Editor.
begin;

create schema if not exists tna_private;
revoke all on schema tna_private from public, anon;
grant usage on schema tna_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Bạn học' check (length(display_name) between 1 and 80),
  reminder_time time not null default '20:00',
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.language_settings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  language text not null check (language in ('zh','en')),
  enabled boolean not null default true,
  daily_target integer not null default 5 check (daily_target between 1 and 50),
  deck_ids uuid[] not null default '{}',
  auto_pace boolean not null default true,
  pending_enabled boolean,
  pending_daily_target integer check (pending_daily_target between 1 and 50),
  pending_deck_ids uuid[],
  effective_date date,
  primary key (user_id, language)
);
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table public.couple_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade
);
create index couple_members_couple_idx on public.couple_members(couple_id);
create table public.couple_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  code text unique not null,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index couple_invites_owner_idx on public.couple_invites(owner_id);
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  language text not null check (language in ('zh','en')),
  name text not null check (length(name) between 1 and 100),
  description text not null default '' check (length(description) <= 1000),
  level text not null default 'Cơ bản',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  order_index integer not null default 0,
  unique (id,language)
);
create index decks_owner_idx on public.decks(owner_id);
create table public.words (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null,
  language text not null check (language in ('zh','en')),
  term text not null check (length(term) between 1 and 100),
  pronunciation text not null default '' check (length(pronunciation) <= 200),
  meaning text not null check (length(meaning) between 1 and 500),
  example_sentence text not null default '' check (length(example_sentence) <= 1000),
  example_translation text not null default '' check (length(example_translation) <= 1000),
  accepted_answers text[] not null default '{}' check (cardinality(accepted_answers) <= 20),
  archived boolean not null default false,
  order_index integer not null default 0,
  foreign key (deck_id,language) references public.decks(id,language) on delete cascade
);
create index words_deck_idx on public.words(deck_id,order_index);
create table public.word_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  language text not null check (language in ('zh','en')),
  repetitions integer not null default 0 check (repetitions >= 0),
  ease_factor numeric(6,3) not null default 2.5 check (ease_factor >= 1.3),
  interval_days integer not null default 0 check (interval_days >= 0),
  next_review_date date not null,
  last_reviewed_at timestamptz,
  status text not null default 'learning' check (status in ('learning','review','mastered')),
  last_practice_penalty_date date,
  primary key (user_id,word_id)
);
create index word_progress_due_idx on public.word_progress(user_id,language,next_review_date);
create table public.daily_plans (
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_date date not null,
  languages text[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id,study_date)
);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  language text not null check (language in ('zh','en')),
  study_date date not null,
  new_target integer not null default 0,
  review_target integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id,language,study_date)
);
create table public.session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  kind text not null check (kind in ('new','review','maintenance')),
  order_index integer not null default 0,
  completed_at timestamptz,
  rating text check (rating in ('forgot','hard','good','easy')),
  is_correct boolean,
  skipped boolean not null default false,
  unique (session_id,word_id)
);
create index session_items_session_idx on public.session_items(session_id,order_index);
create table public.practice_attempts (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  item_id uuid references public.session_items(id) on delete cascade,
  language text not null check (language in ('zh','en')),
  is_correct boolean not null,
  mode text not null check (mode in ('hanzi','dictation','cloze','meaning')),
  answer text,
  response jsonb not null,
  created_at timestamptz not null default now()
);
create index practice_attempts_user_date_idx on public.practice_attempts(user_id,created_at);
create unique index practice_attempts_item_idx on public.practice_attempts(item_id) where item_id is not null;
create table public.completed_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_date date not null,
  completed_at timestamptz not null default now(),
  primary key (user_id,study_date)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('reminder','heart','system')),
  message text not null,
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id,dedupe_key)
);
create index notifications_user_date_idx on public.notifications(user_id,created_at desc);

create function tna_private.study_day() returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Ho_Chi_Minh')::date $$;
create function tna_private.require_user() returns uuid language plpgsql stable set search_path = ''
as $$ begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập.' using errcode='28000'; end if;
  return auth.uid();
end $$;
create function tna_private.partner_id(p_user uuid) returns uuid language sql stable security definer set search_path = ''
as $$ select b.user_id from public.couple_members a join public.couple_members b on b.couple_id=a.couple_id and b.user_id<>a.user_id where a.user_id=p_user limit 1 $$;
create function tna_private.can_access_deck(p_deck uuid) returns boolean language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists(select 1 from public.decks d where d.id=p_deck and (d.owner_id is null or d.owner_id=auth.uid() or d.owner_id=tna_private.partner_id(auth.uid()))) $$;
create function tna_private.ensure_profile() returns uuid language plpgsql security definer set search_path = ''
as $$ declare v_user uuid := tna_private.require_user(); begin
  insert into public.profiles(id,display_name)
    select id,left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Bạn học'),80) from auth.users where id=v_user
    on conflict (id) do nothing;
  insert into public.language_settings(user_id,language) values(v_user,'zh'),(v_user,'en') on conflict do nothing;
  update public.language_settings set enabled=coalesce(pending_enabled,enabled), daily_target=coalesce(pending_daily_target,daily_target),
    deck_ids=coalesce(pending_deck_ids,deck_ids), pending_enabled=null,pending_daily_target=null,pending_deck_ids=null,effective_date=null
    where user_id=v_user and effective_date<=tna_private.study_day();
  return v_user;
end $$;
create function tna_private.handle_new_user() returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Bạn học'),80)) on conflict do nothing;
  insert into public.language_settings(user_id,language) values(new.id,'zh'),(new.id,'en') on conflict do nothing;
  return new;
end $$;
create trigger tna_auth_user_created after insert on auth.users for each row execute function tna_private.handle_new_user();
-- Accounts created before this migration are initialized too.
insert into public.profiles(id,display_name) select id,left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Bạn học'),80) from auth.users on conflict do nothing;
insert into public.language_settings(user_id,language) select p.id,l.language from public.profiles p cross join (values('zh'),('en')) l(language) on conflict do nothing;

create function tna_private.reconcile_day(p_user uuid,p_day date) returns void language plpgsql security definer set search_path = ''
as $$ begin
  -- A departed partner or archived word must not leave an unfinishable daily plan.
  update public.session_items i set completed_at=now(),skipped=true
    from public.study_sessions s,public.words w,public.decks d
    where i.session_id=s.id and i.word_id=w.id and w.deck_id=d.id and s.user_id=p_user and s.study_date=p_day and i.completed_at is null
      and (w.archived or d.archived or not (d.owner_id is null or d.owner_id=p_user or d.owner_id=tna_private.partner_id(p_user)));
  update public.study_sessions s set completed_at=now() where s.user_id=p_user and s.study_date=p_day and s.completed_at is null
    and not exists(select 1 from public.session_items i where i.session_id=s.id and i.completed_at is null);
  if exists(select 1 from public.daily_plans where user_id=p_user and study_date=p_day and cardinality(languages)>0)
    and not exists(select 1 from public.study_sessions where user_id=p_user and study_date=p_day and completed_at is null)
    and (select count(*) from public.study_sessions where user_id=p_user and study_date=p_day) =
      (select cardinality(languages) from public.daily_plans where user_id=p_user and study_date=p_day) then
    insert into public.completed_days(user_id,study_date) values(p_user,p_day) on conflict do nothing;
  end if;
end $$;
create function tna_private.current_streak(p_user uuid) returns integer language plpgsql stable security definer set search_path = ''
as $$ declare v_day date:=tna_private.study_day(); v_count integer:=0; begin
  if not exists(select 1 from public.completed_days where user_id=p_user and study_date=v_day) then v_day:=v_day-1; end if;
  while exists(select 1 from public.completed_days where user_id=p_user and study_date=v_day) loop v_count:=v_count+1; v_day:=v_day-1; end loop;
  return v_count;
end $$;

create function public.get_app_data() returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_partner uuid:=tna_private.partner_id(v_user); v_couple jsonb; v_invite jsonb; begin
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  perform tna_private.reconcile_day(v_user,tna_private.study_day());
  select jsonb_build_object('id',c.id,'created_at',c.created_at,'completed_days',coalesce((select jsonb_agg(a.study_date order by a.study_date)
    from public.completed_days a join public.completed_days b on a.study_date=b.study_date and b.user_id=v_partner
    where a.user_id=v_user and a.study_date >= (c.created_at at time zone 'Asia/Ho_Chi_Minh')::date),'[]'::jsonb))
    into v_couple from public.couples c join public.couple_members m on m.couple_id=c.id where m.user_id=v_user;
  select jsonb_build_object('invite_code',code,'invite_expires_at',expires_at) into v_invite
    from public.couple_invites where owner_id=v_user and used_at is null and expires_at>now() order by created_at desc limit 1;
  return jsonb_build_object(
    'profile',(select to_jsonb(p) from public.profiles p where id=v_user),
    'settings',coalesce((select jsonb_agg(to_jsonb(s) order by language) from public.language_settings s where user_id=v_user),'[]'::jsonb),
    'decks',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at,d.name) from public.decks d where tna_private.can_access_deck(d.id)),'[]'::jsonb),
    'words',coalesce((select jsonb_agg(to_jsonb(w) order by w.order_index,w.term) from public.words w where tna_private.can_access_deck(w.deck_id)),'[]'::jsonb),
    'progress',coalesce((select jsonb_agg(to_jsonb(p)) from public.word_progress p where user_id=v_user),'[]'::jsonb),
    'sessions',coalesce((select jsonb_agg(to_jsonb(s) order by study_date desc,language) from public.study_sessions s where user_id=v_user),'[]'::jsonb),
    'items',coalesce((select jsonb_agg(to_jsonb(i) order by s.study_date desc,i.order_index) from public.session_items i join public.study_sessions s on s.id=i.session_id where s.user_id=v_user),'[]'::jsonb),
    'attempts',coalesce((select jsonb_agg(to_jsonb(a)-'answer'-'response' order by created_at desc) from public.practice_attempts a where user_id=v_user and created_at >= now()-interval '1 year'),'[]'::jsonb),
    'completed_days',coalesce((select jsonb_agg(study_date order by study_date) from public.completed_days where user_id=v_user),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by created_at desc) from (select * from public.notifications where user_id=v_user order by created_at desc limit 100) n),'[]'::jsonb),
    'couple',coalesce(v_couple,v_invite),
    'partner',case when v_partner is null then null else (select jsonb_build_object('display_name',display_name,
      'completed_today',exists(select 1 from public.completed_days where user_id=v_partner and study_date=tna_private.study_day()),
      'learned_count',(select count(*) from public.word_progress where user_id=v_partner),
      'streak',tna_private.current_streak(v_partner)) from public.profiles where id=v_partner) end
  );
end $$;

create function public.start_daily_sessions() returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_day date:=tna_private.study_day(); v_setting record; v_session uuid; v_count integer; begin
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  if exists(select 1 from public.daily_plans where user_id=v_user and study_date=v_day) then return public.get_app_data(); end if;
  insert into public.daily_plans(user_id,study_date,languages)
    values(v_user,v_day,coalesce((select array_agg(language order by language) from public.language_settings where user_id=v_user and enabled),'{}'));
  for v_setting in select * from public.language_settings where user_id=v_user and enabled order by language loop
    insert into public.study_sessions(user_id,language,study_date) values(v_user,v_setting.language,v_day) returning id into v_session;
    insert into public.session_items(session_id,word_id,kind,order_index)
      select v_session,w.id,'review',row_number() over(order by p.next_review_date,w.order_index,w.id)::integer
      from public.words w join public.decks d on d.id=w.deck_id join public.word_progress p on p.word_id=w.id and p.user_id=v_user
      where w.language=v_setting.language and not w.archived and not d.archived and tna_private.can_access_deck(d.id)
        and (cardinality(v_setting.deck_ids)=0 or w.deck_id=any(v_setting.deck_ids)) and p.next_review_date<=v_day;
    get diagnostics v_count=row_count;
    update public.study_sessions set review_target=v_count where id=v_session;
    insert into public.session_items(session_id,word_id,kind,order_index)
      select v_session,w.id,'new',v_count+(row_number() over(order by d.created_at,d.name,w.order_index,w.id))::integer
      from public.words w join public.decks d on d.id=w.deck_id
      where w.language=v_setting.language and not w.archived and not d.archived and tna_private.can_access_deck(d.id)
        and (cardinality(v_setting.deck_ids)=0 or w.deck_id=any(v_setting.deck_ids))
        and not exists(select 1 from public.word_progress p where p.user_id=v_user and p.word_id=w.id)
      order by d.created_at,d.name,w.order_index,w.id limit v_setting.daily_target;
    get diagnostics v_count=row_count;
    update public.study_sessions set new_target=v_count where id=v_session;
    if not exists(select 1 from public.session_items where session_id=v_session) then
      insert into public.session_items(session_id,word_id,kind,order_index)
        select v_session,w.id,'maintenance',1 from public.words w join public.decks d on d.id=w.deck_id join public.word_progress p on p.word_id=w.id and p.user_id=v_user
        where w.language=v_setting.language and not w.archived and not d.archived and tna_private.can_access_deck(d.id)
          and (cardinality(v_setting.deck_ids)=0 or w.deck_id=any(v_setting.deck_ids)) order by p.last_reviewed_at nulls first,w.id limit 1;
      get diagnostics v_count=row_count;
      update public.study_sessions set review_target=v_count where id=v_session;
    end if;
  end loop;
  perform tna_private.reconcile_day(v_user,v_day);
  return public.get_app_data();
end $$;

create function tna_private.normalize_answer(p_text text) returns text language sql immutable set search_path = ''
as $$ select lower(regexp_replace(trim(coalesce(p_text,'')),'\s+',' ','g')) $$;
create function tna_private.record_answer(p_item_id uuid,p_word_id uuid,p_attempt_id uuid,p_rating text,p_answer text,p_mode text,p_writing_correct boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$ declare
  v_user uuid:=tna_private.ensure_profile(); v_day date:=tna_private.study_day(); v_word public.words%rowtype; v_progress public.word_progress%rowtype;
  v_item public.session_items%rowtype; v_session public.study_sessions%rowtype; v_attempt public.practice_attempts%rowtype;
  v_correct boolean; v_score integer; v_ease numeric; v_interval integer; v_repetitions integer; v_response jsonb; v_word_id uuid:=p_word_id;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  if p_attempt_id is null then raise exception 'Thiếu mã lần gửi.'; end if;
  select * into v_attempt from public.practice_attempts where id=p_attempt_id;
  if found then
    if v_attempt.user_id<>v_user or v_attempt.item_id is distinct from p_item_id or (p_item_id is null and v_attempt.word_id is distinct from p_word_id)
      then raise exception 'Mã lần gửi đã được sử dụng.'; end if;
    return v_attempt.response;
  end if;
  if p_mode is null or p_mode not in ('hanzi','dictation','cloze','meaning') then raise exception 'Dạng luyện tập không hợp lệ.'; end if;
  if length(coalesce(p_answer,''))>2000 then raise exception 'Câu trả lời quá dài.'; end if;
  if p_item_id is not null then
    if p_rating is null or p_rating not in ('forgot','hard','good','easy') then raise exception 'Mức ghi nhớ không hợp lệ.'; end if;
    select i.* into v_item from public.session_items i join public.study_sessions s on s.id=i.session_id where i.id=p_item_id and s.user_id=v_user for update of i;
    if not found then raise exception 'Không tìm thấy bài học.' using errcode='42501'; end if;
    select * into v_session from public.study_sessions where id=v_item.session_id;
    if v_session.study_date<>v_day then raise exception 'Ngày học đã kết thúc. Vui lòng mở bài hôm nay.'; end if;
    if v_item.completed_at is not null then
      select response into v_response from public.practice_attempts where item_id=p_item_id and user_id=v_user;
      return coalesce(v_response,jsonb_build_object('already_completed',true,'skipped',v_item.skipped));
    end if;
    v_word_id:=v_item.word_id;
  end if;
  select w.* into v_word from public.words w join public.decks d on d.id=w.deck_id where w.id=v_word_id and not w.archived and not d.archived and tna_private.can_access_deck(d.id);
  if not found then raise exception 'Từ này không còn khả dụng.' using errcode='42501'; end if;
  if (v_word.language='zh' and p_mode<>'hanzi') or (v_word.language='en' and p_mode='hanzi') then raise exception 'Dạng luyện tập không phù hợp ngôn ngữ.'; end if;
  v_correct:=case when v_word.language='zh' then coalesce(p_writing_correct,false)
    else exists(select 1 from unnest(array_prepend(v_word.term,v_word.accepted_answers)) a where tna_private.normalize_answer(a)=tna_private.normalize_answer(p_answer)) end;
  select * into v_progress from public.word_progress where user_id=v_user and word_id=v_word_id for update;
  if p_item_id is not null then
    v_score:=case when not v_correct or p_rating='forgot' then 1 when p_rating='hard' then 3 when p_rating='good' then 4 else 5 end;
    v_ease:=greatest(1.3,coalesce(v_progress.ease_factor,2.5)+(0.1-(5-v_score)*(0.08+(5-v_score)*0.02)));
    if v_score<3 then v_repetitions:=0; v_interval:=1;
    else
      v_repetitions:=coalesce(v_progress.repetitions,0)+1;
      v_interval:=case when v_repetitions=1 then 1 when v_repetitions=2 then 3 else least(36500,greatest(1,round(v_progress.interval_days*v_ease)::integer)) end;
    end if;
    insert into public.word_progress(user_id,word_id,language,repetitions,ease_factor,interval_days,next_review_date,last_reviewed_at,status)
      values(v_user,v_word_id,v_word.language,v_repetitions,v_ease,v_interval,v_day+v_interval,now(),case when v_repetitions>=5 then 'mastered' when v_repetitions>=2 then 'review' else 'learning' end)
      on conflict(user_id,word_id) do update set repetitions=excluded.repetitions,ease_factor=excluded.ease_factor,interval_days=excluded.interval_days,
        next_review_date=excluded.next_review_date,last_reviewed_at=excluded.last_reviewed_at,status=excluded.status returning * into v_progress;
    update public.session_items set completed_at=now(),rating=p_rating,is_correct=v_correct where id=p_item_id;
    perform tna_private.reconcile_day(v_user,v_day);
  elsif not v_correct then
    -- Only an already learned word has an SRS schedule to penalize.
    update public.word_progress set ease_factor=greatest(1.3,ease_factor-0.54),repetitions=0,interval_days=1,
      next_review_date=least(next_review_date,v_day+1),last_practice_penalty_date=v_day,status='learning'
      where user_id=v_user and word_id=v_word_id and last_practice_penalty_date is distinct from v_day returning * into v_progress;
    if not found then select * into v_progress from public.word_progress where user_id=v_user and word_id=v_word_id; end if;
  end if;
  v_response:=jsonb_build_object('is_correct',v_correct,'progress',case when v_progress.word_id is null then null else to_jsonb(v_progress) end,
    'day_completed',exists(select 1 from public.completed_days where user_id=v_user and study_date=v_day));
  insert into public.practice_attempts(id,user_id,word_id,item_id,language,is_correct,mode,answer,response)
    values(p_attempt_id,v_user,v_word_id,p_item_id,v_word.language,v_correct,p_mode,p_answer,v_response);
  return v_response;
end $$;
create function public.submit_answer(p_item_id uuid,p_attempt_id uuid,p_rating text,p_answer text,p_mode text,p_writing_correct boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$ begin
  if p_item_id is null then raise exception 'Thiếu bài học.'; end if;
  return tna_private.record_answer(p_item_id,null,p_attempt_id,p_rating,p_answer,p_mode,p_writing_correct);
end $$;
create function public.practice_word(p_word_id uuid,p_attempt_id uuid,p_answer text,p_mode text,p_writing_correct boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$ begin
  if p_word_id is null then raise exception 'Thiếu từ vựng.'; end if;
  return tna_private.record_answer(null,p_word_id,p_attempt_id,null,p_answer,p_mode,p_writing_correct);
end $$;

create function public.save_settings(p_display_name text,p_reminder_time text,p_reminders_enabled boolean,p_languages jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_row jsonb; v_ids uuid[]; v_defer boolean; begin
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  if p_display_name is null or length(trim(p_display_name)) not between 1 and 80 then raise exception 'Tên hiển thị cần từ 1 đến 80 ký tự.'; end if;
  if p_reminder_time is null or p_reminder_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$' then raise exception 'Giờ nhắc không hợp lệ.'; end if;
  if p_reminders_enabled is null or p_languages is null or jsonb_typeof(p_languages)<>'array' or jsonb_array_length(p_languages)<>2 then raise exception 'Cần cấu hình hai ngôn ngữ.'; end if;
  if (select count(distinct value->>'language') from jsonb_array_elements(p_languages))<>2 then raise exception 'Ngôn ngữ bị trùng.'; end if;
  if not exists(select 1 from jsonb_array_elements(p_languages) x where (x->>'enabled')::boolean) then raise exception 'Hãy bật ít nhất một ngôn ngữ.'; end if;
  v_defer:=exists(select 1 from public.daily_plans where user_id=v_user and study_date=tna_private.study_day());
  update public.profiles set display_name=trim(p_display_name),reminder_time=p_reminder_time::time,reminders_enabled=p_reminders_enabled where id=v_user;
  for v_row in select value from jsonb_array_elements(p_languages) loop
    if (v_row->>'language') is null or (v_row->>'language') not in ('zh','en') or jsonb_typeof(v_row->'enabled')<>'boolean'
      or (v_row->>'daily_target') is null or (v_row->>'daily_target')::integer not between 1 and 50 then raise exception 'Thiết lập ngôn ngữ không hợp lệ.'; end if;
    select coalesce(array_agg(distinct value::uuid),'{}') into v_ids from jsonb_array_elements_text(coalesce(v_row->'deck_ids','[]'::jsonb));
    if exists(select 1 from unnest(v_ids) selected(selected_id) where not exists(select 1 from public.decks d where d.id=selected.selected_id and d.language=v_row->>'language' and not d.archived and tna_private.can_access_deck(d.id))) then raise exception 'Bộ từ đã chọn không khả dụng.'; end if;
    if v_defer then
      update public.language_settings set pending_enabled=(v_row->>'enabled')::boolean,pending_daily_target=(v_row->>'daily_target')::integer,pending_deck_ids=v_ids,
        effective_date=tna_private.study_day()+1,auto_pace=coalesce((v_row->>'auto_pace')::boolean,auto_pace) where user_id=v_user and language=v_row->>'language';
    else
      update public.language_settings set enabled=(v_row->>'enabled')::boolean,daily_target=(v_row->>'daily_target')::integer,deck_ids=v_ids,
        pending_enabled=null,pending_daily_target=null,pending_deck_ids=null,effective_date=null,auto_pace=coalesce((v_row->>'auto_pace')::boolean,auto_pace)
        where user_id=v_user and language=v_row->>'language';
    end if;
  end loop;
  return jsonb_build_object('effective_date',case when v_defer then tna_private.study_day()+1 else tna_private.study_day() end);
end $$;

create function public.create_invite() returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_invite public.couple_invites%rowtype; begin
  perform pg_advisory_xact_lock(hashtextextended('tna:couples',0));
  if exists(select 1 from public.couple_members where user_id=v_user) then raise exception 'Bạn đã thuộc một cặp.'; end if;
  select * into v_invite from public.couple_invites where owner_id=v_user and used_at is null and expires_at>now() order by created_at desc limit 1;
  if not found then
    insert into public.couple_invites(owner_id,code) values(v_user,upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))) returning * into v_invite;
  end if;
  return jsonb_build_object('invite_code',v_invite.code,'invite_expires_at',v_invite.expires_at);
end $$;
create function public.join_couple(p_code text) returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_invite public.couple_invites%rowtype; v_couple uuid; begin
  perform pg_advisory_xact_lock(hashtextextended('tna:couples',0));
  if exists(select 1 from public.couple_members where user_id=v_user) then raise exception 'Bạn đã thuộc một cặp.'; end if;
  select * into v_invite from public.couple_invites where code=upper(trim(p_code)) and used_at is null and expires_at>now() for update;
  if not found then raise exception 'Mã mời không đúng hoặc đã hết hạn.'; end if;
  if v_invite.owner_id=v_user then raise exception 'Bạn không thể ghép đôi với chính mình.'; end if;
  if exists(select 1 from public.couple_members where user_id=v_invite.owner_id) then raise exception 'Người này đã thuộc một cặp.'; end if;
  insert into public.couples default values returning id into v_couple;
  insert into public.couple_members(user_id,couple_id) values(v_user,v_couple),(v_invite.owner_id,v_couple);
  update public.couple_invites set used_at=now() where owner_id in (v_user,v_invite.owner_id) and used_at is null;
  insert into public.notifications(user_id,type,message) values(v_user,'system','Đã ghép đôi. Cùng nhau học mỗi ngày nhé!'),(v_invite.owner_id,'system','Đã ghép đôi. Cùng nhau học mỗi ngày nhé!');
  return jsonb_build_object('id',v_couple);
end $$;
create function public.leave_couple() returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_partner uuid; v_couple uuid; begin
  perform pg_advisory_xact_lock(hashtextextended('tna:couples',0));
  select couple_id into v_couple from public.couple_members where user_id=v_user;
  v_partner:=tna_private.partner_id(v_user);
  delete from public.couples where id=v_couple;
  update public.couple_invites set used_at=now() where owner_id=v_user and used_at is null;
  if v_partner is not null then insert into public.notifications(user_id,type,message) values(v_partner,'system','Cặp đôi đã kết thúc. Tiến độ học cá nhân của bạn vẫn được giữ.'); end if;
  return jsonb_build_object('success',true);
end $$;
create function public.encourage_partner() returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_partner uuid:=tna_private.partner_id(v_user); v_name text; v_rows integer; begin
  if v_partner is null then raise exception 'Hãy ghép đôi để gửi lời cổ vũ.'; end if;
  select display_name into v_name from public.profiles where id=v_user;
  insert into public.notifications(user_id,type,message,dedupe_key) values(v_partner,'heart',v_name||' gửi bạn một trái tim. Cùng cố gắng nhé!','heart:'||v_user||':'||tna_private.study_day()) on conflict do nothing;
  get diagnostics v_rows=row_count;
  return jsonb_build_object('sent',v_rows=1);
end $$;

create function public.save_deck(p_id uuid,p_language text,p_name text,p_description text) returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_deck public.decks%rowtype; begin
  if p_language is null or p_language not in ('zh','en') or p_name is null or length(trim(p_name)) not between 1 and 100 or length(coalesce(p_description,''))>1000 then raise exception 'Thông tin bộ từ không hợp lệ.'; end if;
  if p_id is null then insert into public.decks(owner_id,language,name,description) values(v_user,p_language,trim(p_name),coalesce(p_description,'')) returning * into v_deck;
  else
    select * into v_deck from public.decks where id=p_id and owner_id=v_user for update;
    if not found then raise exception 'Chỉ chủ sở hữu được sửa bộ từ.' using errcode='42501'; end if;
    if v_deck.language<>p_language then raise exception 'Không thể đổi ngôn ngữ của bộ từ.'; end if;
    update public.decks set name=trim(p_name),description=coalesce(p_description,'') where id=p_id returning * into v_deck;
  end if;
  return to_jsonb(v_deck);
end $$;
create function public.archive_deck(p_deck_id uuid) returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); begin
  update public.decks set archived=true where id=p_deck_id and owner_id=v_user;
  if not found then raise exception 'Chỉ chủ sở hữu được lưu trữ bộ từ.' using errcode='42501'; end if;
  return jsonb_build_object('success',true);
end $$;
create function public.save_word(p_id uuid,p_deck_id uuid,p_word jsonb) returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_deck public.decks%rowtype; v_word public.words%rowtype; v_answers text[]; begin
  select * into v_deck from public.decks where id=p_deck_id and owner_id=v_user and not archived for update;
  if not found then raise exception 'Chỉ chủ sở hữu được sửa bộ từ đang hoạt động.' using errcode='42501'; end if;
  if p_word is null or jsonb_typeof(p_word)<>'object' or nullif(trim(p_word->>'term'),'') is null or nullif(trim(p_word->>'meaning'),'') is null then raise exception 'Cần nhập từ và nghĩa tiếng Việt.'; end if;
  select coalesce(array_agg(trim(value)),'{}') into v_answers from jsonb_array_elements_text(coalesce(p_word->'accepted_answers','[]'::jsonb)) where trim(value)<>'';
  if exists(select 1 from unnest(v_answers) a where length(a)>100) then raise exception 'Đáp án thay thế quá dài.'; end if;
  if p_id is null then
    insert into public.words(deck_id,language,term,pronunciation,meaning,example_sentence,example_translation,accepted_answers,order_index)
      values(p_deck_id,v_deck.language,trim(p_word->>'term'),coalesce(p_word->>'pronunciation',''),trim(p_word->>'meaning'),coalesce(p_word->>'example_sentence',''),coalesce(p_word->>'example_translation',''),v_answers,
        coalesce((select max(order_index)+1 from public.words where deck_id=p_deck_id),0)) returning * into v_word;
  else
    update public.words set term=trim(p_word->>'term'),pronunciation=coalesce(p_word->>'pronunciation',''),meaning=trim(p_word->>'meaning'),
      example_sentence=coalesce(p_word->>'example_sentence',''),example_translation=coalesce(p_word->>'example_translation',''),accepted_answers=v_answers
      where id=p_id and deck_id=p_deck_id returning * into v_word;
    if not found then raise exception 'Không tìm thấy từ trong bộ từ này.'; end if;
  end if;
  return to_jsonb(v_word);
end $$;
create function public.archive_word(p_word_id uuid) returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); begin
  update public.words w set archived=true from public.decks d where w.id=p_word_id and d.id=w.deck_id and d.owner_id=v_user;
  if not found then raise exception 'Chỉ chủ sở hữu được lưu trữ từ.' using errcode='42501'; end if;
  return jsonb_build_object('success',true);
end $$;
create function public.import_words(p_deck_id uuid,p_words jsonb) returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.ensure_profile(); v_word jsonb; v_count integer:=0; begin
  if p_words is null or jsonb_typeof(p_words)<>'array' or jsonb_array_length(p_words) not between 1 and 1000 then raise exception 'Mỗi lần nhập cần từ 1 đến 1.000 từ.'; end if;
  if not exists(select 1 from public.decks where id=p_deck_id and owner_id=v_user and not archived) then raise exception 'Chỉ chủ sở hữu được nhập bộ từ.' using errcode='42501'; end if;
  for v_word in select value from jsonb_array_elements(p_words) loop
    perform public.save_word(null,p_deck_id,v_word); v_count:=v_count+1;
  end loop;
  return jsonb_build_object('imported',v_count);
end $$;
create function public.mark_notifications_read() returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user uuid:=tna_private.require_user(); begin
  update public.notifications set read_at=now() where user_id=v_user and read_at is null;
  return jsonb_build_object('success',true);
end $$;

create function tna_private.generate_reminders() returns integer language plpgsql security definer set search_path = ''
as $$ declare v_count integer; begin
  insert into public.notifications(user_id,type,message,dedupe_key)
    select p.id,'reminder','Đến giờ học rồi, '||p.display_name||'! '||case
      when tna_private.partner_id(p.id) is null then 'Một chút tiến bộ mỗi ngày nhé.'
      when exists(select 1 from public.completed_days cd where cd.user_id=tna_private.partner_id(p.id) and cd.study_date=tna_private.study_day()) then 'Người thương đã hoàn thành hôm nay và đang chờ bạn.'
      else 'Người thương cũng đang trên hành trình hôm nay. Cùng học nhé!' end,
      'reminder:'||tna_private.study_day()
    from public.profiles p where p.reminders_enabled and p.reminder_time<=(now() at time zone 'Asia/Ho_Chi_Minh')::time
      and not exists(select 1 from public.completed_days cd where cd.user_id=p.id and cd.study_date=tna_private.study_day())
      and exists(select 1 from public.language_settings ls where ls.user_id=p.id and case when ls.effective_date<=tna_private.study_day() then coalesce(ls.pending_enabled,ls.enabled) else ls.enabled end)
    on conflict(user_id,dedupe_key) do nothing;
  get diagnostics v_count=row_count; return v_count;
end $$;

-- Clients can read only through restrictive policies; writes always use the RPCs.
do $$ declare t text; begin
  foreach t in array array['profiles','language_settings','couples','couple_members','couple_invites','decks','words','word_progress','daily_plans','study_sessions','session_items','practice_attempts','completed_days','notifications'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated',t);
    execute format('grant select on table public.%I to authenticated',t);
  end loop;
end $$;
create policy profiles_own on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy language_settings_own on public.language_settings for select to authenticated using(user_id=(select auth.uid()));
create policy couples_member on public.couples for select to authenticated using(exists(select 1 from public.couple_members where couple_id=couples.id and user_id=(select auth.uid())));
create policy couple_members_own on public.couple_members for select to authenticated using(user_id=(select auth.uid()));
create policy couple_invites_own on public.couple_invites for select to authenticated using(owner_id=(select auth.uid()));
create policy decks_shared on public.decks for select to authenticated using(tna_private.can_access_deck(id));
create policy words_shared on public.words for select to authenticated using(tna_private.can_access_deck(deck_id));
create policy word_progress_own on public.word_progress for select to authenticated using(user_id=(select auth.uid()));
create policy daily_plans_own on public.daily_plans for select to authenticated using(user_id=(select auth.uid()));
create policy study_sessions_own on public.study_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy session_items_own on public.session_items for select to authenticated using(exists(select 1 from public.study_sessions where id=session_items.session_id and user_id=(select auth.uid())));
create policy practice_attempts_own on public.practice_attempts for select to authenticated using(user_id=(select auth.uid()));
create policy completed_days_own on public.completed_days for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_own on public.notifications for select to authenticated using(user_id=(select auth.uid()));
revoke all on all functions in schema tna_private from public,anon,authenticated;
grant execute on function tna_private.can_access_deck(uuid) to authenticated;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('get_app_data','start_daily_sessions','submit_answer','practice_word','save_settings','create_invite','join_couple','leave_couple','encourage_partner','save_deck','archive_deck','save_word','archive_word','import_words','mark_notifications_read') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;
commit;
