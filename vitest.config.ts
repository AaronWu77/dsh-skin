import { defineConfig } from 'vitest/config'
export default defineConfig({ resolve: { dedupe: ['react', 'react-dom', '@deepseek-ai/cordis'] }, test: { include: ['tests/**/*.spec.{ts,tsx}'], testTimeout: 30000 } })
