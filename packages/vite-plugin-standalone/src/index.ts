import { Sema } from 'async-sema';
import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { Plugin, ResolvedConfig, searchForWorkspaceRoot } from 'vite';
import { createRequire } from 'module';
import { assert, assertUsage } from './assert.js';
import { injectRollupInputs } from './injectRollupInput.js';

const require_ = createRequire(import.meta.url);

export type StandaloneOptions = {
  external?: string[];
  entry?: string | { [name: string]: string };
  esbuild?: esbuild.BuildOptions;
};

export type StandaloneOptionsResolved = {
  external: string[];
  entry: { [name: string]: string };
  autoDetect: boolean;
  esbuild: esbuild.BuildOptions;
};

export const standalone = (options?: StandaloneOptions): Plugin => {
  const resolvedOptions = resolveOptions(options);
  let configResolved: ResolvedConfig;

  let root = '';
  let outDir = '';
  let outDirAbs = '';
  let rollupEntryFilePaths: string[] = [];
  let rollupResolve: any;
  // Native dependencies always need to be esbuild external
  let native: string[] = [
    'sharp',
    '@generated/prisma',
    '@prisma/client',
    '@node-rs/*',
    ...resolvedOptions.external,
  ];

  // https://github.com/nestjs/nest-cli/blob/edbd64d1eb186c49c28b7594e5d8269a5b125385/lib/compiler/defaults/webpack-defaults.ts#L69
  const lazyNpmImports = [
    '@nestjs/microservices',
    '@nestjs/websockets',
    'cache-manager',
    'class-validator',
    'class-transformer',
  ];
  return {
    name: 'vite-plugin-standalone',
    apply(_, env) {
      return !!env.isSsrBuild;
    },
    enforce: 'post',
    config(config, env) {
      return {
        environments: {
          ssr: {
            resolve: { external: native, noExternal: ['@brillout/picocolors'] },
          },
          client: {
            resolve: { external: native, noExternal: ['@brillout/picocolors'] },
          },
        },
        ssr: {
          noExternal: ['@brillout/picocolors'],
          external: native,
        },
        optimizeDeps: {
          exclude: native,
        },
      };
    },
    buildStart() {
      rollupResolve = this.resolve.bind(this);
    },
    async configResolved(config) {
      configResolved = config;
      root = toPosixPath(config.root);
      outDir = toPosixPath(config.build.outDir);
      outDirAbs = path.posix.join(root, outDir);

      if (options?.entry) {
        const entries = Object.entries(resolvedOptions.entry);
        const resolvedEntries: { [name: string]: string } = {};
        for (const [name, path_] of entries) {
          let entryFilePath = path.join(config.root, path_);
          try {
            resolvedEntries[name] = require_.resolve(entryFilePath);
          } catch (err) {
            assert(
              (err as Record<string, unknown>).code === 'MODULE_NOT_FOUND',
            );
            assertUsage(
              false,
              `No file found at ${entryFilePath}. Does the value ${options.entry} of options.entry point to an existing file?`,
            );
          }
        }

        config.build.rollupOptions.input = injectRollupInputs(
          resolvedEntries,
          config,
        );
      }
    },
    writeBundle(_, bundle) {
      const entries = findRollupBundleEntries(bundle, resolvedOptions, root);
      rollupEntryFilePaths = entries.map(e =>
        path.posix.join(outDirAbs, e.fileName),
      );
    },
    async closeBundle() {
      const base = toPosixPath(searchForWorkspaceRoot(root));
      const relativeRoot = path.posix.relative(base, root);
      const relativeOutDir = path.posix.join(relativeRoot, outDir);

      const res = await esbuild.build({
        platform: 'node',
        format: 'esm',
        bundle: true,
        external: native,
        entryPoints: rollupEntryFilePaths,
        sourcemap:
          configResolved.build.sourcemap === 'hidden'
            ? true
            : configResolved.build.sourcemap,
        splitting: rollupEntryFilePaths.length > 1,
        outdir: outDirAbs,
        logOverride: {
          'ignored-bare-import': 'silent',
        },
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
              build.onResolve({ filter: /.*/, namespace: 'ignore' }, args => ({
                path: args.path,
                namespace: 'ignore',
              }));

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
        allowOverwrite: true,
        ...resolvedOptions.esbuild,
        metafile: true,
      });

      // Restore the original file extensions
      for (const [key, value] of Object.entries(res.metafile.outputs)) {
        if (!value.entryPoint) {
          continue;
        }
        const originalEntryPath = path.join(root, value.entryPoint);
        const shouldRename = rollupEntryFilePaths.some(
          entry => entry === originalEntryPath,
        );
        if (!shouldRename) {
          continue;
        }
        const oldPath = path.join(root, key);
        if (oldPath === originalEntryPath) {
          continue;
        }

        await fs.rename(oldPath, originalEntryPath);
      }

      // The inputs of the bundled files are safe to remove from the outDir folder
      const bundledFilesFromOutDir = Object.keys(res.metafile.inputs).filter(
        relativeFile =>
          !rollupEntryFilePaths.some(entryFilePath =>
            entryFilePath.endsWith(relativeFile),
          ) && relativeFile.startsWith(outDir),
      );

      for (const relativeFile of bundledFilesFromOutDir) {
        await fs.rm(path.posix.join(root, relativeFile));
        if (![false, 'inline'].includes(configResolved.build.sourcemap)) {
          await fs.rm(path.posix.join(root, `${relativeFile}.map`));
        }
      }

      // Remove leftover empty dirs
      const relativeDirs = new Set(
        bundledFilesFromOutDir.map(file => path.dirname(file)),
      );

      for (const relativeDir of relativeDirs) {
        const absDir = path.posix.join(root, relativeDir);
        const files = await fs.readdir(absDir);
        if (!files.length) {
          await fs.rm(absDir, { recursive: true });
          // add parent dir if we are inside outDir
          if (relativeDir.startsWith(outDir)) {
            relativeDirs.add(path.dirname(relativeDir));
          }
        }
      }

      const { nodeFileTrace } = await import('@vercel/nft');
      const result = await nodeFileTrace(rollupEntryFilePaths, {
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
        path =>
          !path.startsWith(relativeOutDir) &&
          // false detection
          !path.startsWith('usr/'),
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
    },
  };
};

function toPosixPath(path: string): string {
  const pathPosix = path.split('\\').join('/');
  return pathPosix;
}

function findRollupBundleEntries<
  OutputBundle extends Record<
    string,
    { name: string | undefined; fileName: string | undefined }
  >,
>(
  bundle: OutputBundle,
  standaloneConfig: StandaloneOptionsResolved,
  root: string,
): OutputBundle[string][] {
  assert(standaloneConfig?.entry);

  const remainingEntries = new Set(
    Object.values(standaloneConfig.entry).map(entryPath =>
      path.posix.join(root, entryPath),
    ),
  );
  const len = remainingEntries.size;
  const entries: OutputBundle[string][] = [];

  // Try to precisely find the entries
  for (const key in bundle) {
    const entry = bundle[key]!;

    if (
      !('facadeModuleId' in entry) ||
      // https://github.com/brillout/vite-plugin-ssr/issues/612
      key.endsWith('.map') ||
      key.endsWith('.json')
    )
      continue;
    assert(
      entry.facadeModuleId === null || typeof entry.facadeModuleId === 'string',
    );

    if (entry.facadeModuleId && remainingEntries.has(entry.facadeModuleId)) {
      remainingEntries.delete(entry.facadeModuleId);
      entries.push(entry);
    }
  }

  // Try to precisely find the entries (not so precise)
  if (remainingEntries.size) {
    for (const key in bundle) {
      const entry = bundle[key]!;
      if (
        !('moduleIds' in entry && Array.isArray(entry.moduleIds)) ||
        key.endsWith('.map') ||
        key.endsWith('.json')
      )
        continue;

      const found = entry.moduleIds.find(id => remainingEntries.has(id));
      if (found) {
        remainingEntries.delete(found);
        entries.push(entry);
      }
    }
  }

  // try to auto detect the index entry
  if (
    standaloneConfig.autoDetect &&
    !Object.keys(standaloneConfig.entry).includes('index')
  ) {
    console.warn(
      "[vite-plugin-standalone] options.entry doesn't explicitly set index, trying to detect the index entry",
    );

    for (const key in bundle) {
      const entry = bundle[key]!;
      if (key.endsWith('.map') || key.endsWith('.json')) continue;

      if ('isEntry' in entry && entry.isEntry && entry.name === 'index') {
        entries.push(entry);
        console.warn(
          `[vite-plugin-standalone] detected index entry ${entry.fileName}`,
        );
      }
    }
  }

  assert(entries.length && entries.length >= len, 'Failed to find entries');

  // bundle the index entry first
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

function resolveOptions(
  options?: StandaloneOptions,
): StandaloneOptionsResolved {
  if (!options) {
    return { external: [], autoDetect: true, entry: {}, esbuild: {} };
  }
  assertUsage(
    typeof options.entry === 'string' ||
      (typeof options.entry === 'object' &&
        Object.entries(options.entry).every(
          ([, value]) => typeof value === 'string',
        )),
    'options.entry should be a string or an entry mapping { name: path }',
  );

  assertUsage(
    !options.external ||
      (Array.isArray(options.external) &&
        options.external.every(e => typeof e === 'string')),
    'options.external should be a string array',
  );

  const entriesProvided =
    typeof options.entry === 'string'
      ? { index: options.entry }
      : options.entry;

  return {
    entry: entriesProvided,
    external: options.external ?? [],
    autoDetect: !('index' in entriesProvided),
    esbuild: options.esbuild ?? {},
  };
}
