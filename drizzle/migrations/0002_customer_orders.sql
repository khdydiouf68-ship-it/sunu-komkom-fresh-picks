ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
GRANT SELECT ON public.orders TO authenticated;
CREATE POLICY "Customers read own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());