import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos — Sunu KomKom" },
      {
        name: "description",
        content: "Sunu KomKom relie les pêcheurs et maraîchers sénégalais aux familles de Dakar.",
      },
      { property: "og:title", content: "À propos de Sunu KomKom" },
      { property: "og:description", content: "Notre mission : rendre le marché frais accessible en ligne." },
    ],
  }),
  component: AProposPage,
});

function AProposPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-4xl">À propos</h1>
      <div className="mt-6 space-y-5 text-muted-foreground">
        <p>
          Sunu KomKom est né d'une idée simple : permettre à chaque famille sénégalaise de commander en quelques
          clics les mêmes produits qu'au marché, avec la même fraîcheur et des prix justes.
        </p>
        <p>
          Chaque matin, notre équipe se rend au débarcadère pour choisir la pêche du jour, puis chez nos
          partenaires maraîchers des Niayes pour les légumes. Les commandes reçues avant midi sont livrées dans
          la journée à Dakar et sa banlieue.
        </p>
        <p>
          Nous travaillons directement avec les producteurs, sans intermédiaire, pour garantir une meilleure
          rémunération aux pêcheurs et agriculteurs locaux.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { k: "300+", v: "Familles livrées chaque mois" },
          { k: "12", v: "Producteurs partenaires" },
          { k: "3 h", v: "Délai moyen de livraison" },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-border bg-card p-5 text-center shadow-card">
            <p className="font-display text-3xl text-leaf">{s.k}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.v}</p>
          </div>
        ))}
      </div>
      <Link
        to="/poissons"
        className="mt-10 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
      >
        Découvrir nos produits
      </Link>
    </section>
  );
}
