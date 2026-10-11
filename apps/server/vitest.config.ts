import { defineConfig } from 'vitest/config';

// Workspace packages resolve to their TypeScript source through the "source"
// export condition, the same condition Node gets via --conditions=source.
export default defineConfig({
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
