-- Paiement en ligne PayTech : token de la demande de paiement et moyen utilisé par le client.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paytech_token text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_with text;
CREATE INDEX IF NOT EXISTS orders_paytech_token_idx ON public.orders (paytech_token);
