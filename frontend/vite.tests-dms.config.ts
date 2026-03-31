import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const testsDmsRoot = path.resolve(__dirname, '../TESTS_DMS/frontend').replace(/\\/g, '/')
const frontendNodeModules = path.resolve(__dirname, 'node_modules')

function fromNodeModules(...parts: string[]) {
  return path.resolve(frontendNodeModules, ...parts)
}

export default defineConfig({
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  resolve: {
    alias: {
      react: fromNodeModules('react'),
      'react/jsx-runtime': fromNodeModules('react/jsx-runtime.js'),
      'react/jsx-dev-runtime': fromNodeModules('react/jsx-dev-runtime.js'),
      'react-dom': fromNodeModules('react-dom'),
      'react-router-dom': fromNodeModules('react-router-dom'),
      '@testing-library/react': fromNodeModules('@testing-library', 'react', 'dist', 'index.js'),
      '@testing-library/jest-dom': fromNodeModules('@testing-library', 'jest-dom', 'dist', 'index.js'),
      '@testing-library/jest-dom/vitest': fromNodeModules('@testing-library', 'jest-dom', 'dist', 'vitest.js'),
      '@testing-library/user-event': fromNodeModules('@testing-library', 'user-event', 'dist', 'index.js'),
    },
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: path.resolve(__dirname, '../TESTS_DMS/frontend/setup.ts'),
    globals: true,
    include: [`${testsDmsRoot}/**/*.test.ts`, `${testsDmsRoot}/**/*.test.tsx`],
  },
})
