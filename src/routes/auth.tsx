import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock, Mail, MapPin, Phone, User } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion & Inscription — Sunu KomKom" },
      { name: "description", content: "Connectez-vous ou créez votre compte client Sunu KomKom." },
      { property: "og:title", content: "Connexion & Inscription — Sunu KomKom" },
      { property: "og:description", content: "Espace client Sunu KomKom : suivi des commandes et coordonnées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  // ?redirect=/paiement : page où revenir après la connexion (chemin interne uniquement).
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search["redirect"];
    return typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? { redirect: r } : {};
  },
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const destination = redirectTo ?? "/compte";

  // Mode connexion ou inscription
  const [isSignUp, setIsSignUp] = useState(false);

  // Champs d'authentification
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Coordonnées pour l'inscription
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [quartier, setQuartier] = useState("");

  // États de chargement et retours
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        void navigate({ href: destination, replace: true });
      }
    });
  }, [navigate, destination]);

  async function handleGoogleSignIn() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      // Redirige vers Google ; au retour sur /auth, la session est détectée
      // et l'utilisateur est renvoyé vers la page demandée (ou /compte).
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`,
        },
      });
      if (oauthError) throw oauthError;
    } catch {
      setError("La connexion avec Google n'a pas abouti. Veuillez réessayer.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (isSignUp) {
        // Validation des mots de passe
        if (password !== confirmPassword) {
          setError("Les mots de passe ne correspondent pas.");
          setBusy(false);
          return;
        }

        if (password.length < 6) {
          setError("Le mot de passe doit contenir au moins 6 caractères.");
          setBusy(false);
          return;
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: fullName,
              phone: phone.trim(),
              address: address.trim(),
              quartier: quartier.trim(),
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message || "Impossible de créer le compte. Veuillez réessayer.");
          setBusy(false);
          return;
        }

        // Le profil client (customer_profiles) est créé en base par le trigger
        // on_auth_user_created_customer_profile à partir des métadonnées ci-dessus.
        if (data.session) {
          await navigate({ href: destination });
          return;
        }

        setMessage("Compte créé ! Confirmez votre adresse via l'e-mail reçu, puis connectez-vous.");
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        // Connexion standard
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError("Adresse e-mail ou mot de passe incorrect.");
        } else {
          await navigate({ href: destination });
        }
      }
    } catch {
      setError("Une erreur inattendue est survenue. Veuillez vérifier vos informations.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-xl flex-col justify-center px-4 py-10">
      <div className="mb-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour à la boutique
        </Link>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <img src={logo} alt="Sunu KomKom" className="size-10 object-contain" />
          </div>
          <div>
            <CardTitle className="font-display text-2xl font-semibold text-foreground">
              {isSignUp ? "Créer un compte client" : "Mon espace client"}
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm text-muted-foreground">
              {isSignUp
                ? "Renseignez vos coordonnées complètes pour faciliter vos futures commandes et livraisons."
                : "Connectez-vous pour suivre l'état de vos commandes."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-lg border border-leaf/30 bg-leaf/10 p-3 text-sm text-leaf"
            >
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {!isSignUp && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2.5 h-11 text-sm font-medium"
                disabled={busy}
                onClick={handleGoogleSignIn}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
                Continuer avec Google
              </Button>

              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-border" />
                <span className="absolute bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">
                  ou par e-mail
                </span>
              </div>
            </>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp ? (
              <>
                {/* Prénom & Nom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                      Prénom <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="Ex : Moussa"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={busy}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                      Nom de famille <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Ex : Diop"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={busy}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* E-mail & Téléphone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Adresse e-mail <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="moussa.diop@exemple.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                      Numéro de téléphone <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="77 000 00 00"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={busy}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Adresse & Quartier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-sm font-medium text-foreground">
                      Adresse de livraison <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="address"
                      placeholder="Sacré-Cœur 3, Villa 12"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={busy}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="quartier" className="text-sm font-medium text-foreground">
                      Quartier (Dakar)
                    </Label>
                    <Input
                      id="quartier"
                      placeholder="Ex : Sacré-Cœur, Almadies..."
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      disabled={busy}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Mots de passe */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Mot de passe <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Au moins 6 caractères"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                      Confirmer le mot de passe <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Répétez le mot de passe"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={busy}
                      className="h-10"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Formulaire de connexion simple */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Adresse e-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="votre-adresse@exemple.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Mot de passe
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    className="h-10"
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-medium mt-2" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {isSignUp ? "Création du compte…" : "Connexion en cours…"}
                </>
              ) : isSignUp ? (
                "Créer mon compte client"
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            {isSignUp ? (
              <p>
                Vous avez déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError("");
                    setMessage("");
                  }}
                  className="font-medium text-primary hover:underline underline-offset-2"
                >
                  Se connecter
                </button>
              </p>
            ) : (
              <p>
                Nouveau chez Sunu KomKom ?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError("");
                    setMessage("");
                  }}
                  className="font-medium text-primary hover:underline underline-offset-2"
                >
                  Créer un compte
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
