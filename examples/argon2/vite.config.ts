import { vavite } from "vavite";
import { defineConfig } from "vite";
import { standalone } from "vite-plugin-standalone";

export default defineConfig({
  plugins: [
    vavite({
      handlerEntry: "/src/server.ts",
      serveClientAssetsInDev: true,
    }),
    standalone({
      entry: {
        worker: "./src/worker.js",
      },
    }),
  ],
});
