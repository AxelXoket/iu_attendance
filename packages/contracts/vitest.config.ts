import { defineConfig } from 'vitest/config';

// Workspace packages resolve to their TypeScript source through the "source"
// export condition, as they do for core and the server.
export default defineConfig({
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: { include: ['src/**/*.test.ts'] },
});
