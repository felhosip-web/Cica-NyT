import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Cica-NyT/',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 3000 }
})
