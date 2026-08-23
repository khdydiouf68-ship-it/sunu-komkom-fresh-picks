import { products } from "./products";

export const LIVRAISON_FCFA = 1500;

export type OrderLine = { id: string; name: string; qty: number; unitPrice: number; total: number };

/** Recalcule les prix côté serveur à partir du catalogue — jamais depuis le client. */
export function buildOrderLines(lines: Array<{ id: string; qty: number }>) {
  const items: OrderLine[] = [];
  for (const line of lines) {
    const product = products.find((p) => p.id === line.id);
    if (!product) continue;
    const qty = Math.min(Math.max(Math.trunc(line.qty), 1), 50);
    items.push({
      id: product.id,
      name: product.name,
      qty,
      unitPrice: product.price,
      total: product.price * qty,
    });
  }
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  return { items, subtotal };
}

export function makeReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SK-${stamp}-${rand}`;
}
