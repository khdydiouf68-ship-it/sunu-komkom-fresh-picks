import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/lib/cart";
import { formatFCFA } from "@/lib/products";
import { createCheckout } from "@/lib/checkout.functions";
import { LIVRAISON_FCFA } from "@/lib/checkout-shared";

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
  { id: "wave" as const, label: "Wave", detail: "Paiement mobile sécurisé, confirmation automatique" },
  { id: "cash" as const, label: "À la livraison", detail: "Espèces à la réception" },
];

function PaiementPage() {
  const { items, total, lines, clear } = useCart();
  const navigate = useNavigate();
  const checkout = useServerFn(createCheckout);
  const [moyen, setMoyen] = useState<"wave" | "cash">("wave");
  const [envoi, setEnvoi] = useState(false);

  if (items.length === 0) {
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
    const form = new FormData(event.currentTarget);
    setEnvoi(true);
    try {
      const result = await checkout({
        data: {
          lines,
          customerName: String(form.get("nom") ?? ""),
          customerPhone: String(form.get("tel") ?? ""),
          address: String(form.get("adresse") ?? ""),
          quartier: String(form.get("quartier") ?? "") || undefined,
          paymentMethod: moyen,
          origin: window.location.origin,
        },
      });
      clear();
      if (result.launchUrl) {
        window.location.href = result.launchUrl;
        return;
      }
      navigate({ to: "/commande/$reference", params: { reference: result.reference } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le paiement a échoué, réessayez.");
      setEnvoi(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="text-4xl">Paiement</h1>
      <p className="mt-2 text-muted-foreground">Choisissez votre moyen de paiement et confirmez la livraison.</p>

      <form onSubmit={onSubmit} className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
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

          <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <legend className="px-2 text-sm font-semibold">Livraison</legend>
            <Input label="Nom complet" id="nom" placeholder="Awa Diop" />
            <Input label="Téléphone" id="tel" placeholder="77 000 00 00" />
            <Input label="Adresse de livraison" id="adresse" placeholder="Sacré-Cœur 3, Villa 12, Dakar" />
            <Input label="Quartier (optionnel)" id="quartier" placeholder="Sacré-Cœur" required={false} />
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
            {moyen === "wave" ? "Payer avec Wave" : "Confirmer la commande"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {moyen === "wave"
              ? "Vous serez redirigé vers Wave pour valider le paiement."
              : "Vous réglez en espèces à la réception."}
          </p>
        </aside>
      </form>
    </section>
  );
}

function Input({
  label,
  id,
  placeholder,
  required = true,
}: {
  label: string;
  id: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
