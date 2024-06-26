/// <reference types="vite/client" />

import express from 'express'
import { PrismaClient } from '@generated/prisma'
const prisma = new PrismaClient()

const app = express()

app.get('/', async (req, res) => {
  const users = await prisma.user.findMany()

  res.json(users)
})

app.listen(3000, () => {
  console.log('Listening on http://localhost:3000')
})
