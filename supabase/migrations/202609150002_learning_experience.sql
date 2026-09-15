-- Apply after 202609150001_preferred_language.sql. Safe to rerun.
begin;
alter table public.session_items add column if not exists viewed_at timestamptz;

create or replace function public.mark_item_viewed(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := tna_private.ensure_profile();
begin
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  update public.session_items i set viewed_at=coalesce(i.viewed_at,now())
    from public.study_sessions s where i.id=p_item_id and s.id=i.session_id and s.user_id=v_user;
  if not found then raise exception 'Không tìm thấy bài học của bạn.' using errcode='42501'; end if;
  return jsonb_build_object('viewed',true);
end $$;

create or replace function public.set_preferred_language(p_language text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := tna_private.ensure_profile(); v_first boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  if p_language is null or p_language not in ('zh','en') then raise exception 'Ngôn ngữ không hợp lệ.'; end if;
  select preferred_language is null into v_first from public.profiles where id=v_user;
  update public.profiles set preferred_language=p_language where id=v_user;
  if v_first then
    if exists(select 1 from public.daily_plans where user_id=v_user and study_date=tna_private.study_day()) then
      update public.language_settings set pending_enabled=(language=p_language),effective_date=tna_private.study_day()+1 where user_id=v_user;
    else
      update public.language_settings set enabled=(language=p_language) where user_id=v_user;
    end if;
  end if;
  return public.get_app_data();
end $$;

-- Save profile priority and schedule settings atomically. Existing sessions stay frozen.
create or replace function public.save_learning_settings(p_display_name text,p_reminder_time text,p_reminders_enabled boolean,p_languages jsonb,p_preferred_language text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := tna_private.ensure_profile(); v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  if p_preferred_language is null or p_preferred_language not in ('zh','en') then raise exception 'Ngôn ngữ ưu tiên không hợp lệ.'; end if;
  if not exists(select 1 from jsonb_array_elements(p_languages) x where x->>'language'=p_preferred_language and (x->>'enabled')::boolean) then
    raise exception 'Hãy bật lộ trình bạn chọn làm ngôn ngữ ưu tiên.';
  end if;
  v_result:=public.save_settings(p_display_name,p_reminder_time,p_reminders_enabled,p_languages);
  update public.profiles set preferred_language=p_preferred_language where id=v_user;
  return v_result;
end $$;
revoke all on function public.mark_item_viewed(uuid),public.set_preferred_language(text),public.save_learning_settings(text,text,boolean,jsonb,text) from public,anon;
grant execute on function public.mark_item_viewed(uuid),public.set_preferred_language(text),public.save_learning_settings(text,text,boolean,jsonb,text) to authenticated;
commit;
