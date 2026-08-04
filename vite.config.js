import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Cica-NyT/',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true }
})
