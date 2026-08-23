import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { getOrderStatus } from "@/lib/checkout.functions";
import { formatFCFA } from "@/lib/products";

export const Route = createFileRoute("/commande/$reference")({
  head: () => ({
    meta: [
      { title: "Suivi de commande — Sunu KomKom" },
      { name: "description", content: "Suivez la confirmation de paiement de votre commande de produits frais." },
      { property: "og:title", content: "Suivi de commande — Sunu KomKom" },
      { property: "og:description", content: "Confirmation de paiement Wave pour votre commande Sunu KomKom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({ echec: search["echec"] === "1" || search["echec"] === 1 }),
  component: SuiviCommande,
  errorComponent: () => (
    <section className="mx-auto max-w-lg px-5 py-24 text-center">
      <h1 className="text-3xl">Commande introuvable</h1>
      <p className="mt-3 text-muted-foreground">Impossible de charger cette commande pour le moment.</p>
    </section>
  ),
});

function SuiviCommande() {
  const { reference } = Route.useParams();
  const { echec } = useSearch({ from: "/commande/$reference" });
  const fetchStatus = useServerFn(getOrderStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["order", reference],
    queryFn: () => fetchStatus({ data: { reference } }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" ? 4000 : false;
    },
  });

  const status = data?.status ?? (isLoading ? "loading" : "unknown");
  const items = (data?.items ?? []) as Array<{ name: string; qty: number; total: number }>;

  return (
    <section className="mx-auto max-w-lg px-5 py-20 text-center">
      {status === "paid" || status === "confirmed" ? (
        <>
          <CheckCircle2 className="mx-auto size-14 text-leaf" />
          <h1 className="mt-6 text-3xl">
            {status === "paid" ? "Paiement confirmé" : "Commande enregistrée"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {status === "paid"
              ? "Merci ! Votre paiement Wave a bien été reçu. Livraison prévue dans les 3 heures à Dakar."
              : "Vous réglerez à la livraison. Notre livreur vous appelle avant de passer."}
          </p>
        </>
      ) : status === "failed" || echec ? (
        <>
          <XCircle className="mx-auto size-14 text-destructive" />
          <h1 className="mt-6 text-3xl">Paiement non abouti</h1>
          <p className="mt-3 text-muted-foreground">
            Le paiement Wave n'a pas été finalisé. Vous pouvez réessayer depuis votre panier.
          </p>
        </>
      ) : (
        <>
          <Clock className="mx-auto size-14 animate-pulse text-muted-foreground" />
          <h1 className="mt-6 text-3xl">Paiement en attente</h1>
          <p className="mt-3 text-muted-foreground">
            Nous attendons la confirmation de Wave. Cette page se met à jour automatiquement.
          </p>
        </>
      )}

      <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Référence {reference}</p>

      {items.length > 0 && (
        <ul className="mx-auto mt-8 max-w-sm space-y-2 rounded-2xl border border-border bg-card p-5 text-left text-sm">
          {items.map((item) => (
            <li key={item.name} className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {item.name} × {item.qty}
              </span>
              <span>{formatFCFA(item.total)}</span>
            </li>
          ))}
          {data?.total != null && (
            <li className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span className="text-leaf">{formatFCFA(data.total)}</span>
            </li>
          )}
        </ul>
      )}

      <Link
        to="/"
        className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
      >
        Retour à l'accueil
      </Link>
    </section>
  );
}
