import express from 'express'
import { renderPage } from 'vike/server'
import { viteNode } from '@nitedani/vite-plugin-node/connect'

startServer()

async function startServer() {
  const app = express()

  app.use(
    viteNode({
      renderPage
    })
  )

  const port = process.env.PORT || 3000
  app.listen(port)
  console.log(`Server running at http://localhost:${port}`)
}
