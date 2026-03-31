import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('@remix-run/router')) {
              return 'router'
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'react'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query'
            }
            if (id.includes('framer-motion')) {
              return 'motion'
            }
            if (id.includes('lucide-react')) {
              return 'icons'
            }
            if (id.includes('zod')) {
              return 'zod'
            }
            if (id.includes('axios')) {
              return 'http'
            }
            return undefined
          }

          return undefined
        },
      },
    },
  },
})
