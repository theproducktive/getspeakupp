ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_proof_url_https_only
  CHECK (proof_url IS NULL OR proof_url ~ '^https://');