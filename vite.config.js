import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'vite-plugin-bundle-obfuscator'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    obfuscator({
      excludes: [/vendor/, /jspdf/, /recharts/, /fullcalendar/, /html2canvas/, /lucide-react/, /firebase/, /dexie/, /framer-motion/, /react-vendor/],
      enable: command === 'build',
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        identifierNamesGenerator: 'hexadecimal',
        debugProtection: false,
        selfDefending: false,
      }
    })
  ],
  base: '/Cica-NyT/',
  esbuild: {
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
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
}))
