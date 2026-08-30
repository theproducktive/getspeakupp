
-- Add user preferences for onboarding (target language, level, weekly goal, interests)
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY,
  target_language text NOT NULL DEFAULT 'en',
  level_code text NOT NULL DEFAULT 'A2',
  weekly_goal smallint NOT NULL DEFAULT 5,
  interests text[] NOT NULL DEFAULT '{}',
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_prefs_self_select" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_prefs_self_insert" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_prefs_self_update" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER user_preferences_touch
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
