import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, RotateCcw, XCircle } from "lucide-react";

import { getOrderStatus, retryPayment } from "@/lib/checkout.functions";
import { formatFCFA } from "@/lib/products";

export const Route = createFileRoute("/commande/$reference")({
  head: () => ({
    meta: [
      { title: "Suivi de commande — Sunu KomKom" },
      { name: "description", content: "Suivez la confirmation de paiement de votre commande de produits frais." },
      { property: "og:title", content: "Suivi de commande — Sunu KomKom" },
      { property: "og:description", content: "Confirmation de paiement de votre commande Sunu KomKom." },
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
  const relancer = useServerFn(retryPayment);
  const [relanceEnCours, setRelanceEnCours] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["order", reference],
    queryFn: () => fetchStatus({ data: { reference } }),
    // Tant que le paiement est en attente, on revérifie toutes les 4 secondes.
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 4000 : false),
  });

  const status = data?.status ?? (isLoading ? "loading" : "unknown");
  const items = (data?.items ?? []) as Array<{ name: string; qty: number; total: number }>;
  const enLigne = data?.payment_method === "paytech" || data?.payment_method === "wave";
  const peutRelancer = data?.payment_method === "paytech" && (status === "pending" || status === "failed");

  async function reessayer() {
    setRelanceEnCours(true);
    try {
      const { launchUrl } = await relancer({ data: { reference, origin: window.location.origin } });
      window.location.href = launchUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de relancer le paiement.");
      setRelanceEnCours(false);
    }
  }

  const boutonRelance = peutRelancer && (
    <button
      type="button"
      onClick={reessayer}
      disabled={relanceEnCours}
      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-foreground disabled:opacity-60"
    >
      {relanceEnCours ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
      {status === "failed" || echec ? "Réessayer le paiement" : "Reprendre le paiement"}
    </button>
  );

  return (
    <section className="mx-auto max-w-lg px-5 py-20 text-center">
      {status === "loading" ? (
        <Loader2 className="mx-auto size-10 animate-spin text-muted-foreground" />
      ) : status === "paid" || status === "confirmed" ? (
        <>
          <CheckCircle2 className="mx-auto size-14 text-leaf" />
          <h1 className="mt-6 text-3xl">{status === "paid" ? "Paiement confirmé" : "Commande enregistrée"}</h1>
          <p className="mt-3 text-muted-foreground">
            {status === "paid"
              ? `Merci ! Votre paiement${data?.paid_with ? ` par ${data.paid_with}` : ""} a bien été reçu. Livraison prévue dans les 3 heures à Dakar.`
              : "Vous réglerez à la livraison. Notre livreur vous appelle avant de passer."}
          </p>
        </>
      ) : status === "failed" || echec ? (
        <>
          <XCircle className="mx-auto size-14 text-destructive" />
          <h1 className="mt-6 text-3xl">Paiement non abouti</h1>
          <p className="mt-3 text-muted-foreground">
            Le paiement n'a pas été finalisé et vous n'avez pas été débité. Votre commande est conservée : vous
            pouvez réessayer.
          </p>
          {boutonRelance}
        </>
      ) : status === "unknown" ? (
        <>
          <XCircle className="mx-auto size-14 text-muted-foreground" />
          <h1 className="mt-6 text-3xl">Commande introuvable</h1>
          <p className="mt-3 text-muted-foreground">Vérifiez la référence de votre commande.</p>
        </>
      ) : (
        <>
          <Clock className="mx-auto size-14 animate-pulse text-muted-foreground" />
          <h1 className="mt-6 text-3xl">Paiement en attente</h1>
          <p className="mt-3 text-muted-foreground">
            {enLigne
              ? "Nous attendons la confirmation de votre paiement. Cette page se met à jour automatiquement."
              : "Votre commande est en cours de traitement."}
          </p>
          {peutRelancer && (
            <p className="mt-4 text-sm text-muted-foreground">Vous n'avez pas terminé le paiement ?</p>
          )}
          {boutonRelance}
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

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
          Retour à l'accueil
        </Link>
        <Link
          to="/compte"
          className="inline-block rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary"
        >
          Mes commandes
        </Link>
      </div>
    </section>
  );
}
