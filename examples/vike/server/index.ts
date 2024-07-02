import express from 'express'
import { renderPage } from 'vike/server'
import { viteNode } from '@nitedani/vite-plugin-node/connect'

startServer()

async function startServer() {
  const app = express()

  app.use(viteNode())
  app.get('*', async (req, res, next) => {
    const pageContextInit = {
      urlOriginal: req.originalUrl
    }
    const pageContext = await renderPage(pageContextInit)
    const { httpResponse } = pageContext
    if (!httpResponse) return next()
    const { statusCode, body } = httpResponse
    res.status(statusCode).send(body)
  })

  const port = process.env.PORT || 3000
  app.listen(port)
  console.log(`Server running at http://localhost:${port}`)
}
