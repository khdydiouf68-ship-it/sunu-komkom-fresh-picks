import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Sunu KomKom" },
      {
        name: "description",
        content: "Contactez Sunu KomKom pour vos commandes de poissons et légumes frais à Dakar.",
      },
      { property: "og:title", content: "Contact — Sunu KomKom" },
      { property: "og:description", content: "Téléphone, e-mail et adresse de notre marché frais à Dakar." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <section className="mx-auto grid max-w-5xl gap-10 px-5 py-14 md:grid-cols-2">
      <div>
        <h1 className="text-4xl">Contact</h1>
        <p className="mt-2 text-muted-foreground">
          Une question sur une commande ou une livraison ? Écrivez-nous, nous répondons sous 24 h.
        </p>
        <ul className="mt-8 space-y-4 text-sm">
          <li className="flex items-center gap-3">
            <MapPin className="size-5 text-leaf" /> Marché Kermel, Dakar — Sénégal
          </li>
          <li className="flex items-center gap-3">
            <Phone className="size-5 text-leaf" /> +221 77 000 00 00
          </li>
          <li className="flex items-center gap-3">
            <Mail className="size-5 text-leaf" /> contact@sunukomkom.sn
          </li>
        </ul>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
          toast.success("Message envoyé, merci !");
        }}
        className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card"
      >
        <Field label="Nom complet" name="nom" placeholder="Awa Diop" />
        <Field label="Téléphone" name="tel" placeholder="77 000 00 00" />
        <div>
          <label htmlFor="msg" className="text-sm font-medium">
            Message
          </label>
          <textarea
            id="msg"
            required
            rows={4}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Votre message..."
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        >
          Envoyer le message
        </button>
        {sent && <p className="text-sm text-leaf">Merci ! Nous vous rappellerons rapidement.</p>}
      </form>
    </section>
  );
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder: string }) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        required
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
