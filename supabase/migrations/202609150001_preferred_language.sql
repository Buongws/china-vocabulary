-- Preferred learning language and first-login onboarding.
alter table public.profiles add column if not exists preferred_language text check (preferred_language in ('zh','en'));

create or replace function public.set_preferred_language(p_language text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := tna_private.ensure_profile();
begin
  if p_language not in ('zh','en') then raise exception 'Ngôn ngữ không hợp lệ.'; end if;
  update public.profiles set preferred_language=p_language where id=v_user;
  update public.language_settings set enabled=(language=p_language) where user_id=v_user;
  return public.get_app_data();
end $$;
grant execute on function public.set_preferred_language(text) to authenticated;
