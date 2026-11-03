-- Chaque inscrit reçoit une ligne dans user_roles (rôle 'user' = client).
-- Pour faire d'un client un administrateur, passez son rôle de 'user' à 'admin'.

-- 1. E-mail visible dans user_roles pour savoir qui est qui
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email text;

-- 2. Un seul rôle par personne (si quelqu'un a déjà 'admin' et 'user', on garde 'admin')
DELETE FROM public.user_roles r
WHERE r.role = 'user'
  AND EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = r.user_id AND a.role = 'admin');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_key') THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Rôle 'user' attribué automatiquement à chaque nouvelle inscription
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, email)
  VALUES (NEW.id, 'user', NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 4. Inscrits déjà existants : rôle 'user' + e-mail
INSERT INTO public.user_roles (user_id, role, email)
SELECT id, 'user', email FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
UPDATE public.user_roles r SET email = u.email
FROM auth.users u
WHERE u.id = r.user_id AND r.email IS NULL;
