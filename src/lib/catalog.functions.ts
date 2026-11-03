import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { productInput, assertAdminRole, type ManagedProduct } from "./catalog-shared";
import { products as staticProducts } from "./products";

export const readCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
  if (!key || !url) throw new Error("Catalogue indisponible.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from("products").select("id,name,category,price,unit,stock,image,description").eq("active", true).order("name");
  if (error) throw new Error("Impossible de charger les produits.");
  const visible: CatalogRow[] = await Promise.all((data ?? []).map(async row => {
    const product = productInput.parse(row);
    let displayImage = product.image;
    if (product.image.startsWith("storage:")) {
      const { data: photo } = await client.storage.from("product-photos").createSignedUrl(product.image.slice(8), 3600);
      if (photo) displayImage = photo.signedUrl.replace(url, import.meta.env["VITE_SUPABASE_URL"] || url);
    }
    return { ...product, displayImage };
  }));

  // Produits supprimés depuis l'admin (active = false) : invisibles avec la clé publique,
  // on les lit avec la clé serveur pour les retirer aussi des produits de départ.
  let hidden: CatalogRow[] = [];
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inactive } = await supabaseAdmin.from("products").select("id").eq("active", false);
    hidden = (inactive ?? []).map(({ id }) => ({ ...hiddenPlaceholder, id, hidden: true }));
  } catch {
    // Clé serveur absente : on ne connaît que les produits actifs.
  }
  return [...visible, ...hidden];
});

export type CatalogRow = ManagedProduct & { displayImage: string; hidden?: boolean };
const hiddenPlaceholder: Omit<CatalogRow, "id"> = { name: "", category: "legume", price: 0, unit: "", stock: 0, image: "", description: "", displayImage: "" };

/** « Supprime » un produit : il est masqué de la boutique (active = false), l'historique des commandes reste intact. */
export const deleteProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    assertAdminRole(allowed);
    const { data: existing } = await context.supabase.from("products").select("id").eq("id", data.id).maybeSingle();
    if (existing) {
      const { error } = await context.supabase.from("products").update({ active: false }).eq("id", data.id);
      if (error) throw new Error("Impossible de supprimer ce produit.");
      return { id: data.id };
    }
    // Produit de départ jamais modifié : on crée sa ligne directement masquée.
    const original = staticProducts.find(p => p.id === data.id);
    if (!original) throw new Error("Produit introuvable.");
    const { error } = await context.supabase.from("products").insert({ ...original, active: false });
    if (error) throw new Error("Impossible de supprimer ce produit.");
    return { id: data.id };
  });

export const checkAdmin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error("Impossible de vérifier votre accès.");
  return data === true;
});

export const saveProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    assertAdminRole(allowed);
    const { error } = await context.supabase.from("products").upsert(data);
    if (error) throw new Error("Impossible d’enregistrer la fiche produit.");
    return { id: data.id };
  });