import { defineConfig } from 'vite'
import { viteNode } from 'vite-plugin-node/plugin'

export default defineConfig({
  plugins: [viteNode({ entry: '/src/server.ts', standalone: true })]
})
