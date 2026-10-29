import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Pencil, Save, LogOut, Upload, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { checkAdmin, saveProduct } from "@/lib/catalog.functions";
import { catalogOptions, useCatalog } from "@/lib/catalog";
import { productInput, type ManagedProduct } from "@/lib/catalog-shared";
import { formatFCFA } from "@/lib/products";

const adminOptions = queryOptions({ queryKey: ["admin-access"], queryFn: () => checkAdmin() });
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Fiches produits — Administration Sunu KomKom" },
    { name: "description", content: "Gestion des photos, prix et stocks des produits Sunu KomKom." },
    { property: "og:title", content: "Fiches produits — Sunu KomKom" },
    { property: "og:description", content: "Espace administrateur de la boutique." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(adminOptions); await context.queryClient.ensureQueryData(catalogOptions); },
  component: AdminPage,
});

function AdminPage() {
  const { data: allowed } = useSuspenseQuery(adminOptions);
  const catalog = useCatalog();
  const { data: savedRows } = useSuspenseQuery(catalogOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const save = useServerFn(saveProduct);
  const [draft, setDraft] = useState<ManagedProduct | null>(null);
  const [preview, setPreview] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    await queryClient.cancelQueries(); queryClient.clear();
    await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true });
  }
  function field(key: keyof ManagedProduct, value: string | number) {
    setDraft(previous => previous ? { ...previous, [key]: value } : null);
  }
  if (!allowed) return <section className="mx-auto max-w-xl px-5 py-14"><h1 className="text-3xl">Accès administrateur en attente</h1><p className="my-5 text-muted-foreground">Votre compte est connecté, mais n’a pas encore l’autorisation de gérer les produits.</p><Button variant="outline" onClick={logout}><LogOut />Se déconnecter</Button></section>;
  return <section className="mx-auto max-w-6xl px-5 py-10">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <div><p className="mb-1 text-sm font-medium text-leaf">Sunu KomKom · Administration</p><h1 className="text-3xl">Fiches produits</h1></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/">Voir la boutique</Link></Button><Button variant="ghost" onClick={logout}><LogOut />Déconnexion</Button></div>
    </div>
    <div className="my-6 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-muted-foreground"><Package className="size-5" />{catalog.length} produits</div><Button onClick={() => { setDraft({ id: crypto.randomUUID(), name: "", category: "legume", price: 0, stock: 0, unit: "kg", image: "", description: "" }); setPreview(""); setError(""); }}><Plus />Ajouter un produit</Button></div>
    <div className={`grid gap-8 ${draft ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]" : ""}`}>
      <div><Input aria-label="Rechercher un produit" placeholder="Rechercher un produit…" value={search} onChange={e => setSearch(e.target.value)} className="mb-4 max-w-md" />
      <ul className="divide-y divide-border">{catalog.filter(p => p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(p => <li key={p.id} className="flex items-center gap-4 py-4"><img src={p.image} alt={p.name} className="size-16 shrink-0 rounded-md object-cover" /><div className="min-w-0 flex-1"><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{formatFCFA(p.price)} / {p.unit} · Stock : {p.stock}</p></div><Button variant="outline" size="icon" title={`Modifier ${p.name}`} aria-label={`Modifier ${p.name}`} onClick={() => { const original = savedRows.find(r => r.id === p.id); setDraft({ ...p, image: original?.image ?? p.image }); setPreview(p.image); setError(""); }}><Pencil /></Button></li>)}</ul>
      </div>
      {draft && <form className="space-y-4 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" onSubmit={async e => {
        e.preventDefault(); setError("");
        const parsed = productInput.safeParse(draft);
        if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Vérifiez la fiche."); return; }
        setBusy(true);
        try { await save({ data: parsed.data }); await queryClient.invalidateQueries({ queryKey: ["catalog"] }); toast.success("Fiche produit enregistrée"); setDraft(null); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "Enregistrement impossible."); }
        finally { setBusy(false); }
      }}>
        <h2 className="text-2xl">{catalog.some(p => p.id === draft.id) ? "Modifier la fiche" : "Nouveau produit"}</h2>
        {preview && <img src={preview} alt="Photo du produit" className="aspect-[4/3] w-full rounded-md object-cover" />}
        <div><Label htmlFor="photo">Photo du produit</Label><div className="mt-2 flex items-center gap-2"><Upload className="size-4 text-leaf"/><Input id="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Choisissez une photo JPG, PNG ou WebP de moins de 5 Mo."); return; }
          setBusy(true); setError("");
          try {
            const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
            const { error: uploadError } = await supabase.storage.from("product-photos").upload(path, file);
            if (uploadError) throw new Error("Impossible d’ajouter cette photo.");
            const { data: signed } = await supabase.storage.from("product-photos").createSignedUrl(path, 3600);
            field("image", `storage:${path}`); setPreview(signed?.signedUrl ?? "");
          } catch (failure) { setError(failure instanceof Error ? failure.message : "Photo indisponible."); }
          finally { setBusy(false); }
        }} /></div></div>
        <div className="space-y-2"><Label htmlFor="name">Nom du produit</Label><Input id="name" required minLength={2} maxLength={100} value={draft.name} onChange={e => field("name", e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="category">Catégorie</Label><select id="category" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.category} onChange={e => field("category", e.target.value)}><option value="poisson">Poissons frais</option><option value="legume">Légumes frais</option><option value="epice">Épices</option></select></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="price">Prix (FCFA)</Label><Input id="price" type="number" required min={0} max={10000000} value={draft.price} onChange={e => field("price", Number(e.target.value))} /></div><div className="space-y-2"><Label htmlFor="unit">Unité</Label><select id="unit" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.unit} onChange={e => field("unit", e.target.value)}>{["kg", "pièce", "botte", "sachet", "boîte", "bouteille"].map(u => <option key={u}>{u}</option>)}</select></div></div>
        <div className="space-y-2"><Label htmlFor="stock">Stock disponible</Label><Input id="stock" type="number" required min={0} max={1000000} value={draft.stock} onChange={e => field("stock", Number(e.target.value))} /></div>
        <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" maxLength={1000} rows={3} value={draft.description} onChange={e => field("description", e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2"><Button type="submit" disabled={busy}><Save />{busy ? "Enregistrement…" : "Enregistrer"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}>Annuler</Button></div>
      </form>}
    </div>
  </section>;
}