import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { productInput, assertAdminRole } from "./catalog-shared";

export const readCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
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
  return await Promise.all((data ?? []).map(async row => {
    const product = productInput.parse(row);
    let displayImage = product.image;
    if (product.image.startsWith("storage:")) {
      const { data: photo } = await client.storage.from("product-photos").createSignedUrl(product.image.slice(8), 3600);
      if (photo) displayImage = photo.signedUrl.replace(url, import.meta.env["VITE_SUPABASE_URL"] || url);
    }
    return { ...product, displayImage };
  }));
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