import { vavite } from "vavite";
import { defineConfig } from "vite";
import { standalone } from "vite-plugin-standalone";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        worker: "./src/worker.ts",
      },
    },
  },
  plugins: [
    vavite({
      handlerEntry: "/src/server.ts",
      serveClientAssetsInDev: true,
    }),
    standalone(),
  ],
});
