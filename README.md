# vite-plugin-standalone

A vite plugin, that uses [@vercel/nft](https://github.com/vercel/nft) and esbuild to create a standalone server build. Using this plugin, no node_modules is required for deployment, only the build folder need to be copied.

Native dependencies need to be manually set in `options.native` - the defaults are `sharp`, `@prisma/client`, `@node-rs/argon2`