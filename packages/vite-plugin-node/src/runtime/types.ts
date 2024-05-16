export type HeadersProvided = Record<string, string | string[] | undefined> | Headers
//TODO: type
export type ViteNodeHttpResponse = any
export type NextFunction = (err?: Error) => void
export type ViteNodeOptions<PlatformRequest = null> = {
  pageContext?: ((req: PlatformRequest) => Record<string, any> | Promise<Record<string, any>>) | Record<string, any>
  serveAssets?: boolean | { root?: string; compress?: boolean; cache?: boolean }
  onError?: (err: unknown) => void
  //TODO: type
  renderPage?: any
}
