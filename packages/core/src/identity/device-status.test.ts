import { describe, expect, it } from 'vitest';
import { DEVICE_STATUSES } from './device-status.ts';

describe('device statuses (D01 cihazlar.durum)', () => {
  it('are active, change pending and closed, each once', () => {
    expect(DEVICE_STATUSES).toEqual(['active', 'change_pending', 'closed']);
  });
});
