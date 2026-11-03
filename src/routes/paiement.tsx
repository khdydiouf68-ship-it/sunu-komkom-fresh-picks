import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, LogIn, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatFCFA } from "@/lib/products";
import { createCheckout } from "@/lib/checkout.functions";
import { LIVRAISON_FCFA } from "@/lib/checkout-shared";
import { saveProfile } from "@/lib/account.functions";
import { profileOptions } from "@/lib/account";

export const Route = createFileRoute("/paiement")({
  head: () => ({
    meta: [
      { title: "Paiement — Sunu KomKom" },
      {
        name: "description",
        content: "Payez votre commande de produits frais par Wave ou à la livraison, partout à Dakar.",
      },
      { property: "og:title", content: "Paiement — Sunu KomKom" },
      { property: "og:description", content: "Paiement Wave sécurisé ou règlement à la livraison à Dakar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaiementPage,
});

const moyens = [
  {
    id: "paytech" as const,
    label: "Paiement en ligne",
    detail: "Wave, Orange Money, Free Money ou carte bancaire — sécurisé par PayTech",
  },
  { id: "cash" as const, label: "À la livraison", detail: "Espèces à la réception" },
];

function PaiementPage() {
  const { items, total, lines, clear } = useCart();
  const navigate = useNavigate();
  const checkout = useServerFn(createCheckout);
  const saveContact = useServerFn(saveProfile);
  const queryClient = useQueryClient();
  const [moyen, setMoyen] = useState<"paytech" | "cash">("paytech");
  const [envoi, setEnvoi] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const connecte = email !== null;

  const [contact, setContact] = useState<Contact>(contactVide);
  const [note, setNote] = useState("");
  const [modifie, setModifie] = useState(false);
  const [memoriser, setMemoriser] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: profil, isLoading: profilEnChargement } = useQuery({ ...profileOptions, enabled: connecte });

  // Préremplit le formulaire avec les coordonnées du compte, tant que le client n'a rien saisi.
  useEffect(() => {
    if (profil && !modifie) setContact(profil);
  }, [profil, modifie]);

  const panierVide = items.length === 0;
  const profilComplet = Boolean(profil?.fullName && profil.phone && profil.address);
  const differentDuCompte =
    !profil ||
    contact.fullName.trim() !== profil.fullName ||
    contact.phone.trim() !== profil.phone ||
    contact.address.trim() !== profil.address ||
    contact.quartier.trim() !== profil.quartier;

  function changer(champ: keyof Contact, valeur: string) {
    setModifie(true);
    setContact((c) => ({ ...c, [champ]: valeur }));
  }

  if (panierVide) {
    return (
      <section className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="text-3xl">Paiement</h1>
        <p className="mt-3 text-muted-foreground">Votre panier est vide, ajoutez des produits avant de payer.</p>
        <Link
          to="/legumes"
          className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          Voir les produits
        </Link>
      </section>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (envoi) return;
    const saisie: Contact = {
      fullName: contact.fullName.trim(),
      phone: contact.phone.trim(),
      address: contact.address.trim(),
      quartier: contact.quartier.trim(),
    };
    setEnvoi(true);
    try {
      const result = await checkout({
        data: {
          lines,
          customerName: saisie.fullName,
          customerPhone: saisie.phone,
          address: saisie.address,
          quartier: saisie.quartier || undefined,
          note: note.trim() || undefined,
          paymentMethod: moyen,
          origin: window.location.origin,
        },
      });
      if (connecte && memoriser && differentDuCompte) {
        try {
          queryClient.setQueryData(profileOptions.queryKey, await saveContact({ data: saisie }));
        } catch {
          // La commande est déjà enregistrée : un échec ici ne doit pas la bloquer.
        }
      }
      clear();
      if (result.launchUrl) {
        window.location.href = result.launchUrl;
        return;
      }
      navigate({ to: "/commande/$reference", params: { reference: result.reference }, search: { echec: false } });
    } catch (error) {
      toast.error(messageErreur(error));
      setEnvoi(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="text-4xl">Paiement</h1>
      <p className="mt-2 text-muted-foreground">
        Renseignez vos coordonnées de livraison et choisissez votre moyen de paiement.
      </p>

      <form onSubmit={onSubmit} className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <legend className="px-2 text-sm font-semibold">Coordonnées de livraison</legend>

            {connecte ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-secondary p-3 text-sm">
                <UserRound className="mt-0.5 size-4 shrink-0 text-leaf" />
                <p>
                  Connecté en tant que <span className="font-medium">{email}</span>.{" "}
                  {profilEnChargement
                    ? "Chargement de vos coordonnées…"
                    : profilComplet
                      ? "Vos coordonnées ont été préremplies, vous pouvez les modifier."
                      : "Complétez vos coordonnées, elles seront enregistrées pour vos prochaines commandes."}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary p-3 text-sm">
                <span>Vous avez déjà un compte ? Connectez-vous pour préremplir vos coordonnées.</span>
                <Link
                  to="/auth"
                  search={{ redirect: "/paiement" }}
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                >
                  <LogIn className="size-4" />
                  Se connecter
                </Link>
              </div>
            )}

            <Champ
              label="Nom complet"
              id="nom"
              autoComplete="name"
              placeholder="Awa Diop"
              minLength={2}
              maxLength={80}
              value={contact.fullName}
              onChange={(v) => changer("fullName", v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Champ
                label="Téléphone"
                id="tel"
                type="tel"
                autoComplete="tel"
                placeholder="77 000 00 00"
                minLength={6}
                maxLength={25}
                value={contact.phone}
                onChange={(v) => changer("phone", v)}
              />
              <Champ
                label="Quartier (optionnel)"
                id="quartier"
                placeholder="Sacré-Cœur"
                required={false}
                maxLength={80}
                value={contact.quartier}
                onChange={(v) => changer("quartier", v)}
              />
            </div>
            <Champ
              label="Adresse de livraison"
              id="adresse"
              autoComplete="street-address"
              placeholder="Sacré-Cœur 3, Villa 12, Dakar"
              minLength={4}
              maxLength={200}
              value={contact.address}
              onChange={(v) => changer("address", v)}
            />
            <div>
              <label htmlFor="note" className="text-sm font-medium">
                Instructions pour le livreur (optionnel)
              </label>
              <textarea
                id="note"
                name="note"
                rows={2}
                maxLength={400}
                placeholder="Ex : sonner au portail bleu, appeler en arrivant…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {connecte && differentDuCompte && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={memoriser}
                  onChange={(e) => setMemoriser(e.target.checked)}
                  className="size-4 accent-primary"
                />
                {profilComplet
                  ? "Mettre à jour ces coordonnées dans mon compte"
                  : "Enregistrer ces coordonnées dans mon compte"}
              </label>
            )}
          </fieldset>

          <fieldset className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <legend className="px-2 text-sm font-semibold">Moyen de paiement</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {moyens.map((m) => (
                <label
                  key={m.id}
                  className={`cursor-pointer rounded-xl border p-4 text-sm transition-colors ${
                    moyen === m.id ? "border-leaf bg-secondary" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="moyen"
                    value={m.id}
                    checked={moyen === m.id}
                    onChange={() => setMoyen(m.id)}
                    className="sr-only"
                  />
                  <span className="block font-semibold">{m.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{m.detail}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-xl">Votre commande</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map(({ product, qty, total: ligne }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {product.name} × {qty}
                </span>
                <span>{formatFCFA(ligne)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Livraison</span>
            <span>{formatFCFA(LIVRAISON_FCFA)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="text-leaf">{formatFCFA(total + LIVRAISON_FCFA)}</span>
          </div>
          <button
            type="submit"
            disabled={envoi}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {envoi && <Loader2 className="size-4 animate-spin" />}
            {moyen === "paytech" ? `Payer ${formatFCFA(total + LIVRAISON_FCFA)}` : "Confirmer la commande"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {moyen === "paytech"
              ? "Vous serez redirigé vers la page sécurisée PayTech pour choisir Wave, Orange Money, Free Money ou carte."
              : "Vous réglez en espèces à la réception."}
          </p>
        </aside>
      </form>
    </section>
  );
}

type Contact = { fullName: string; phone: string; address: string; quartier: string };
const contactVide: Contact = { fullName: "", phone: "", address: "", quartier: "" };

/** Le serveur renvoie parfois une erreur de validation brute (JSON zod) : on la rend lisible. */
function messageErreur(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (!message || message.trim().startsWith("[")) return "Vérifiez vos coordonnées puis réessayez.";
  return message;
}

function Champ({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  required = true,
  autoComplete,
  minLength,
  maxLength,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
