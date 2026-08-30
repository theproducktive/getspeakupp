
-- Recreate rankings as a SECURITY INVOKER view (default in PG15+, but enforce explicitly)
drop view if exists public.rankings;
create view public.rankings with (security_invoker = true) as
  select
    s.user_id,
    coalesce(p.display_name, 'Anonymous') as display_name,
    s.language,
    sum(coalesce(s.score, 0))::int as total_score,
    count(*)::int as sessions_count
  from public.sessions s
  left join public.profiles p on p.id = s.user_id
  where s.score is not null
  group by s.user_id, p.display_name, s.language;

grant select on public.rankings to anon, authenticated;

-- Lock down EXECUTE on security-definer functions: only auth'd users / service role
revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.has_active_subscription(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

grant execute on function public.has_role(uuid, app_role) to authenticated;
grant execute on function public.has_active_subscription(uuid) to authenticated;
-- handle_new_user and touch_updated_at are only called by triggers; no grants needed.
