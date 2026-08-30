
-- 1) Revoke admin from any non-allowed account
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE lower(email) = 'saadidrissi134@gmail.com'
  );

-- 2) Trigger function: only the allowed email may hold the 'admin' role
CREATE OR REPLACE FUNCTION public.enforce_sole_admin_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.user_id;
    IF v_email IS DISTINCT FROM 'saadidrissi134@gmail.com' THEN
      RAISE EXCEPTION 'Only saadidrissi134@gmail.com may hold the admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sole_admin_email ON public.user_roles;
CREATE TRIGGER trg_enforce_sole_admin_email
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_sole_admin_email();

-- 3) Auto-grant admin to the allowed email if account exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'saadidrissi134@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 4) Extend handle_new_user to auto-promote the allowed email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if lower(new.email) = 'saadidrissi134@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
      on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;
