import { existsSync, readFileSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { builtinModules } from 'module';
import { join, dirname } from 'path';
export const standalone = () => {
    let root = '';
    let outDir = '';
    const external = [...builtinModules, ...builtinModules.map(m => `node:${m}`)];
    const noExternalRegex = new RegExp(`^(?!(${external.join('|')})$)`);
    return {
        name: 'vite-plugin-standalone',
        apply(config, env) {
            return !!env.ssrBuild;
        },
        enforce: 'post',
        config(config, env) {
            return {
                ssr: {
                    external: ['sharp', ...external],
                    noExternal: noExternalRegex,
                },
            };
        },
        configResolved(config) {
            root = config.root;
            outDir = config.build.outDir;
        },
        async closeBundle() {
            const outDirAbs = join(root, outDir);
            const entryNames = ['index.js', 'main.js', 'index.mjs', 'main.mjs'];
            const entry = entryNames
                .map(e => join(outDirAbs, e))
                .find(e => existsSync(e));
            if (!entry) {
                return;
            }
            const { default: ncc } = await import('@vercel/ncc');
            const { code, map, assets } = await ncc(entry, {
                // provide a custom cache path or disable caching
                // cache: './custom/cache/path' | false,
                // externals to leave as requires of the build
                // externals: ['externalpackage'],
                externals: external,
                // directory outside of which never to emit assets
                // filterAssetBase: join(cwd(), "..", "..", "..", ".."),
                // minify: false, // default
                // sourceMap: false, // default
                assetBuilds: true, // default
                // sourceMapBasePrefix: '../', // default treats sources as output-relative
                // when outputting a sourcemap, automatically include
                // source-map-support in the output file (increases output by 32kB).
                // sourceMapRegister: true, // default
                // watch: false, // default
                // license: '', // default does not generate a license file
                // target: 'es2015', // default
                // v8cache: false, // default
                // quiet: false, // default
                // debugLog: false, // default
            });
            const banner = `
import { dirname as dirname2 } from 'path';
import { fileURLToPath as fileURLToPath2 } from 'url';
import { createRequire as createRequire2 } from 'module';
var __filename = fileURLToPath2(import.meta.url);
var __dirname = dirname2(__filename);
var require = createRequire2(import.meta.url);
      `;
            await writeFile(entry, banner + code);
            for (const [key, value] of Object.entries(assets)) {
                let fname = key;
                if (fname && value && typeof value === 'object' && 'source' in value) {
                    if (fname === 'package.json') {
                        continue;
                    }
                    if (fname.endsWith('schema.prisma')) {
                        const last = fname.split('/').pop();
                        if (last) {
                            fname = last;
                        }
                    }
                    if (fname.includes('libquery')) {
                        const last = fname.split('/').pop();
                        if (last) {
                            fname = last;
                        }
                    }
                    const loc = fname.indexOf('node_modules');
                    if (loc) {
                        fname = fname.substring(loc);
                    }
                    try {
                        await mkdir(dirname(join(outDirAbs, fname)), { recursive: true });
                    }
                    catch (error) { }
                    await writeFile(join(outDirAbs, fname), value.source);
                }
            }
            // TODO: @vercel/nft doesn't detect prisma dependencies in the context of a pnpm monorepo
            //   const { nodeFileTrace } = await import('@vercel/nft');
            //   const { fileList } = await nodeFileTrace([entry]);
            //   const toCopy = [...fileList].filter(f => !f.startsWith(outDir));
            //   console.log(fileList);
            // for (const file of toCopy) {
            //     const dest = join(outDirAbs, file);
            //     if (statSync(file).isDirectory()) {
            //         continue;
            //     }
            //     // const dir = isFile ? dirname(dest) : dest;
            //     try {
            //         await mkdir(dirname(dest), { recursive: true });
            //     }
            //     catch (error) { }
            //     await copyFile(file, dest);
            // }
            const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
            const packageJsonNew = {
                name: packageJson.name,
                version: packageJson.version,
                type: 'module',
                private: true,
                scripts: packageJson.scripts,
            };
            await writeFile(join(outDirAbs, 'package.json'), JSON.stringify(packageJsonNew, null, 2));
        },
    };
};
