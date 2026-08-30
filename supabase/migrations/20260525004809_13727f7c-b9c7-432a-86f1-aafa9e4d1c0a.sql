
-- Ensure default
ALTER TABLE public.payment_requests ALTER COLUMN status SET DEFAULT 'pending'::payment_status;

-- Trigger to force status='pending' on any INSERT (clients cannot self-approve)
CREATE OR REPLACE FUNCTION public.force_payment_request_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status := 'pending'::payment_status;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.force_payment_request_pending() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_force_payment_request_pending ON public.payment_requests;
CREATE TRIGGER trg_force_payment_request_pending
BEFORE INSERT ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.force_payment_request_pending();

-- Tighten INSERT policy: user can only insert their own row AND must submit status='pending'
DROP POLICY IF EXISTS pr_self_insert ON public.payment_requests;
CREATE POLICY pr_self_insert
ON public.payment_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'::payment_status
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);
