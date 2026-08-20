import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatFCFA } from "@/lib/products";

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Mon panier — Sunu KomKom" },
      { name: "description", content: "Vérifiez votre panier de poissons et légumes frais avant paiement." },
      { property: "og:title", content: "Mon panier — Sunu KomKom" },
      { property: "og:description", content: "Récapitulatif de votre commande de produits frais." },
    ],
  }),
  component: PanierPage,
});

const LIVRAISON = 1500;

function PanierPage() {
  const { items, total, setQty, remove, clear } = useCart();

  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="text-4xl">Mon panier</h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">Votre panier est vide pour le moment.</p>
          <Link
            to="/poissons"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Parcourir la boutique
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-4">
            {items.map(({ product, qty, total: ligne }) => (
              <li
                key={product.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  width={80}
                  height={80}
                  loading="lazy"
                  className="size-20 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFCFA(product.price)} / {product.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Diminuer"
                    onClick={() => setQty(product.id, qty - 1)}
                    className="grid size-8 place-items-center rounded-full border border-border"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{qty}</span>
                  <button
                    aria-label="Augmenter"
                    onClick={() => setQty(product.id, qty + 1)}
                    className="grid size-8 place-items-center rounded-full border border-border"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <p className="w-28 text-right font-semibold">{formatFCFA(ligne)}</p>
                <button
                  aria-label={`Retirer ${product.name}`}
                  onClick={() => remove(product.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
            <li>
              <button onClick={clear} className="text-sm text-muted-foreground underline">
                Vider le panier
              </button>
            </li>
          </ul>

          <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-xl">Récapitulatif</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sous-total</dt>
                <dd>{formatFCFA(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Livraison Dakar</dt>
                <dd>{formatFCFA(LIVRAISON)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="text-leaf">{formatFCFA(total + LIVRAISON)}</dd>
              </div>
            </dl>
            <Link
              to="/paiement"
              className="mt-6 block rounded-xl bg-accent px-4 py-3 text-center text-sm font-medium text-accent-foreground"
            >
              Passer au paiement
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
