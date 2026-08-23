CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  address text NOT NULL,
  quartier text,
  note text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal integer NOT NULL,
  delivery_fee integer NOT NULL DEFAULT 0,
  total integer NOT NULL,
  payment_method text NOT NULL DEFAULT 'wave',
  status text NOT NULL DEFAULT 'pending',
  wave_session_id text,
  wave_launch_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_wave_session_id_idx ON public.orders (wave_session_id);
CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);

GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to orders"
  ON public.orders FOR SELECT TO authenticated, anon USING (false);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();