import { z } from "zod";
import { products, type Product } from "./products";

export const productInput = z.object({
  id: z.string().min(1).max(60),
  name: z.string().trim().min(2).max(100),
  category: z.enum(["poisson", "legume", "epice"]),
  price: z.number().int().min(0).max(10000000),
  unit: z.string().trim().min(1).max(30),
  stock: z.number().int().min(0).max(1000000),
  image: z.string().min(1).max(2000).refine(v => v.startsWith("storage:") || v.startsWith("/assets/") || /^https:\/\//.test(v), "Photo invalide"),
  description: z.string().trim().max(1000),
});
export type ManagedProduct = z.infer<typeof productInput>;
/**
 * Fusionne les produits de départ (products.ts) avec ceux de la base.
 * Une ligne marquée `hidden` (produit supprimé dans l'admin) retire le produit,
 * même s'il fait partie des produits de départ.
 */
export function mergeCatalog(rows: Array<Product & { hidden?: boolean }>): Product[] {
  const merged = new Map(products.map(p => [p.id, p]));
  for (const { hidden, ...row } of rows) {
    if (hidden) merged.delete(row.id);
    else merged.set(row.id, row);
  }
  return [...merged.values()];
}
export function assertAdminRole(allowed: boolean | null) {
  if (allowed !== true) throw new Error("Accès réservé à l’administrateur.");
}