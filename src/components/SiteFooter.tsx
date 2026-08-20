import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-sand">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={40} height={40} loading="lazy" className="size-10" />
            <span className="font-display text-lg font-semibold text-primary">Sunu KomKom</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            La fraîcheur directement chez vous. Poissons et légumes sélectionnés chaque matin.
          </p>
        </div>

        <div className="text-sm">
          <p className="font-semibold text-foreground">Boutique</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/poissons">Poissons frais</Link>
            </li>
            <li>
              <Link to="/legumes">Légumes frais</Link>
            </li>
            <li>
              <Link to="/panier">Mon panier</Link>
            </li>
            <li>
              <Link to="/paiement">Paiement</Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-semibold text-foreground">Contact</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>Marché Kermel, Dakar — Sénégal</li>
            <li>+221 77 000 00 00</li>
            <li>contact@sunukomkom.sn</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sunu KomKom — Wave & Orange Money acceptés.
      </div>
    </footer>
  );
}
