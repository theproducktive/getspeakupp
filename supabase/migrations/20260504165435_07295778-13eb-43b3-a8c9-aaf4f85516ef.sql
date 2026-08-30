ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS paypal_capture_id text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS amount_minor integer;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_paypal_order_id_uniq
  ON public.subscriptions (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_user_session_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.sessions WHERE user_id = _user_id;
$$;