import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { LogOut, Package, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { myOrders } from "@/lib/account.functions";
import { formatFCFA } from "@/lib/products";

const ordersOptions = queryOptions({ queryKey: ["my-orders"], queryFn: () => myOrders() });
const statusLabel: Record<string, string> = { pending: "En attente", confirmed: "Confirmée", failed: "Échouée" };

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({ meta: [
    { title: "Mon compte — Sunu KomKom" },
    { name: "description", content: "Suivez vos commandes de poissons, légumes et épices Sunu KomKom." },
    { property: "og:title", content: "Mon compte — Sunu KomKom" },
    { property: "og:description", content: "Votre espace client Sunu KomKom." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(ordersOptions),
  component: ComptePage,
});

function ComptePage() {
  const { data } = useSuspenseQuery(ordersOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  async function logout() {
    await queryClient.cancelQueries(); queryClient.clear();
    await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true });
  }
  return <section className="mx-auto max-w-3xl px-5 py-12">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <div><p className="text-sm font-medium text-leaf">Mon espace client</p><h1 className="text-3xl">Bonjour</h1><p className="text-sm text-muted-foreground">{data.email}</p></div>
      <div className="flex flex-wrap gap-2">
        {data.isAdmin && <Button asChild variant="outline"><Link to="/admin"><Settings />Gérer les produits</Link></Button>}
        <Button variant="ghost" onClick={logout}><LogOut />Déconnexion</Button>
      </div>
    </div>
    <h2 className="mt-8 text-2xl">Mes commandes</h2>
    {data.orders.length === 0 ? <div className="mt-6 text-muted-foreground"><Package className="mb-3 size-8 text-leaf" /><p>Vous n’avez pas encore de commande.</p><Button asChild className="mt-4"><Link to="/poissons">Faire mes courses</Link></Button></div> :
    <ul className="mt-4 divide-y divide-border">{data.orders.map(o => <li key={o.reference}>
      <Link to="/commande/$reference" params={{ reference: o.reference }} className="flex items-center justify-between gap-4 py-4 hover:bg-secondary/40">
        <div><p className="font-semibold">{o.reference}</p><p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR")} · {o.payment_method === "wave" ? "Wave" : "À la livraison"}</p></div>
        <div className="text-right"><p className="font-semibold">{formatFCFA(o.total)}</p><p className="text-sm text-muted-foreground">{statusLabel[o.status] ?? o.status}</p></div>
      </Link></li>)}</ul>}
  </section>;
}
