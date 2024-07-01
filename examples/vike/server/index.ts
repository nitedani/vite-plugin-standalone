/// <reference types="vite/client" />

import express from 'express'
import { renderPage } from 'vike/server'
import { viteNode } from '@nitedani/vite-plugin-node/connect'
import { two } from './shared.js'

startServer()

async function startServer() {
  console.log('index.ts', two())
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
