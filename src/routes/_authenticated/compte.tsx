import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Loader2, LogOut, MapPin, Package, Save, Settings, ShoppingBag, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { myOrders, saveProfile, type CustomerProfile } from "@/lib/account.functions";
import { profileOptions } from "@/lib/account";
import { formatFCFA } from "@/lib/products";

const ordersOptions = queryOptions({
  queryKey: ["my-orders"],
  queryFn: () => myOrders(),
});

const statusLabel: Record<string, string> = {
  pending: "En attente de paiement",
  paid: "Payée",
  confirmed: "Confirmée",
  failed: "Échouée",
};

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({
    meta: [
      { title: "Mon compte — Sunu KomKom" },
      { name: "description", content: "Suivez vos commandes et gérez vos coordonnées de livraison." },
      { property: "og:title", content: "Mon compte — Sunu KomKom" },
      { property: "og:description", content: "Votre espace client Sunu KomKom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    // On précharge les données en parallèle ; les erreurs individuelles sont
    // absorbées dans les server functions — on n'arrête pas le chargement de la page.
    await Promise.allSettled([
      context.queryClient.ensureQueryData(ordersOptions),
      context.queryClient.ensureQueryData(profileOptions),
    ]);
  },
  component: ComptePage,
});

function ComptePage() {
  const { data: accountData } = useSuspenseQuery(ordersOptions);
  const { data: initialProfile } = useSuspenseQuery(profileOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const saveContact = useServerFn(saveProfile);

  const [profile, setProfile] = useState<CustomerProfile>(initialProfile);
  const [savingProfile, setSavingProfile] = useState(false);

  async function logout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await saveContact({ data: profile });
      queryClient.setQueryData(profileOptions.queryKey, updated);
      toast.success("Vos coordonnées de livraison ont été enregistrées !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-5 py-12">
      {/* En-tête du compte */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-sm font-medium text-leaf">Mon espace client</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Bonjour</h1>
          <p className="mt-1 text-sm text-muted-foreground">{accountData.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {accountData.isAdmin && (
            <Button asChild variant="outline">
              <Link to="/admin">
                <Settings className="size-4 mr-2" />
                Gérer les produits
              </Link>
            </Button>
          )}
          <Button variant="ghost" onClick={logout}>
            <LogOut className="size-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Coordonnées de livraison */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-leaf" />
              <CardTitle className="text-xl">Coordonnées de livraison</CardTitle>
            </div>
            <CardDescription>
              Vos informations enregistrées pour pré-remplir vos commandes futures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  placeholder="Ex : Moussa Diop"
                  value={profile.fullName}
                  onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                  maxLength={80}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  placeholder="Ex : 77 000 00 00"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  maxLength={25}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Adresse de livraison</Label>
                <Input
                  id="address"
                  placeholder="Ex : Sacré-Cœur 3, Villa 12, Dakar"
                  value={profile.address}
                  onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quartier">Quartier</Label>
                <Input
                  id="quartier"
                  placeholder="Ex : Sacré-Cœur, Mermoz, Almadies..."
                  value={profile.quartier}
                  onChange={(e) => setProfile((p) => ({ ...p, quartier: e.target.value }))}
                  maxLength={80}
                />
              </div>

              <Button type="submit" disabled={savingProfile} className="w-full">
                {savingProfile ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Enregistrer mes coordonnées
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Historique des commandes */}
        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="size-5 text-leaf" />
                <CardTitle className="text-xl">Mes commandes</CardTitle>
              </div>
              <span className="text-xs font-medium rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                {accountData.orders.length} {accountData.orders.length > 1 ? "commandes" : "commande"}
              </span>
            </div>
            <CardDescription>
              Historique de vos commandes passées sur Sunu KomKom.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            {accountData.orders.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground my-4">
                <Package className="mb-2 size-8 text-leaf/60" />
                <p className="text-sm font-medium text-foreground">Aucune commande pour le moment.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vos commandes de poissons et légumes apparaîtront ici.
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/poissons">
                    <ShoppingBag className="mr-1.5 size-4" />
                    Faire mes courses
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {accountData.orders.map((o) => (
                  <li key={o.reference}>
                    <Link
                      to="/commande/$reference"
                      params={{ reference: o.reference }}
                      search={{ echec: false }}
                      className="flex items-center justify-between gap-4 py-3.5 px-2 rounded-lg transition-colors hover:bg-secondary/40"
                    >
                      <div>
                        <p className="font-semibold text-sm">{o.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("fr-FR")} ·{" "}
                          {o.payment_method === "paytech"
                            ? "Paiement en ligne"
                            : o.payment_method === "wave"
                              ? "Wave"
                              : "À la livraison"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatFCFA(o.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {statusLabel[o.status] ?? o.status}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
