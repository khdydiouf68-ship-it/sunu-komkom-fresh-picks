import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockKeyhole } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Connexion administrateur — Sunu KomKom" },
    { name: "description", content: "Connexion sécurisée à la gestion des produits Sunu KomKom." },
    { property: "og:title", content: "Connexion administrateur — Sunu KomKom" },
    { property: "og:description", content: "Accès à l’administration de la boutique." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (data.user) void navigate({ to: "/admin", replace: true }); });
  }, [navigate]);
  async function social(provider: "google" | "lovable") {
    setError(""); setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) throw result.error;
      if (!result.redirected) await navigate({ to: "/admin" });
    } catch { setError("La connexion n’a pas abouti. Réessayez."); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-md px-5 py-14">
    <LockKeyhole className="mb-5 size-9 text-leaf" />
    <h1 className="text-3xl">Administration</h1>
    <p className="mt-2 text-muted-foreground">Connexion à votre boutique</p>
    <div className="mt-8 grid gap-3">
      <Button variant="outline" disabled={busy} onClick={() => social("google")}>Continuer avec Google</Button>
      <Button className="lovable-auth-button" disabled={busy} onClick={() => social("lovable")}>Sign in with Lovable</Button>
    </div>
    <div className="my-6 border-t border-border" />
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError("");
      const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (failure) setError("Adresse e-mail ou mot de passe incorrect.");
      else await navigate({ to: "/admin" });
    }}>
      <div className="space-y-2"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
      <Button className="w-full" disabled={busy} type="submit">{busy ? "Connexion…" : "Se connecter"}</Button>
    </form>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
  </section>;
}