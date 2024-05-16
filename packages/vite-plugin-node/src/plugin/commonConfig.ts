export { commonConfig }

import type { Plugin } from 'vite'
import { ConfigViteNodeResolved } from '../types.js'

function commonConfig(resolvedConfig: ConfigViteNodeResolved): Plugin {
  return {
    name: 'vite-node:commonConfig',
    enforce: 'pre',
    config(config, env) {
      return {
        environments: {
          ssr: {
            resolve: { external: resolvedConfig.external }
          },
          client: {
            resolve: { external: resolvedConfig.external }
          }
        },
        optimizeDeps: {
          exclude: resolvedConfig.external
        }
      }
    }
  }
}
