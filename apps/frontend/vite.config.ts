import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Primora",
        short_name: "Primora",
        description:
          "Self-hosted backend console: storage, collections, API keys, audit logs.",
        theme_color: "#0b0d11",
        background_color: "#0b0d11",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cache the app shell only. /api, /auth and /mailpit are live backends —
        // never let a service worker answer for them.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/(api|auth|mailpit)(\/|$)/],
        runtimeCaching: [
          {
            urlPattern: /\/(api|auth|mailpit)(\/|$)/,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.FRONTEND_PORT ?? 3000),
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.FRONTEND_PORT ?? 3000),
  },
  build: {
    target: "esnext",
  },
});
