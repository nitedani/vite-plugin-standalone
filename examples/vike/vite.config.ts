import react from "@vitejs/plugin-react";
import ssr from "vike/plugin";
import { UserConfig } from "vite";
import { vavite } from "vavite";
import { standalone } from "vite-plugin-standalone";
const config: UserConfig = {
  plugins: [
    vavite({
      serverEntry: "/server/index.ts",
      serveClientAssetsInDev: true,
    }),
    react(),
    standalone({
      entry: {
        worker: "./server/worker.js",
      },
    }),
    ssr({ disableAutoFullBuild: true }),
  ],
};

export default config;
