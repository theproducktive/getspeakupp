
CREATE TABLE public.paypal_orders (
  order_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  currency text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.paypal_orders TO service_role;

ALTER TABLE public.paypal_orders ENABLE ROW LEVEL SECURITY;

-- No user-facing policies: service-role only (managed exclusively from server functions).

CREATE INDEX idx_paypal_orders_user ON public.paypal_orders(user_id);
