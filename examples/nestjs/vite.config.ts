import { defineConfig, Plugin } from "vite";
import { vavite } from "vavite";
import { createFilter } from "@rollup/pluginutils";
import type { Options } from "@swc/core";
import { standalone } from "vite-plugin-standalone";
import { transform } from "@swc/core";

function swc(options: Options): Plugin {
  const config: Options = {
    ...options,
  };
  const cleanUrl = (url: string) =>
    url.replace(/#.*$/, "").replace(/\?.*$/, "");
  const filter = createFilter(/\.(tsx?|jsx)$/, /\.js$/);
  return {
    name: "rollup-plugin-swc",
    enforce: "pre",
    async transform(code, id) {
      if (filter(id) || filter(cleanUrl(id))) {
        const result = await transform(code, {
          ...config,
          filename: id,
          sourceMaps: true,
        });
        return {
          code: result.code,
          map: result.map && JSON.parse(result.map),
        };
      }
    },
  };
}

export default defineConfig({
  ssr: {
    external: ["reflect-metadata"],
  },
  esbuild: false,
  plugins: [
    swc({
      minify: false,
      sourceMaps: true,
      jsc: {
        keepClassNames: true,
        parser: {
          syntax: "typescript",
          dynamicImport: true,
          decorators: true,
          tsx: true,
        },
        target: "es2021",
        transform: {
          // important for nestjs
          decoratorMetadata: true,
          legacyDecorator: true,
        },
      },
    }),
    vavite({
      handlerEntry: "/src/main.ts",
      serveClientAssetsInDev: true,
    }),
    standalone(),
  ],
});
