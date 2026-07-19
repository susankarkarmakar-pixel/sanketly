import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    deps: {
      inline: ['@sanketly/crypto'] // ensures it's resolved with the same mocks
    }
  },
})
