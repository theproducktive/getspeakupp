-- ADMIN AUDIT LOG
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create policy "audit_admin_select" on public.admin_audit_log
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "audit_admin_insert" on public.admin_audit_log
  for insert with check (public.has_role(auth.uid(), 'admin') and admin_id = auth.uid());

create index idx_audit_created on public.admin_audit_log(created_at desc);
create index idx_audit_admin on public.admin_audit_log(admin_id);