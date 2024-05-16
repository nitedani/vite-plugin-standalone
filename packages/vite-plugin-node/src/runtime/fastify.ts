export { viteNode }

import type { FastifyPluginCallback, FastifyRequest } from 'fastify'
import { createHandler } from './handler.js'
import type { ViteNodeOptions } from './types.js'

function viteNode(options?: ViteNodeOptions<FastifyRequest>): FastifyPluginCallback {
  const handler = createHandler(options)
  return function plugin(instance, _options, done) {
    instance.get('*', (req, reply) =>
      handler({
        req: req.raw,
        res: reply.raw,
        platformRequest: req
      })
    )
    done()
  }
}
