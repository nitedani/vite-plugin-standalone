import { Sema } from 'async-sema';
import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { Plugin, searchForWorkspaceRoot } from 'vite';

function assert(condition: unknown, debugInfo?: unknown): asserts condition {
  if (condition) return;

  const debugStr = (() => {
    if (!debugInfo) {
      return null;
    }
    const debugInfoSerialized =
      typeof debugInfo === 'string' ? debugInfo : JSON.stringify(debugInfo);
    return `Debug info (for vite-plugin-standalone maintainers; you can ignore this): ${debugInfoSerialized}`;
  })();

  let errMsg = [
    `You stumbled upon a bug in vite-plugin-standalone's source code.`,
    `Go to https://github.com/nitedani/vite-plugin-standalone and copy-paste this error.`,
    debugStr,
  ]
    .filter(Boolean)
    .join(' ');

  throw new Error(errMsg);
}

type StandaloneOptions = {
  external?: string[];
  entry?: string | string[];
};

export const standalone = (options: StandaloneOptions = {}): Plugin => {
  let root = '';
  let outDir = '';
  let outDirAbs = '';
  let rollupEntryFilePaths: string[];
  let rollupResolve: any;
  // Native dependencies always need to be esbuild external
  let native: string[] = [
    'sharp',
    '@generated/prisma',
    '@prisma/client',
    '@node-rs/argon2',
    ...(options.external ?? []),
  ];

  // https://github.com/nestjs/nest-cli/blob/edbd64d1eb186c49c28b7594e5d8269a5b125385/lib/compiler/defaults/webpack-defaults.ts#L69
  const lazyNpmImports = [
    '@nestjs/microservices',
    '@nestjs/websockets',
    'cache-manager',
    'class-validator',
    'class-transformer',
  ];

  const entriesProvided = options.entry ?? [];
  const entriesResolved: { [name: string]: string } = {};
  for (const entry of [entriesProvided].flat()) {
    const name = getEntryName(entry);
    entriesResolved[name] = entry;
  }

  return {
    name: 'vite-plugin-standalone',
    apply(_, env) {
      //@ts-expect-error Vite 5 || Vite 4
      return !!(env.isSsrBuild || env.ssrBuild);
    },
    enforce: 'post',
    config(config, env) {
      return {
        ssr: {
          noExternal: ['@brillout/picocolors'],
          external: native,
        },
        optimizeDeps: {
          exclude: native,
        },
        build: {
          rollupOptions: {
            // add extra entries for server-only usage
            // for example child_process.fork
            input: entriesResolved,
          },
        },
      };
    },
    buildStart() {
      rollupResolve = this.resolve.bind(this);
    },
    async configResolved(config) {
      root = toPosixPath(config.root);
      outDir = toPosixPath(config.build.outDir);
      outDirAbs = path.posix.join(root, outDir);
    },
    writeBundle(_, bundle) {
      const entries = findRollupBundleEntries(bundle);
      const serverIndex = entries.find(e => e.name === 'index');
      assert(serverIndex);
      rollupEntryFilePaths = entries.map(e =>
        path.posix.join(outDirAbs, e.fileName),
      );
    },
    async closeBundle() {
      const bundledEntryPaths: string[] = [];
      for (const entryFilePath of rollupEntryFilePaths) {
        try {
          await fs.stat(entryFilePath);
        } catch {
          // the entry was bundled in the previous iteration
          continue;
        }

        const res = await esbuild.build({
          platform: 'node',
          format: 'esm',
          bundle: true,
          external: native,
          entryPoints: { index: entryFilePath },
          outfile: entryFilePath,
          allowOverwrite: true,
          metafile: true,
          banner: {
            js: [
              "import { dirname as dirname987 } from 'path';",
              "import { fileURLToPath as fileURLToPath987 } from 'url';",
              "import { createRequire as createRequire987 } from 'module';",
              'var require = createRequire987(import.meta.url);',
              'var __filename = fileURLToPath987(import.meta.url);',
              'var __dirname = dirname987(__filename);',
            ].join('\n'),
          },
          plugins: [
            {
              name: 'standalone-ignore',
              setup(build) {
                build.onResolve(
                  { filter: /.*/, namespace: 'ignore' },
                  args => ({
                    path: args.path,
                    namespace: 'ignore',
                  }),
                );

                build.onResolve(
                  { filter: new RegExp(`^(${lazyNpmImports.join('|')})`) },
                  async args => {
                    const resolved = await rollupResolve(args.path);
                    if (!resolved) {
                      return {
                        path: args.path,
                        namespace: 'ignore',
                      };
                    }
                  },
                );

                build.onLoad({ filter: /.*/, namespace: 'ignore' }, () => ({
                  contents: '',
                }));
              },
            },
          ],
        });

        // The inputs of the bundled files are safe to remove
        const filesToRemove = Object.keys(res.metafile.inputs).filter(
          relativeFile =>
            !entryFilePath.endsWith(relativeFile) &&
            relativeFile.startsWith(outDir),
        );
        for (const relativeFile of filesToRemove) {
          await fs.rm(path.posix.join(root, relativeFile));
        }

        // Remove leftover empty dirs
        const relativeDirs = unique(
          filesToRemove.map(file => path.dirname(file)),
        );
        for (const relativeDir of relativeDirs) {
          const absDir = path.posix.join(root, relativeDir);
          const files = await fs.readdir(absDir);
          if (!files.length) {
            await fs.rm(absDir, { recursive: true });
          }
        }

        bundledEntryPaths.push(entryFilePath);
      }

      const base = toPosixPath(searchForWorkspaceRoot(root));
      const relativeRoot = path.posix.relative(base, root);
      const relativeOutDir = path.posix.join(relativeRoot, outDir);

      for (const entryFilePath of bundledEntryPaths) {
        const { nodeFileTrace } = await import('@vercel/nft');
        const result = await nodeFileTrace([entryFilePath], {
          base,
        });

        const tracedDeps = new Set<string>();
        for (const file of result.fileList) {
          if (result.reasons.get(file)?.type.includes('initial')) {
            continue;
          }
          tracedDeps.add(toPosixPath(file));
        }

        const files = [...tracedDeps].filter(
          path => !path.startsWith(relativeOutDir) && !path.startsWith('usr/'),
        );

        // We are done, no native dependencies need to be copied
        if (!files.length) {
          return;
        }

        if (result.warnings.size && isYarnPnP()) {
          throw new Error(
            'Standalone build is not supported when using Yarn PnP and native dependencies.',
          );
        }

        const commonAncestor = findCommonAncestor(files);
        const copySema = new Sema(10, { capacity: files.length });

        const copiedFiles = new Set<string>();
        await Promise.all(
          files.map(async relativeFile => {
            await copySema.acquire();
            const tracedFilePath = path.posix.join(base, relativeFile);
            const isNodeModules = relativeFile.includes('node_modules');

            relativeFile = relativeFile
              .replace(relativeRoot, '')
              .replace(commonAncestor, '');
            const relativeFileHoisted = `node_modules${relativeFile
              .split('node_modules')
              .pop()}`;
            const fileOutputPath = path.posix.join(
              outDirAbs,
              isNodeModules ? relativeFileHoisted : relativeFile,
            );
            const isDir = (await fs.stat(tracedFilePath)).isDirectory();

            if (!isDir && !copiedFiles.has(fileOutputPath)) {
              copiedFiles.add(fileOutputPath);
              await fs.cp(await fs.realpath(tracedFilePath), fileOutputPath, {
                recursive: true,
              });
            }

            copySema.release();
          }),
        );
      }
    },
  };
};

function toPosixPath(path: string): string {
  const pathPosix = path.split('\\').join('/');
  return pathPosix;
}

function findRollupBundleEntries<
  OutputBundle extends Record<string, { name: string | undefined }>,
>(bundle: OutputBundle): OutputBundle[string][] {
  const entries: OutputBundle[string][] = [];
  for (const key in bundle) {
    // https://github.com/brillout/vite-plugin-ssr/issues/612
    if (key.endsWith('.map') || key.endsWith('.json')) continue;
    const entry = bundle[key]!;
    if ('isEntry' in entry && entry.isEntry) {
      entries.push(entry);
    }
  }
  return entries.sort((a, b) => {
    const isIndexA = a.name === 'index';
    const isIndexB = a.name === 'index';

    if (isIndexA) {
      return -1;
    }

    if (isIndexB) {
      return 1;
    }

    return 0;
  });
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
function findCommonAncestor(paths: string[]) {
  // There is no common anchestor of 0 or 1 path
  if (paths.length <= 1) {
    return '';
  }

  // Split each path into its components
  const pathsComponents = paths.map(path => path.split('/'));

  let commonAncestor = '';
  let index = 0;

  assert(pathsComponents.length, { paths });

  // While there is a common component at the current index
  while (
    pathsComponents.every(
      components => components[index] === pathsComponents[0]![index],
    )
  ) {
    // Add the common component to the common ancestor path
    commonAncestor += pathsComponents[0]![index] + '/';
    index++;
  }

  // If no common ancestor was found, return an empty string
  if (commonAncestor === '') {
    return '';
  }

  // Otherwise, return the common ancestor path, removing the trailing slash
  return commonAncestor.slice(0, -1);
}

function isYarnPnP(): boolean {
  try {
    require('pnpapi');
    return true;
  } catch {
    return false;
  }
}

export const getEntryName = (input: string) => {
  const m = /([^\\\/]+)$/.exec(input);
  if (!m?.[1]) {
    throw new Error('workers should be an array of relative paths');
  }
  return m[1].split('.')[0]!;
};
