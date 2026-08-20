import { createFileRoute, Link } from "@tanstack/react-router";
import { Fish, Leaf, Truck, ShieldCheck } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sunu KomKom — Poissons et légumes frais livrés à Dakar" },
      {
        name: "description",
        content:
          "Achetez en ligne du poisson frais et des légumes du jour à Dakar. Livraison rapide, paiement Wave et Orange Money.",
      },
      { property: "og:title", content: "Sunu KomKom — La fraîcheur directement chez vous" },
      {
        property: "og:description",
        content: "Poissons et légumes frais du Sénégal, commandés en ligne et payés par Wave ou Orange Money.",
      },
    ],
  }),
  component: Index,
});

const atouts = [
  { icon: Fish, title: "Pêche du jour", text: "Sélection quotidienne au port de Dakar." },
  { icon: Leaf, title: "Maraîchage local", text: "Légumes récoltés dans les Niayes." },
  { icon: Truck, title: "Livraison rapide", text: "Chez vous en moins de 3 heures." },
  { icon: ShieldCheck, title: "Paiement sûr", text: "Wave, Orange Money, à la livraison." },
];

function Index() {
  const vedettes = products.filter((p) =>
    ["thiof", "dorade", "tomate", "oignon", "carotte", "maquereau", "aubergine", "chou"].includes(p.id),
  );

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-block rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
            Marché frais en ligne · Dakar
          </span>
          <h1 className="mt-6 text-4xl leading-tight md:text-6xl">
            La fraîcheur <span className="text-leaf">directement</span> chez vous
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Poissons pêchés le matin et légumes récoltés du jour, livrés à votre porte et payés simplement avec
            Wave ou Orange Money.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/poissons"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Commander du poisson
            </Link>
            <Link
              to="/legumes"
              className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Voir les légumes
            </Link>
          </div>
        </div>
        <img
          src={hero}
          alt="Étal de poissons et légumes frais sur un marché sénégalais"
          width={1408}
          height={1008}
          className="w-full rounded-3xl object-cover shadow-card"
        />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4">
        {atouts.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <Icon className="size-6 text-leaf" />
            <p className="mt-3 font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl">L'arrivage du jour</h2>
            <p className="mt-1 text-muted-foreground">Nos produits les plus demandés cette semaine.</p>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {vedettes.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}
