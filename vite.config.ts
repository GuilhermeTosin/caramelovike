import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import vike from "vike/plugin";

export default defineConfig({
  plugins: [react(), vike()],
  build: {
    // react-snap usa Chromium antigo; manter target mais compatível evita
    // "Unexpected token '?'" durante o prerender.
    target: "es2019",
    sourcemap: true,
    rollupOptions: {
      output: {
        // Reduz o tamanho do .map e evita respostas truncadas em alguns proxies/CDNs.
        sourcemapExcludeSources: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ['.e2b.app'],
    host: "0.0.0.0",
  },
  preview: {
    host: "0.0.0.0",
  },
});
