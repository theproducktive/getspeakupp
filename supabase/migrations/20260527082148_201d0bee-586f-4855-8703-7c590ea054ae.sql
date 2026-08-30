CREATE OR REPLACE FUNCTION public.force_payment_request_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending'::payment_status THEN
    RAISE EXCEPTION 'Payment requests must start as pending';
  END IF;

  NEW.status := 'pending'::payment_status;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.force_payment_request_pending() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.force_payment_request_pending() TO service_role;