import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

startServer()

async function startServer() {
  const app = await NestFactory.create(AppModule)
  await app.init()
  const port = process.env.PORT || 3000
  app.listen(port)
  console.log(`Server running at http://localhost:${port}`)
}
