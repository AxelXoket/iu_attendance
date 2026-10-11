import os from 'node:os';

// Support code loads before step definitions so hook order is fixed. The extglob
// keeps unit test files (*.test.ts) that sit next to steps from being loaded.
// Feature files live under test/features/<module>/.
export default {
  import: ['test/support/**/!(*.test).ts', 'test/steps/**/!(*.test).ts'],
  paths: ['test/features/**/*.feature'],
  language: 'en',
  parallel: os.availableParallelism(),
  retry: 0,
};
