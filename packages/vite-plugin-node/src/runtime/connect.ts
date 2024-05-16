export { viteNode }

import type { IncomingMessage, ServerResponse } from 'http'
import { createHandler } from './handler.js'
import type { NextFunction, ViteNodeOptions } from './types.js'

function viteNode<PlatformRequest extends IncomingMessage, PlatformResponse extends ServerResponse>(
  options?: ViteNodeOptions<PlatformRequest>
): (req: PlatformRequest, res: PlatformResponse, next?: NextFunction) => void {
  const handler = createHandler(options)
  return function middleware(req, res, next): void {
    handler({
      req,
      res,
      next,
      platformRequest: req
    })
  }
}
