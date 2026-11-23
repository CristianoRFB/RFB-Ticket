import { defineConfig } from 'vitest/config';

/** Unit tests run in Node; browser E2E belongs exclusively to Playwright. */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node',
  },
});
