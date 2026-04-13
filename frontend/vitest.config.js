import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    pool: 'vmForks',
    setupFiles: ['./src/test/setup.js'],
  },
});
