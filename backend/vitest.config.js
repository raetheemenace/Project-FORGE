// Vitest configuration for FORGE backend
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'db/schema.sql',
        '**/*.config.js'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // Allow CommonJS modules
    server: {
      deps: {
        inline: ['vitest']
      }
    }
  }
});
