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
export function mergeCatalog(rows: Product[]): Product[] {
  const merged = new Map(products.map(p => [p.id, p]));
  for (const row of rows) merged.set(row.id, row);
  return [...merged.values()];
}
export function assertAdminRole(allowed: boolean | null) {
  if (allowed !== true) throw new Error("Accès réservé à l’administrateur.");
}