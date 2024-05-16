/// <reference types="vite/client" />

import express from 'express'
import { hash } from '@node-rs/argon2'
import { fork } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { two } from './shared.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const argon2Opts = {
  memory: 3145728,
  iterations: 2,
  parallelism: 64,
  salt_length: 16,
  key_length: 32
}

startServer()

async function startServer() {
  const app = express()
  app.get('/', async (req, res) => {
    const hashed = await hash('password', argon2Opts)
    res.send(hashed)
    console.log('server.ts', two())

    fork(join(__dirname, './worker.js'))
  })

  const port = process.env.PORT || 3000
  app.listen(port)
  console.log(`Server running at http://localhost:${port}`)
}
