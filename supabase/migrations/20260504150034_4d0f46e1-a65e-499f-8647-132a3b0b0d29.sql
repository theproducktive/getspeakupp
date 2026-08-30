
-- ENUMS
create type public.app_role as enum ('admin', 'user');
create type public.lang_code as enum ('en', 'fr', 'ar');
create type public.subscription_status as enum ('active', 'pending', 'rejected', 'expired');
create type public.payment_status as enum ('pending', 'approved', 'rejected');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  native_lang lang_code default 'en',
  ui_lang lang_code default 'en',
  theme text default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles for insert with check (auth.uid() = id);
-- Public read of display_name only via rankings; profile rows themselves are private.

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles_self_select" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_all" on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

-- LEVELS
create table public.levels (
  id int primary key,
  code text not null unique,
  name_en text not null,
  name_fr text not null,
  name_ar text not null,
  sort_order int not null
);
alter table public.levels enable row level security;
create policy "levels_public_read" on public.levels for select using (true);

insert into public.levels (id, code, name_en, name_fr, name_ar, sort_order) values
  (1, 'starter', 'Starter', 'Débutant', 'مبتدئ', 1),
  (2, 'explorer', 'Explorer', 'Explorateur', 'مستكشف', 2),
  (3, 'builder', 'Builder', 'Constructeur', 'باني', 3),
  (4, 'connector', 'Connector', 'Connecteur', 'مُتواصل', 4),
  (5, 'storyteller', 'Storyteller', 'Conteur', 'راوي', 5),
  (6, 'debater', 'Debater', 'Débatteur', 'مُحاور', 6),
  (7, 'analyst', 'Analyst', 'Analyste', 'مُحلل', 7),
  (8, 'strategist', 'Strategist', 'Stratège', 'استراتيجي', 8),
  (9, 'orator', 'Orator', 'Orateur', 'خطيب', 9),
  (10, 'master', 'Master', 'Maître', 'مُتقن', 10);

-- TOPICS
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  language lang_code not null,
  level_id int not null references public.levels(id),
  prompt text not null,
  category text,
  created_at timestamptz not null default now()
);
alter table public.topics enable row level security;
create policy "topics_public_read" on public.topics for select using (true);
create policy "topics_admin_write" on public.topics for all using (public.has_role(auth.uid(), 'admin'));
create index idx_topics_lang_level on public.topics(language, level_id);

-- Seed a small starter set per language/level (3 topics × 3 langs × 10 levels = 90)
insert into public.topics (language, level_id, prompt, category) values
  ('en', 1, 'Introduce yourself: name, age, where you live.', 'self'),
  ('en', 1, 'Describe your favorite food.', 'daily'),
  ('en', 1, 'Talk about your morning routine.', 'daily'),
  ('en', 2, 'Describe your hometown.', 'places'),
  ('en', 2, 'Talk about a hobby you enjoy.', 'hobbies'),
  ('en', 3, 'Describe a meaningful gift you once received.', 'memories'),
  ('en', 4, 'Compare living in a city versus the countryside.', 'opinion'),
  ('en', 5, 'Tell a short story about an unexpected event.', 'narrative'),
  ('en', 6, 'Should social media be regulated? Defend your view.', 'debate'),
  ('en', 7, 'Analyze the impact of remote work on cities.', 'analysis'),
  ('en', 8, 'Propose a strategy to reduce plastic waste in your city.', 'strategy'),
  ('en', 9, 'Deliver a 1-minute persuasive speech on lifelong learning.', 'oratory'),
  ('en', 10, 'Argue both sides of AI replacing creative jobs, then conclude.', 'master'),

  ('fr', 1, 'Présente-toi : nom, âge, lieu de vie.', 'self'),
  ('fr', 1, 'Décris ton plat préféré.', 'daily'),
  ('fr', 2, 'Parle de ta ville natale.', 'places'),
  ('fr', 3, 'Décris un cadeau qui t''a marqué.', 'memories'),
  ('fr', 4, 'Compare la vie en ville et à la campagne.', 'opinion'),
  ('fr', 5, 'Raconte une histoire courte sur un événement inattendu.', 'narrative'),
  ('fr', 6, 'Les réseaux sociaux doivent-ils être régulés ? Défends ton avis.', 'debate'),
  ('fr', 7, 'Analyse l''impact du télétravail sur les villes.', 'analysis'),
  ('fr', 8, 'Propose une stratégie pour réduire les déchets plastiques.', 'strategy'),
  ('fr', 9, 'Donne un discours d''une minute sur l''apprentissage tout au long de la vie.', 'oratory'),
  ('fr', 10, 'Argumente pour et contre l''IA remplaçant les métiers créatifs, puis conclus.', 'master'),

  ('ar', 1, 'عرّف عن نفسك: الاسم، العمر، مكان السكن.', 'self'),
  ('ar', 1, 'صف طعامك المفضل.', 'daily'),
  ('ar', 2, 'تحدث عن مدينتك.', 'places'),
  ('ar', 3, 'صف هدية مميزة تلقيتها.', 'memories'),
  ('ar', 4, 'قارن بين الحياة في المدينة والقرية.', 'opinion'),
  ('ar', 5, 'احكِ قصة قصيرة عن حدث غير متوقع.', 'narrative'),
  ('ar', 6, 'هل يجب تنظيم وسائل التواصل الاجتماعي؟ دافع عن رأيك.', 'debate'),
  ('ar', 7, 'حلل أثر العمل عن بُعد على المدن.', 'analysis'),
  ('ar', 8, 'اقترح استراتيجية لتقليل النفايات البلاستيكية.', 'strategy'),
  ('ar', 9, 'ألقِ خطاباً قصيراً عن أهمية التعلم مدى الحياة.', 'oratory'),
  ('ar', 10, 'ناقش مع وضد استبدال الذكاء الاصطناعي للمهن الإبداعية.', 'master');

-- SESSIONS
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  language lang_code not null,
  level_id int not null references public.levels(id),
  topic_id uuid references public.topics(id),
  topic_prompt text not null,
  audio_path text,
  transcript text,
  duration_sec int,
  score int,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.sessions enable row level security;
create policy "sessions_self_all" on public.sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_sessions_user_created on public.sessions(user_id, created_at desc);
create index idx_sessions_lang_score on public.sessions(language, score desc);

-- FEEDBACK
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  grammar jsonb default '[]'::jsonb,
  vocabulary jsonb default '[]'::jsonb,
  fluency_notes text,
  pronunciation_notes text,
  overall_summary text,
  raw jsonb,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create policy "feedback_self_select" on public.feedback for select using (auth.uid() = user_id);
create policy "feedback_self_insert" on public.feedback for insert with check (auth.uid() = user_id);

-- SUBSCRIPTIONS
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'lifetime',
  status subscription_status not null default 'pending',
  amount_mad int default 99,
  paid_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "subs_self_select" on public.subscriptions for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "subs_admin_all" on public.subscriptions for all using (public.has_role(auth.uid(), 'admin'));

create or replace function public.has_active_subscription(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.subscriptions where user_id = _user_id and status = 'active')
$$;

-- PAYMENT REQUESTS
create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proof_url text,
  note text,
  status payment_status not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.payment_requests enable row level security;
create policy "pr_self_select" on public.payment_requests for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "pr_self_insert" on public.payment_requests for insert with check (auth.uid() = user_id);
create policy "pr_admin_update" on public.payment_requests for update using (public.has_role(auth.uid(), 'admin'));

-- RANKINGS VIEW (public, aggregated)
create or replace view public.rankings as
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

-- AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger for profiles
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
