ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'canceled';

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_paypal_order_id_key
  ON public.subscriptions (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;