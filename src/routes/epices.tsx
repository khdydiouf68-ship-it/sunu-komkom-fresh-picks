import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/products";

export const Route = createFileRoute("/epices")({
  head: () => ({
    meta: [
      { title: "Épices & assaisonnement — Sunu KomKom" },
      {
        name: "description",
        content: "Jumbo, Arôme et assaisonnements pour parfumer vos plats sénégalais.",
      },
      { property: "og:title", content: "Épices & assaisonnement — Sunu KomKom" },
      {
        property: "og:description",
        content: "Cubes d'assaisonnement et sauces parfumées, livrés à Dakar.",
      },
    ],
  }),
  component: EpicesPage,
});

function EpicesPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-4xl">Épices & assaisonnement</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Les saveurs qui font la cuisine sénégalaise : cubes d'assaisonnement et sauces
        parfumées pour rehausser tous vos plats.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {getProducts("epice").map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
