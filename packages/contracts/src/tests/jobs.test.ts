import { describe, expect, it } from 'vitest';
import { JOB_POLICIES, JOBS_ERROR_CODES, JOBS_GENERIC_ERROR_TEXT } from '../jobs.ts';

describe('the jobs error catalog', () => {
  const codes = Object.entries(JOBS_ERROR_CODES);
  // The codes a request can also raise: sending a job, the e-mail limit and sending.
  const inRequest = [
    'JOBS_NOT_SET_UP',
    'JOBS_WRONG_PROCESS',
    'JOBS_DEFINITION_INVALID',
    'JOBS_DATA_INVALID',
    'JOBS_DATA_TOO_LARGE',
    'JOBS_SINGLETON_KEY_INVALID',
    'JOBS_START_AT_INVALID',
    'JOBS_EMAIL_ADDRESS_INVALID',
    'JOBS_EMAIL_LIMIT_SKIPPED',
    'JOBS_EMAIL_ISOLATION',
    'JOBS_EMAIL_TEMPLATE_DATA_INVALID',
    'JOBS_EMAIL_LINK',
  ];

  it('gives the twelve request codes 500 and the general text, the other eight nothing', () => {
    expect(codes).toHaveLength(20);
    for (const [code, definition] of codes) {
      if (inRequest.includes(code)) {
        expect(definition, code).toEqual({
          http: 500,
          lecturer: JOBS_GENERIC_ERROR_TEXT,
          student: JOBS_GENERIC_ERROR_TEXT,
        });
      } else {
        expect(definition, code).toEqual({ http: null, lecturer: null, student: null });
      }
    }
    expect(codes.filter(([code]) => inRequest.includes(code))).toHaveLength(12);
  });

  it('writes the general text in both languages without digits or placeholders', () => {
    expect(Object.keys(JOBS_GENERIC_ERROR_TEXT)).toEqual(['tr', 'en']);
    for (const text of Object.values(JOBS_GENERIC_ERROR_TEXT)) expect(text).not.toMatch(/[0-9{}]/);
    expect(Object.isFrozen(JOBS_GENERIC_ERROR_TEXT)).toBe(true);
  });

  it('names the three queue policies', () => {
    expect(JOB_POLICIES).toEqual(['standard', 'stately', 'exclusive']);
  });
});
