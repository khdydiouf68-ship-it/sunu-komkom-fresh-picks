import { useMemo, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Truck, XCircle } from "lucide-react";

import { adminDashboard, type DashboardOrder } from "@/lib/admin.functions";
import { formatFCFA, type Product } from "@/lib/products";

export const dashboardOptions = queryOptions({
  queryKey: ["admin-dashboard"],
  queryFn: () => adminDashboard(),
  staleTime: 30_000,
});

type Periode = "7j" | "30j" | "12m" | "tout";
const periodes: Array<{ id: Periode; label: string }> = [
  { id: "7j", label: "7 jours" },
  { id: "30j", label: "30 jours" },
  { id: "12m", label: "12 mois" },
  { id: "tout", label: "Tout" },
];

const statuts: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid: { label: "Payée en ligne", icon: CheckCircle2, className: "text-leaf" },
  confirmed: { label: "À payer à la livraison", icon: Truck, className: "text-primary" },
  pending: { label: "Paiement en attente", icon: Clock, className: "text-muted-foreground" },
  failed: { label: "Paiement échoué", icon: XCircle, className: "text-destructive" },
};

const validee = (o: DashboardOrder) => o.status === "paid" || o.status === "confirmed";
const fcfaCourt = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : v >= 1000 ? `${Math.round(v / 1000)} k` : String(v);

function cleJour(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function cleMois(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Regroupe le chiffre d'affaires des commandes validées par jour (7/30 j) ou par mois (12 mois / tout). */
function serieVentes(orders: DashboardOrder[], periode: Periode) {
  const parJour = periode === "7j" || periode === "30j";
  const now = new Date();
  const buckets: Array<{ cle: string; label: string; ca: number; commandes: number }> = [];

  if (parJour) {
    const n = periode === "7j" ? 7 : 30;
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({
        cle: cleJour(d),
        label: d.toLocaleDateString("fr-FR", periode === "7j" ? { weekday: "short", day: "numeric" } : { day: "numeric", month: "short" }),
        ca: 0,
        commandes: 0,
      });
    }
  } else {
    const plusAncienne = orders.length ? new Date(orders[orders.length - 1]!.created_at) : now;
    const n =
      periode === "12m"
        ? 12
        : Math.max(1, (now.getFullYear() - plusAncienne.getFullYear()) * 12 + now.getMonth() - plusAncienne.getMonth() + 1);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ cle: cleMois(d), label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }), ca: 0, commandes: 0 });
    }
  }

  const index = new Map(buckets.map((b) => [b.cle, b]));
  for (const o of orders) {
    if (!validee(o)) continue;
    const d = new Date(o.created_at);
    const b = index.get(parJour ? cleJour(d) : cleMois(d));
    if (b) {
      b.ca += o.total;
      b.commandes += 1;
    }
  }
  return buckets;
}

function debutPeriode(periode: Periode) {
  const now = new Date();
  if (periode === "7j") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (periode === "30j") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  if (periode === "12m") return new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return new Date(0);
}

export function AdminDashboard({ catalog }: { catalog: Product[] }) {
  const { data, isLoading, error } = useQuery(dashboardOptions);
  const [periode, setPeriode] = useState<Periode>("30j");

  const stats = useMemo(() => {
    if (!data) return null;
    const debut = debutPeriode(periode);
    const orders = data.orders.filter((o) => new Date(o.created_at) >= debut);
    const valides = orders.filter(validee);
    const ca = valides.reduce((s, o) => s + o.total, 0);
    const encaisse = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0);

    const parStatut = Object.keys(statuts).map((s) => ({ statut: s, nombre: orders.filter((o) => o.status === s).length }));

    const produits = new Map<string, { nom: string; ca: number; qte: number }>();
    for (const o of valides) {
      for (const item of o.items) {
        const p = produits.get(item.id) ?? { nom: item.name, ca: 0, qte: 0 };
        p.ca += item.total;
        p.qte += item.qty;
        produits.set(item.id, p);
      }
    }
    const top = [...produits.values()].sort((a, b) => b.ca - a.ca).slice(0, 5);

    return {
      orders,
      ca,
      encaisse,
      aEncaisser: ca - encaisse,
      nbValides: valides.length,
      panierMoyen: valides.length ? Math.round(ca / valides.length) : 0,
      parStatut,
      top,
      serie: serieVentes(data.orders, periode),
    };
  }, [data, periode]);

  const stockFaible = useMemo(() => catalog.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock), [catalog]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Chargement des statistiques…
      </div>
    );
  }
  if (error || !data || !stats) {
    return <p className="py-16 text-destructive">Impossible de charger les statistiques.</p>;
  }

  const maxTop = stats.top[0]?.ca ?? 1;

  return (
    <div className="space-y-8">
      {/* Filtre de période */}
      <div role="group" aria-label="Période" className="inline-flex rounded-xl border border-border bg-card p-1">
        {periodes.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={periode === p.id}
            onClick={() => setPeriode(p.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              periode === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Indicateurs clés */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur
          titre="Chiffre d'affaires"
          valeur={formatFCFA(stats.ca)}
          detail={`${formatFCFA(stats.encaisse)} encaissé en ligne · ${formatFCFA(stats.aEncaisser)} à la livraison`}
        />
        <Indicateur titre="Commandes validées" valeur={String(stats.nbValides)} detail={`${stats.orders.length} commandes au total`} />
        <Indicateur titre="Panier moyen" valeur={formatFCFA(stats.panierMoyen)} detail="Livraison comprise" />
        <Indicateur titre="Clients inscrits" valeur={String(data.customers)} detail="Tous les comptes clients" />
      </div>

      {/* Ventes dans le temps */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-lg font-semibold">Ventes {periode === "7j" || periode === "30j" ? "par jour" : "par mois"}</h2>
        <p className="text-sm text-muted-foreground">Chiffre d'affaires des commandes payées ou à payer à la livraison</p>
        <div className="mt-4 h-64" role="img" aria-label="Graphique du chiffre d'affaires sur la période">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={fcfaCourt}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as (typeof stats.serie)[number] | undefined;
                  if (!active || !point) return null;
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                      <p className="font-medium">{point.label}</p>
                      <p>{formatFCFA(point.ca)}</p>
                      <p className="text-muted-foreground">
                        {point.commandes} commande{point.commandes > 1 ? "s" : ""}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="ca" name="Chiffre d'affaires" fill="var(--leaf)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Voir les données</summary>
          <table className="mt-2 w-full text-left">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Période</th>
                <th className="py-1 text-right font-medium">Commandes</th>
                <th className="py-1 text-right font-medium">Chiffre d'affaires</th>
              </tr>
            </thead>
            <tbody>
              {stats.serie.map((b) => (
                <tr key={b.cle} className="border-t border-border">
                  <td className="py-1">{b.label}</td>
                  <td className="py-1 text-right tabular-nums">{b.commandes}</td>
                  <td className="py-1 text-right tabular-nums">{formatFCFA(b.ca)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Meilleurs produits */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold">Meilleures ventes</h2>
          <p className="text-sm text-muted-foreground">Top 5 des produits par chiffre d'affaires</p>
          {stats.top.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Aucune vente sur la période.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.top.map((p) => (
                <li key={p.nom} title={`${p.nom} : ${formatFCFA(p.ca)} (${p.qte} vendus)`}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium">{p.nom}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatFCFA(p.ca)} · {p.qte} vendu{p.qte > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-leaf" style={{ width: `${Math.max(4, (p.ca / maxTop) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Statut des commandes */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold">Statut des commandes</h2>
          <p className="text-sm text-muted-foreground">Sur la période sélectionnée</p>
          <ul className="mt-4 divide-y divide-border">
            {stats.parStatut.map(({ statut, nombre }) => {
              const s = statuts[statut]!;
              const Icon = s.icon;
              return (
                <li key={statut} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <Icon className={`size-4 ${s.className}`} />
                    {s.label}
                  </span>
                  <span className="font-semibold tabular-nums">{nombre}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Dernières commandes */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold">Dernières commandes</h2>
          {stats.orders.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Aucune commande sur la période.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">Commande</th>
                    <th className="py-2 font-medium">Client</th>
                    <th className="py-2 font-medium">Statut</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.orders.slice(0, 10).map((o) => {
                    const s = statuts[o.status];
                    const Icon = s?.icon ?? Clock;
                    return (
                      <tr key={o.reference} className="border-t border-border">
                        <td className="py-2">
                          <p className="font-medium">{o.reference}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </td>
                        <td className="py-2">{o.customer_name}</td>
                        <td className="py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className={`size-4 ${s?.className ?? "text-muted-foreground"}`} />
                            {s?.label ?? o.status}
                            {o.paid_with ? <span className="text-muted-foreground">({o.paid_with})</span> : null}
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums">{formatFCFA(o.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Stock faible */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="size-4 text-accent" /> Stock faible
          </h2>
          <p className="text-sm text-muted-foreground">Produits avec 5 unités ou moins</p>
          {stockFaible.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Tous les stocks sont suffisants.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {stockFaible.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{p.name}</span>
                  <span className={`font-semibold tabular-nums ${p.stock === 0 ? "text-destructive" : ""}`}>
                    {p.stock === 0 ? "Rupture" : `${p.stock} ${p.unit}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Indicateur({ titre, valeur, detail }: { titre: string; valeur: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-sm text-muted-foreground">{titre}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-foreground">{valeur}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
