import { defineConfig } from 'vite'
import { viteNode } from '@nitedani/vite-plugin-node/plugin'

export default defineConfig({
  plugins: [viteNode({ entry: '/src/importKey.ts', standalone: true })]
})
