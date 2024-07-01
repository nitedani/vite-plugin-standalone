import { defineConfig } from 'vite'
import { viteNode } from '@nitedani/vite-plugin-node/plugin'

export default defineConfig({
  plugins: [viteNode({ entry: { index: '/src/server.ts', worker: '/src/worker.js' }, standalone: true })]
})
