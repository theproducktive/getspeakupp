-- Explicit service-role-only RLS policy for paypal_orders so the linter no
-- longer flags "RLS enabled, no policy". Users must never read or write
-- order/user bindings directly; only server functions using the admin client
-- (service_role) may access this table.
GRANT ALL ON public.paypal_orders TO service_role;

CREATE POLICY "paypal_orders_service_role_all"
ON public.paypal_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);