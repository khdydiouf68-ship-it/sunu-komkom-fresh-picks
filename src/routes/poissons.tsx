import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/products";

export const Route = createFileRoute("/poissons")({
  head: () => ({
    meta: [
      { title: "Poissons frais — Sunu KomKom" },
      {
        name: "description",
        content: "Thiof, tilapia, dorade, sardine et maquereau frais du jour, livrés à Dakar.",
      },
      { property: "og:title", content: "Poissons frais — Sunu KomKom" },
      { property: "og:description", content: "Pêche du jour livrée à Dakar : thiof, dorade, tilapia et plus." },
    ],
  }),
  component: PoissonsPage,
});

function PoissonsPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-4xl">Poissons frais</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Sélectionnés chaque matin au débarcadère, conservés sous glace jusqu'à votre porte.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {getProducts("poisson").map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
