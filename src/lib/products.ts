import thiof from "@/assets/p/thiof.jpg";
import tilapia from "@/assets/p/tilapia.jpg";
import dorade from "@/assets/p/dorade.jpg";
import sardine from "@/assets/p/sardine.jpg";
import maquereau from "@/assets/p/maquereau.jpg";
import tomate from "@/assets/p/tomate.jpg";
import oignon from "@/assets/p/oignon.jpg";
import pommeDeTerre from "@/assets/p/pomme-de-terre.jpg";
import carotte from "@/assets/p/carotte.jpg";
import chou from "@/assets/p/chou.jpg";
import poivron from "@/assets/p/poivron.jpg";
import aubergine from "@/assets/p/aubergine.jpg";

export type Category = "poisson" | "legume";

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number; // FCFA par kg
  unit: string;
  stock: number; // kg disponibles
  image: string;
  description: string;
};

export const products: Product[] = [
  {
    id: "thiof",
    name: "Thiof",
    category: "poisson",
    price: 7500,
    unit: "kg",
    stock: 18,
    image: thiof,
    description: "Le poisson noble des côtes sénégalaises, parfait pour le tiep bou dienn.",
  },
  {
    id: "tilapia",
    name: "Tilapia",
    category: "poisson",
    price: 2500,
    unit: "kg",
    stock: 32,
    image: tilapia,
    description: "Chair tendre et douce, idéal grillé ou en sauce.",
  },
  {
    id: "dorade",
    name: "Dorade",
    category: "poisson",
    price: 4800,
    unit: "kg",
    stock: 24,
    image: dorade,
    description: "Chair fine et délicate, excellente au feu de bois.",
  },
  {
    id: "sardine",
    name: "Sardine",
    category: "poisson",
    price: 1200,
    unit: "kg",
    stock: 45,
    image: sardine,
    description: "Pêche du jour, riche en oméga-3 et pleine de goût.",
  },
  {
    id: "maquereau",
    name: "Maquereau",
    category: "poisson",
    price: 2000,
    unit: "kg",
    stock: 28,
    image: maquereau,
    description: "Savoureux et généreux, parfait braisé au yassa.",
  },
  {
    id: "tomate",
    name: "Tomates",
    category: "legume",
    price: 1200,
    unit: "kg",
    stock: 60,
    image: tomate,
    description: "Tomates mûres et juteuses récoltées dans les Niayes.",
  },
  {
    id: "oignon",
    name: "Oignons",
    category: "legume",
    price: 800,
    unit: "kg",
    stock: 90,
    image: oignon,
    description: "Oignons locaux fermes, base de toutes nos sauces.",
  },
  {
    id: "pomme-de-terre",
    name: "Pommes de terre",
    category: "legume",
    price: 900,
    unit: "kg",
    stock: 75,
    image: pommeDeTerre,
    description: "Pommes de terre fermes, parfaites frites ou en ragoût.",
  },
  {
    id: "carotte",
    name: "Carottes",
    category: "legume",
    price: 1000,
    unit: "kg",
    stock: 50,
    image: carotte,
    description: "Carottes croquantes et sucrées, fraîchement récoltées.",
  },
  {
    id: "chou",
    name: "Choux",
    category: "legume",
    price: 700,
    unit: "pièce",
    stock: 40,
    image: chou,
    description: "Choux verts bien pommés, ferme et croquant.",
  },
  {
    id: "poivron",
    name: "Poivrons",
    category: "legume",
    price: 1500,
    unit: "kg",
    stock: 30,
    image: poivron,
    description: "Poivrons verts brillants pour relever vos plats.",
  },
  {
    id: "aubergine",
    name: "Aubergines",
    category: "legume",
    price: 1100,
    unit: "kg",
    stock: 35,
    image: aubergine,
    description: "Aubergines violettes charnues, cultivées localement.",
  },
];

export const formatFCFA = (value: number) =>
  `${value.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} FCFA`;

export const getProducts = (category?: Category) =>
  category ? products.filter((p) => p.category === category) : products;
