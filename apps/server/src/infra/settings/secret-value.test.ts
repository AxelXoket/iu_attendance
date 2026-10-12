import { format, inspect } from 'node:util';
import { describe, expect, it } from 'vitest';
import { SECRET_PLACEHOLDER, SecretValue } from './secret-value.ts';

// The pino log line is checked in infra/monitoring, the one folder that may load pino.

const VALUE = 'db-password-7f3a';

describe('SecretValue', () => {
  const secret = new SecretValue(VALUE);

  it('writes [gizli] in JSON, text, inspection and error messages', () => {
    expect(SECRET_PLACEHOLDER).toBe('[gizli]');
    const outputs = [
      JSON.stringify({ password: secret }),
      String(secret),
      `${secret}`,
      inspect(secret),
      inspect({ nested: { secret } }, { depth: 5, showHidden: true }),
      format('%s %o %O %j', secret, secret, secret, secret),
      new Error(`login failed for ${secret}`).message,
    ];
    for (const output of outputs) {
      expect(output).toContain(SECRET_PLACEHOLDER);
      expect(output).not.toContain(VALUE);
    }
  });

  it('keeps the value out of every listing of the object', () => {
    expect(Object.keys(secret)).toEqual([]);
    expect(Object.getOwnPropertyNames(secret)).toEqual([]);
    expect(Object.entries({ ...secret })).toEqual([]);
  });

  it('gives the value through reveal only', () => {
    // Ground control: the value is really inside.
    expect(secret.reveal()).toBe(VALUE);
    expect(new SecretValue('').reveal()).toBe('');
  });
});
