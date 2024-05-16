export { getConfigViteNode }

import { ResolvedConfig } from 'vite'
import { ConfigViteNodeResolved } from '../types.js'
import { assert } from './assert.js'

function getConfigViteNode(config: ResolvedConfig): ConfigViteNodeResolved {
  const { configViteNode } = config as any
  assert(configViteNode)
  return configViteNode
}
