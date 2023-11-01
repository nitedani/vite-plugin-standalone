import { defineConfig } from "vite";
import rakkas from "rakkasjs/vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import { standalone } from "vite-plugin-standalone";

export default defineConfig({
  plugins: [tsconfigPaths(), rakkas(), standalone()],
});
