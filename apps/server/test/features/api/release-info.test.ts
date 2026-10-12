import { readFileSync } from 'node:fs';
import { releaseInfoSchema } from '@iu-attendance/contracts/api';
import { ROSTERS_ROUTES } from '@iu-attendance/contracts/rosters';
import { describe, expect, it } from 'vitest';

// The release info file CI writes and the server only reads (D13, D15): the verification
// module's example passes the strict schema, and a wrong or old field name fails.
const example = JSON.parse(
  readFileSync(new URL('./examples/release-info/d07-example.json', import.meta.url), 'utf8'),
) as Record<string, unknown> & {
  channels: Record<string, unknown>[];
  faultyVersions: Record<string, unknown>[];
};
const ok = (value: unknown) => releaseInfoSchema.safeParse(value).success;
const withChannel = (index: number, change: Record<string, unknown>) => ({
  ...example,
  channels: example.channels.map((entry, at) => (at === index ? { ...entry, ...change } : entry)),
});
const [play, github, appstore, testflight] = [0, 1, 2, 3];

describe('the release info file', () => {
  it("passes the verification module's example, faulty versions with its field names", () => {
    const info = releaseInfoSchema.parse(example);
    expect(info.faultyVersions[0]).toEqual({
      platform: 'android',
      appVersion: '1.3.2',
      updateId: '0199b9a4-3c1e-7d2a-9f10-5b2c7e8a4d61',
      startAt: '2026-10-01T09:00:00.000Z',
      reason: "The record time was written in the phone's time zone.",
    });
    expect(info.channels.map((entry) => entry.channel)).toEqual([
      'play',
      'github',
      'appstore',
      'testflight',
    ]);
  });

  it('refuses an old or wrong field name instead of dropping it', () => {
    const faulty = example.faultyVersions[0] ?? {};
    const { appVersion, reason, ...rest } = faulty;
    for (const entry of [
      { ...rest, version: appVersion, reason },
      { ...rest, appVersion, cause: reason },
      { ...faulty, note: 'x' },
    ]) {
      expect(ok({ ...example, faultyVersions: [entry] }), JSON.stringify(entry)).toBe(false);
    }
    expect(ok({ ...example, generatedBy: 'ci' })).toBe(false);
    expect(ok(withChannel(play, { minimum: '1.0.0' }))).toBe(false);
    // Positive control: a request schema still drops an unknown field quietly.
    const body = ROSTERS_ROUTES.addRow.request.body;
    const row = {
      studentNumber: '0123456789',
      fullName: 'Ada Yılmaz',
      expectedListVersion: 1,
      lateChoice: null,
      sectionChangeConfirmed: false,
    };
    expect(body.parse({ ...row, later: 1 })).toEqual(row);
  });

  it('carries each platform and channel pair exactly once', () => {
    const [first, second, third, fourth] = example.channels;
    expect(ok({ ...example, channels: [first, second, third] })).toBe(false);
    expect(ok({ ...example, channels: [first, second, third, second] })).toBe(false);
    expect(ok({ ...example, channels: [first, second, third, fourth, first] })).toBe(false);
    expect(ok(withChannel(play, { platform: 'ios' }))).toBe(false);
  });

  it('reports a version that is no version as an issue, never as a crash', () => {
    for (const change of [
      { minimumVersion: '1.3' },
      { minimumVersion: 'v1.4.0' },
      { latestVersion: '01.4.0' },
      { latestVersion: '1.2.3.4.5.6.7.8' },
    ]) {
      const result = releaseInfoSchema.safeParse(withChannel(play, change));
      expect(result.success, JSON.stringify(change)).toBe(false);
      // Only the broken field: the version order is not checked on it.
      const paths = new Set(result.error?.issues.map((issue) => issue.path.join('.')));
      expect([...paths]).toEqual([`channels.0.${Object.keys(change)[0]}`]);
    }
  });

  it('keeps the root fields and every stage strict and in form', () => {
    for (const change of [
      { format: 2 },
      { sequence: 0 },
      { sequence: 1.5 },
      { createdAt: '2026-10-06T07:00:00Z' },
    ]) {
      expect(ok({ ...example, ...change }), JSON.stringify(change)).toBe(false);
    }
    const stage = { start: '2026-10-06T07:00:00.000Z', percent: 10 };
    for (const bad of [
      { ...stage, note: 'x' },
      { ...stage, percent: -1 },
      { ...stage, percent: 10.5 },
      { ...stage, start: '2026-10-06' },
    ]) {
      expect(ok(withChannel(github, { stages: [bad] })), JSON.stringify(bad)).toBe(false);
    }
    expect(ok(withChannel(github, { stages: [stage] }))).toBe(true);
  });

  it('keeps each channel entry to its rules', () => {
    for (const [index, change] of [
      [play, { minimumVersion: '1.5.0' }],
      [play, { storeLink: 'http://play.google.com/store' }],
      [play, { storeLink: `https://play.google.com/${'a'.repeat(2048)}` }],
      [testflight, { migrationLink: 'http://apps.apple.com/app/id0000000000' }],
      [play, { migrationLink: 'https://apps.apple.com/app/id0000000000' }],
      [play, { stages: [{ start: '2026-10-06T07:00:00.000Z', percent: 10 }] }],
      [appstore, { stages: [{ start: '2026-10-06T07:00:00.000Z', percent: 10 }] }],
      [
        github,
        {
          stages: Array.from({ length: 11 }, (_, day) => ({
            start: `2026-10-${String(day + 10)}T07:00:00.000Z`,
            percent: 100,
          })),
        },
      ],
      [
        github,
        {
          stages: [
            { start: '2026-10-07T07:00:00.000Z', percent: 10 },
            { start: '2026-10-06T07:00:00.000Z', percent: 50 },
          ],
        },
      ],
      [
        github,
        {
          stages: [
            { start: '2026-10-06T07:00:00.000Z', percent: 10 },
            { start: '2026-10-06T07:00:00.000Z', percent: 50 },
          ],
        },
      ],
      [
        github,
        {
          stages: [
            { start: '2026-10-06T07:00:00.000Z', percent: 50 },
            { start: '2026-10-07T07:00:00.000Z', percent: 10 },
          ],
        },
      ],
      [github, { stages: [{ start: '2026-10-06T07:00:00.000Z', percent: 101 }] }],
    ] as const) {
      expect(ok(withChannel(index, change)), JSON.stringify(change)).toBe(false);
    }
    // Ground controls: equal versions, ten stages, a testflight without a migration link.
    expect(ok(withChannel(play, { minimumVersion: '1.4.0' }))).toBe(true);
    const ten = Array.from({ length: 10 }, (_, day) => ({
      start: `2026-10-${String(day + 10)}T07:00:00.000Z`,
      percent: day * 10,
    }));
    expect(ok(withChannel(github, { stages: ten }))).toBe(true);
    expect(ok(withChannel(testflight, { migrationLink: null }))).toBe(true);
  });

  it('bounds the faulty versions and the iOS lists', () => {
    const faulty = example.faultyVersions[0] ?? {};
    const many = (count: number, value: unknown) => Array.from({ length: count }, () => value);
    for (const change of [
      { faultyVersions: many(101, faulty) },
      { faultyVersions: [{ ...faulty, reason: 'x'.repeat(201) }] },
      { faultyVersions: [{ ...faulty, appVersion: '1.3' }] },
      { faultyVersions: [{ ...faulty, updateId: 'x' }] },
      { faultyVersions: [{ ...faulty, platform: 'web' }] },
      { faultyVersions: [{ ...faulty, startAt: '2026-10-01' }] },
      { faultyVersions: [{ ...faulty, reason: '' }] },
      { iosBundleVersions: many(501, '120') },
      { iosBundleVersions: [''] },
      { iosBundleVersions: ['1'.repeat(65)] },
      { iosDistributionKinds: ['App-Store'] },
      { iosDistributionKinds: ['a'.repeat(33)] },
      { iosDistributionKinds: many(11, 'app-store') },
    ]) {
      expect(ok({ ...example, ...change }), Object.keys(change).join()).toBe(false);
    }
    expect(
      ok({ ...example, faultyVersions: many(100, faulty), iosBundleVersions: many(500, '1') }),
    ).toBe(true);
  });
});
