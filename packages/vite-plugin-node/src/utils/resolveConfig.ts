import { ConfigViteNode, ConfigViteNodeResolved } from '../types.js'
import { assert, assertUsage } from './assert.js'
import { unique } from './unique.js'

export { resolveConfig }

export const nativeDependecies = ['sharp', '@prisma/client', '@node-rs/*']

function resolveEntry(entry: ConfigViteNode['entry']): ConfigViteNodeResolved['entry'] {
  if (typeof entry === 'object') {
    if (entry) {
      assertUsage(
        typeof entry === 'string' ||
          (typeof entry === 'object' && Object.entries(entry).every(([, value]) => typeof value === 'string')),
        'server.entry should be a string or an entry mapping { name: path }'
      )
      assertUsage(
        typeof entry !== 'object' || Object.entries(entry).some(([name]) => name === 'index'),
        'missing index entry in server.entry'
      )
    }

    const entriesProvided = typeof entry === 'string' ? { index: entry } : entry

    assert('index' in entriesProvided)

    return entriesProvided
  }

  assertUsage(typeof entry === 'string', 'config.server should be defined')
  return { index: entry }
}

function resolveStandalone(
  configViteNode: ConfigViteNode,
  entryResolved: ConfigViteNodeResolved['entry'],
  externalResolved: string[]
): ConfigViteNodeResolved['standalone'] {
  if (configViteNode.standalone === true) {
    return {
      entry: entryResolved,
      external: externalResolved
    }
  }
  if (typeof configViteNode.standalone === 'object') {
    assert(configViteNode.standalone.esbuild)
    return { ...configViteNode.standalone, entry: entryResolved, external: externalResolved }
  }

  return false
}

function resolveConfig(configViteNode: ConfigViteNode): ConfigViteNodeResolved {
  const entryResolved = resolveEntry(configViteNode.entry)
  const externalResolved = unique([...nativeDependecies, ...(configViteNode.external ?? [])])
  return {
    entry: entryResolved,
    standalone: resolveStandalone(configViteNode, entryResolved, externalResolved),
    external: externalResolved
  }
}
