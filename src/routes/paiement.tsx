import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatFCFA } from "@/lib/products";

export const Route = createFileRoute("/paiement")({
  head: () => ({
    meta: [
      { title: "Paiement — Sunu KomKom" },
      {
        name: "description",
        content: "Payez votre commande de produits frais par Wave, Orange Money ou à la livraison.",
      },
      { property: "og:title", content: "Paiement — Sunu KomKom" },
      { property: "og:description", content: "Wave, Orange Money ou paiement à la livraison à Dakar." },
    ],
  }),
  component: PaiementPage,
});

const LIVRAISON = 1500;

const moyens = [
  { id: "wave", label: "Wave", detail: "Paiement mobile instantané" },
  { id: "om", label: "Orange Money", detail: "Débit sur votre compte OM" },
  { id: "cash", label: "À la livraison", detail: "Espèces à la réception" },
];

function PaiementPage() {
  const { items, total, clear } = useCart();
  const [moyen, setMoyen] = useState("wave");
  const [confirme, setConfirme] = useState(false);

  if (confirme) {
    return (
      <section className="mx-auto max-w-lg px-5 py-24 text-center">
        <CheckCircle2 className="mx-auto size-14 text-leaf" />
        <h1 className="mt-6 text-3xl">Commande confirmée</h1>
        <p className="mt-3 text-muted-foreground">
          Merci ! Vous recevrez un SMS de confirmation. Livraison prévue dans les 3 heures à Dakar.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          Retour à l'accueil
        </Link>
      </section>
    );
  }

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

  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="text-4xl">Paiement</h1>
      <p className="mt-2 text-muted-foreground">Choisissez votre moyen de paiement et confirmez la livraison.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          clear();
          setConfirme(true);
        }}
        className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-6">
          <fieldset className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <legend className="px-2 text-sm font-semibold">Moyen de paiement</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
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
            {moyen !== "cash" && (
              <Input
                label={`Numéro ${moyen === "wave" ? "Wave" : "Orange Money"}`}
                id="paynum"
                placeholder="77 000 00 00"
              />
            )}
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
            <span>{formatFCFA(LIVRAISON)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="text-leaf">{formatFCFA(total + LIVRAISON)}</span>
          </div>
          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground"
          >
            Confirmer et payer
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Démonstration : aucun débit réel n'est effectué.
          </p>
        </aside>
      </form>
    </section>
  );
}

function Input({ label, id, placeholder }: { label: string; id: string; placeholder: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        required
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
