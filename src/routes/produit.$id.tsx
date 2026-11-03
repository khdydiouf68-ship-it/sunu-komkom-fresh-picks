import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Minus, Plus, ShoppingBasket, Truck } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { catalogOptions, useCatalog } from "@/lib/catalog";
import { mergeCatalog } from "@/lib/catalog-shared";
import { useCart } from "@/lib/cart";
import { formatFCFA, type Category } from "@/lib/products";

const categories: Record<Category, { label: string; to: "/poissons" | "/legumes" | "/epices" }> = {
  poisson: { label: "Poissons frais", to: "/poissons" },
  legume: { label: "Légumes frais", to: "/legumes" },
  epice: { label: "Épices", to: "/epices" },
};

export const Route = createFileRoute("/produit/$id")({
  loader: async ({ context, params }) => {
    const rows = await context.queryClient.ensureQueryData(catalogOptions);
    const catalog = mergeCatalog(rows.map(({ displayImage, ...p }) => ({ ...p, image: displayImage })));
    const product = catalog.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { name: product.name, description: product.description };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — Sunu KomKom` : "Produit — Sunu KomKom";
    const description = loaderData?.description || "Produit frais livré à Dakar par Sunu KomKom.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <section className="mx-auto max-w-lg px-5 py-24 text-center">
      <h1 className="text-3xl">Produit introuvable</h1>
      <p className="mt-3 text-muted-foreground">Ce produit n'existe pas ou n'est plus disponible.</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Retour à la boutique
      </Link>
    </section>
  ),
});

function ProductPage() {
  const { id } = Route.useParams();
  const catalog = useCatalog();
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const product = catalog.find((p) => p.id === id);
  if (!product) return null;

  const category = categories[product.category];
  const unitLabel = product.unit === "pièce" ? "pièces" : product.unit;
  const outOfStock = product.stock <= 0;
  const maxQty = Math.max(1, product.stock);
  const similar = catalog.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Accueil
        </Link>
        <ChevronRight className="size-4" />
        <Link to={category.to} className="hover:text-foreground">
          {category.label}
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-sand">
          <img
            src={product.image}
            alt={product.name}
            width={800}
            height={800}
            className="size-full object-cover"
          />
        </div>

        <div className="flex flex-col">
          <p className="text-sm font-medium text-leaf">{category.label}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-foreground">{product.name}</h1>

          <p className="mt-4 text-3xl font-semibold text-leaf">
            {formatFCFA(product.price)}
            <span className="text-base font-normal text-muted-foreground"> / {product.unit}</span>
          </p>

          <p className={`mt-3 text-sm ${outOfStock ? "text-destructive" : "text-muted-foreground"}`}>
            {outOfStock ? "Rupture de stock" : `En stock : ${product.stock} ${unitLabel}`}
          </p>

          {product.description && (
            <p className="mt-6 leading-relaxed text-foreground/90">{product.description}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-border">
              <button
                type="button"
                aria-label="Diminuer la quantité"
                className="grid size-11 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                disabled={outOfStock || qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" />
              </button>
              <span className="w-12 text-center font-medium" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                aria-label="Augmenter la quantité"
                className="grid size-11 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                disabled={outOfStock || qty >= maxQty}
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              >
                <Plus className="size-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={outOfStock}
              onClick={() => {
                add(product.id, qty);
                toast.success(`${product.name} ajouté au panier (× ${qty})`);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              <ShoppingBasket className="size-4" />
              Ajouter au panier — {formatFCFA(product.price * qty)}
            </button>
          </div>

          <Link to="/panier" className="mt-4 text-sm font-medium text-primary hover:underline underline-offset-2">
            Voir mon panier
          </Link>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <Truck className="mt-0.5 size-5 shrink-0 text-leaf" />
            <p>Livraison partout à Dakar. Paiement par Wave ou à la livraison.</p>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl">Vous aimerez aussi</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
