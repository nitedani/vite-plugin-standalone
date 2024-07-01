import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { UserConfig } from "vite";
import { viteNode } from "@nitedani/vite-plugin-node/plugin";
const config: UserConfig = {
  plugins: [
    react(),
    viteNode({
      entry: {
        index: "./server/index.ts",
        worker: "./server/worker.js",
      },
      standalone: true,
    }),
    vike({ disableAutoFullBuild: true }),
  ],
};

export default config;
