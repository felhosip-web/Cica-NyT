import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Cica-NyT/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) {
              return 'jspdf';
            }
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('@fullcalendar') || id.includes('fullcalendar')) {
              return 'fullcalendar';
            }
            if (id.includes('html2canvas')) {
              return 'html2canvas';
            }
            if (id.includes('lucide-react')) {
              return 'lucide-react';
            }
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('dexie')) {
              return 'dexie';
            }
            if (id.includes('framer-motion') || id.includes('motion')) {
              return 'framer-motion';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true }
})
