import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
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

