export type { ConfigViteNode, ConfigViteNodeResolved }
import type { BuildOptions } from 'esbuild'
import type { StandaloneOptions } from 'vite-plugin-standalone'

type ConfigViteNode = {
  entry: string | { index: string; [name: string]: string }
  standalone?: boolean | { esbuild: BuildOptions }
  external?: string[]
}

type ConfigViteNodeResolved = {
  entry: { index: string; [name: string]: string }
  standalone: false | StandaloneOptions
  external: string[]
}
