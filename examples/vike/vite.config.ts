import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'
import { UserConfig } from 'vite'
import { viteNode } from '@nitedani/vite-plugin-node/plugin'
const config: UserConfig = {
  plugins: [
    react(),
    vike(),
    viteNode({
      entry: './server/index.ts',
      standalone: true
    })
  ]
}

export default config
