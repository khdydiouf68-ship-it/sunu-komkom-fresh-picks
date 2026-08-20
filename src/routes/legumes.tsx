import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/products";

export const Route = createFileRoute("/legumes")({
  head: () => ({
    meta: [
      { title: "Légumes frais — Sunu KomKom" },
      {
        name: "description",
        content: "Tomates, oignons, carottes, choux, poivrons et aubergines récoltés du jour au Sénégal.",
      },
      { property: "og:title", content: "Légumes frais — Sunu KomKom" },
      { property: "og:description", content: "Légumes maraîchers locaux livrés frais à Dakar." },
    ],
  }),
  component: LegumesPage,
});

function LegumesPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-4xl">Légumes frais</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Récoltés dans les fermes des Niayes et livrés le jour même, sans stockage prolongé.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {getProducts("legume").map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
