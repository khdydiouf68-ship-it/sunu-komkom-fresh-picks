import { Link } from "@tanstack/react-router";
import { ShieldCheck, ShoppingBasket, UserRound } from "lucide-react";
import logo from "@/assets/logo.png";
import { useCart } from "@/lib/cart";
import { useIsAdmin } from "@/hooks/use-is-admin";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/poissons", label: "Poissons frais" },
  { to: "/legumes", label: "Légumes frais" },
  { to: "/epices", label: "Épices" },
  { to: "/a-propos", label: "À propos" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const isAdmin = useIsAdmin();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Logo Sunu KomKom" width={44} height={44} className="size-11" />
          <span className="font-display text-xl font-semibold text-primary">Sunu KomKom</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-muted-foreground transition-colors hover:text-leaf"
              activeProps={{ className: "text-leaf" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {isAdmin && (
          <Link
            to="/admin"
            aria-label="Administration"
            title="Administration"
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-leaf/40 px-3 py-1.5 text-sm font-medium text-leaf transition-colors hover:bg-leaf/10 md:ml-0"
          >
            <ShieldCheck className="size-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}
        <Link to="/compte" aria-label="Mon compte" title="Mon compte" className={`${isAdmin ? "" : "ml-auto"} mr-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground md:ml-0`}>
          <UserRound className="size-5" />
          <span className="hidden sm:inline">Mon compte</span>
        </Link>
        <Link
          to="/panier"
          className="relative inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ShoppingBasket className="size-4" />
          Panier
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
              {count}
            </span>
          )}
        </Link>
      </div>

      <nav className="flex gap-4 overflow-x-auto border-t border-border px-5 py-2 text-sm md:hidden">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="whitespace-nowrap text-muted-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
