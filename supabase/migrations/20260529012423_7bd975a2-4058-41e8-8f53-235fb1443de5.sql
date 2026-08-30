
CREATE POLICY "pr_admin_all" ON public.payment_requests
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.paypal_orders TO authenticated;

CREATE POLICY "paypal_orders_self_select" ON public.paypal_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR app_private.has_role(auth.uid(), 'admin'::app_role));
