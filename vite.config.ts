import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  // Rend les variables du fichier .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY…)
  // disponibles côté serveur via process.env.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) process.env[key] ??= value;

  return {
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: { port: 8080 },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Point d'entrée serveur : src/server.ts (gestion des erreurs SSR).
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      // Nitro produit le serveur de production (Node par défaut) lors du build.
      ...(command === "build" ? [nitro()] : []),
      viteReact(),
    ],
  };
});
