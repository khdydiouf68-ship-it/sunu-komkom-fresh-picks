# Sunu KomKom Fresh

Boutique en ligne de poissons et légumes frais (Dakar) : catalogue, panier, paiement Wave / Orange Money, espace client et administration.

Stack : TanStack Start (React 19, Vite), Tailwind CSS, Supabase (base de données + authentification).

## Démarrer en local

Prérequis : [Bun](https://bun.sh) (ou Node.js 22+ et npm).

```sh
bun install
bun run dev        # http://localhost:8080
```

## Variables d'environnement

Le fichier `.env` contient les clés publiques Supabase :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
```

Les secrets vont dans `.env.local` (ignoré par git, jamais commité) :

```
SUPABASE_SERVICE_ROLE_KEY=...   # requis pour les commandes et le paiement
PAYTECH_API_KEY=...             # paiement en ligne PayTech
PAYTECH_API_SECRET=...
PAYTECH_ENV=test                # "prod" une fois le compte PayTech activé
SITE_URL=https://votre-domaine  # requis en production (URL de notification IPN)
DATABASE_URL=...                # requis seulement pour drizzle-kit (migrations)
```

La notification de paiement PayTech arrive sur `https://<SITE_URL>/api/public/paytech-ipn`.
En local, elle ne peut pas joindre `localhost` : le statut est alors vérifié directement auprès de PayTech depuis la page de suivi de commande.

## Base de données

Les migrations SQL sont dans `drizzle/migrations/`. Pour les appliquer, collez-les dans l'éditeur SQL de Supabase, ou lancez `bunx drizzle-kit migrate` avec `DATABASE_URL` renseigné.

## Production

```sh
bun run build
node .output/server/index.mjs
```
