import { toast } from "sonner";
import { Plus } from "lucide-react";
import { formatFCFA, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="aspect-square overflow-hidden bg-sand">
        <img
          src={product.image}
          alt={product.name}
          width={640}
          height={640}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <span className="whitespace-nowrap font-semibold text-leaf">
            {formatFCFA(product.price)}
            <span className="text-xs font-normal text-muted-foreground">/{product.unit}</span>
          </span>
        </div>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">{product.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Disponible : {product.stock} {product.unit === "pièce" ? "pièces" : "kg"}
        </p>
        <button
          onClick={() => {
            add(product.id);
            toast.success(`${product.name} ajouté au panier`);
          }}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Ajouter au panier
        </button>
      </div>
    </article>
  );
}
