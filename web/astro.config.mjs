import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Sitio 100 % estático: `pnpm build` → dist/ servible desde cualquier hosting o en local.
// BASE permite publicar en un subdirectorio (p. ej. GitHub Pages: BASE=/observatorio/).
export default defineConfig({
  output: "static",
  base: process.env.BASE ?? "/",
  integrations: [react()],
  build: { inlineStylesheets: "auto" },
  vite: { build: { chunkSizeWarningLimit: 900 } },
});
