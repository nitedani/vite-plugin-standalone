# vite-plugin-standalone

A vite plugin, that uses [@vercel/nft](https://github.com/vercel/nft) and esbuild to create a standalone server build. Using this plugin, no node_modules is required for deployment, only the build folder need to be copied.

## Options:
### `external?: string[]`
Packages can be excluded from bundling by setting  `options.external` - the defaults are `sharp`, `@prisma/client`, `@node-rs/argon2`<br/>
Native dependencies(that import .so, .dll, .node files) always need to be external.
Externals are analyzed and the necessary files are copied to the output directory, next to the javascript bundle. Adding packages to `options.external` will still produce a standalone build, it only means that these packages will be copied to the output directory, instead of bundled.

### `entry?: string | { [name: string]: string };`
By default `vite-plugin-standalone` will try to detect the entry file of your application.
If `entry.index` is set, the plugin will not try to detect it. Multiple entries are supported. For each defined entry, a separate bundle file is created in your build directory.<br/>
example:
```js
standalone({
    entry:{
        index: "./server/index.ts",
        worker: "./server/worker.js"
    }
})
```