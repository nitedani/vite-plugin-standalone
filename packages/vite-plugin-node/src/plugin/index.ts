export { viteNode as default, viteNode }

import { setPluginLoaded } from '../runtime/env.js'
import { devServerPlugin } from './devServerPlugin.js'
import { resolveConfig } from '../utils/resolveConfig.js'
import type { ConfigViteNode } from '../types.js'
import { serverEntryPlugin } from './serverEntryPlugin.js'
import { commonConfig } from './commonConfig.js'
import { standalone } from 'vite-plugin-standalone'

setPluginLoaded()

function viteNode(configViteNode: ConfigViteNode) {
  const resolvedConfig = resolveConfig(configViteNode)

  return [
    commonConfig(resolvedConfig),
    serverEntryPlugin(resolvedConfig),
    devServerPlugin(resolvedConfig),
    resolvedConfig.standalone && standalone(resolvedConfig.standalone)
  ]
}
