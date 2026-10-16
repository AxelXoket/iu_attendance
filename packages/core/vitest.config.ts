import { defineConfig } from 'vitest/config';

// Workspace packages resolve to their TypeScript source through the "source"
// export condition, as they do for the server. Coverage counts every source
// file, so a module without tests lowers the gate instead of being skipped.
export default defineConfig({
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: {
    include: ['src/**/*.test.ts'],
    // Property tests run thousands of cases; under coverage on a busy machine a few pass the
    // 5 s default, though each takes about a second alone.
    testTimeout: 30_000,
    coverage: {
      include: ['src/**/*.{ts,mts,cts,tsx}'],
      exclude: ['src/**/*.test.{ts,mts,cts,tsx}', 'src/testing/**'],
    },
  },
});
