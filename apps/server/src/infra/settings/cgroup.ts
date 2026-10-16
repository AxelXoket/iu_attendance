import { readFileSync } from 'node:fs';

// The container's memory limit (D15): cgroup v2 memory.max, read once at start-up. The
// API's pressure threshold must stay below it, so the process sheds load before the
// kernel kills it.

export const CGROUP_MEMORY_MAX_PATH = '/sys/fs/cgroup/memory.max';

const isMissing = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

/**
 * The memory limit in bytes, or null when there is none: the file says "max", or it does
 * not exist (no cgroup v2, as on a development machine). A file that cannot be read or
 * holds anything else throws.
 */
export function readMemoryLimit(path: string = CGROUP_MEMORY_MAX_PATH): number | null {
  let text: string;
  try {
    text = readFileSync(path, 'utf8').trim();
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
  if (text === 'max') return null;
  const bytes = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(bytes)) {
    throw new Error(`cgroup memory limit unreadable: ${path}`);
  }
  return bytes;
}
