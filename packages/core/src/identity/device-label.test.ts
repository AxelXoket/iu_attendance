import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type BROWSER_FAMILIES,
  DEVICE_LABELS,
  type LABEL_SYSTEMS,
  PHONE_DEVICE_LABELS,
  panelDeviceLabel,
  phoneDeviceLabel,
  SAFARI_SYSTEMS,
  UNKNOWN_BROWSER,
  USER_AGENT_MAX_LENGTH,
} from './device-label.ts';

// User-Agent headers as the browsers send them (desktop and mobile, current and legacy).
const KNOWN: readonly (readonly [string, string])[] = [
  [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Edge, Windows',
  ],
  [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19582',
    'Edge, Windows',
  ],
  [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Chrome, Windows',
  ],
  [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Chrome, macOS',
  ],
  [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Chrome, Linux',
  ],
  [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Firefox, Windows',
  ],
  ['Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0', 'Firefox, Linux'],
  [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Safari, macOS',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Safari, iOS',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
    'Chrome, iOS',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/121.0 Mobile/15E148 Safari/605.1.15',
    'Firefox, iOS',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/120.0.2210.126 Mobile/15E148 Safari/605.1.15',
    'Edge, iOS',
  ],
  [
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Chrome, Android',
  ],
  [
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 EdgA/120.0.0.0',
    'Edge, Android',
  ],
  ['Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0', 'Firefox, Android'],
  [
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
    'Chrome, iOS',
  ],
  [
    'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
    'Safari, iOS',
  ],
  // An app's own browser names Safari without Safari's Version token.
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/300.0.598994205 Mobile/15E148 Safari/604.1',
    'Tarayıcı, iOS',
  ],
  // Other brands name Chrome or Safari too; they are none of the four families.
  [
    'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 YaSearchBrowser/23.95.1 Mobile Safari/537.36',
    'Tarayıcı, Android',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) OPiOS/16.0.14.122053 Mobile/15E148 Safari/9537.53',
    'Tarayıcı, iOS',
  ],
  [
    'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Focus/8.0.24 Chrome/81.0.4044.138 Mobile Safari/537.36',
    'Tarayıcı, Android',
  ],
  [
    'Mozilla/5.0 (Linux; U; Android 4.0.3; tr-tr; GT-I9100 Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    'Tarayıcı, Android',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1 OPT/4.4.1',
    'Tarayıcı, iOS',
  ],
  [
    'Mozilla/5.0 (Linux; Android 12; NOH-NX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 HuaweiBrowser/14.0.0.322 Mobile Safari/537.36',
    'Tarayıcı, Android',
  ],
  [
    'Mozilla/5.0 (Linux; U; Android 13; tr-tr; 2201117TG Build/TKQ1.221114.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.7.10',
    'Tarayıcı, Android',
  ],
  [
    'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36 Instagram 309.1.0.41.113 Android',
    'Tarayıcı, Android',
  ],
  [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 DuckDuckGo/7 Safari/605.1.15',
    'Tarayıcı, iOS',
  ],
  [
    'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    'Tarayıcı, Android',
  ],
  [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    'Tarayıcı, Windows',
  ],
  [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/24.1.0.0 Safari/537.36',
    'Tarayıcı, Windows',
  ],
  [
    'Mozilla/5.0 (Linux; U; Android 10; en-US; RMX1971) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 UCBrowser/13.4.0.1306 Mobile Safari/537.36',
    'Tarayıcı, Android',
  ],
  [
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Chrome',
  ],
  ['curl/8.4.0', 'Tarayıcı'],
  ['', 'Tarayıcı'],
];

// One token per operating system and per browser, so every pair can be built.
const SYSTEM_TOKENS: Record<(typeof LABEL_SYSTEMS)[number], string> = {
  Windows: '(Windows NT 10.0; Win64; x64)',
  macOS: '(Macintosh; Intel Mac OS X 10_15_7)',
  Linux: '(X11; Linux x86_64)',
  Android: '(Linux; Android 14; K)',
  iOS: '(iPhone; CPU iPhone OS 17_2 like Mac OS X)',
};
const BROWSER_TOKENS: Record<(typeof BROWSER_FAMILIES)[number] | typeof UNKNOWN_BROWSER, string> = {
  Edge: 'Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  Chrome: 'Chrome/120.0.0.0 Safari/537.36',
  Firefox: 'Gecko/20100101 Firefox/121.0',
  Safari: 'Version/17.2 Safari/605.1.15',
  [UNKNOWN_BROWSER]: 'Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
};

// Fragments a hostile or broken header may carry, mixed with the real tokens.
const fragmentArb = fc.oneof(
  fc.constantFrom(...Object.values(SYSTEM_TOKENS), ...Object.values(BROWSER_TOKENS)),
  fc.constantFrom('/', '_', ' ', ';', '(', ')', 'SM-G991B/DS', '😀', 'Edg', 'Version/', 'Safari'),
  fc.string({ unit: 'binary', maxLength: 80 }),
);
const userAgentArb = fc.array(fragmentArb, { maxLength: 12 }).map((parts) => parts.join(''));

describe('Cihaz etiketi sabit listede kalır (the device label stays in the fixed list)', () => {
  it.each(KNOWN)('labels %s as %s', (userAgent, label) => {
    expect(panelDeviceLabel(userAgent)).toBe(label);
  });

  it('labels a phone by its platform alone', () => {
    expect(phoneDeviceLabel('ios')).toBe('iPhone, iOS');
    expect(phoneDeviceLabel('android')).toBe('Android telefon, Android');
    // A platform outside the list, an inherited name among them, is refused.
    for (const platform of ['windows', 'IOS', 'toString', '__proto__']) {
      expect(() => phoneDeviceLabel(platform as 'ios'), platform).toThrow(RangeError);
    }
  });

  it('gives every label of the list, and only those, for a browser and a system', () => {
    const made = new Set<string>();
    for (const [browser, browserToken] of Object.entries(BROWSER_TOKENS)) {
      // Safari is Safari on Apple's systems only.
      const onApple = (system: string) =>
        browser !== 'Safari' || (SAFARI_SYSTEMS as readonly string[]).includes(system);
      const alone = panelDeviceLabel(`Mozilla/5.0 ${browserToken}`);
      expect(alone).toBe(browser === 'Safari' ? UNKNOWN_BROWSER : browser);
      made.add(alone);
      for (const [system, systemToken] of Object.entries(SYSTEM_TOKENS)) {
        const label = panelDeviceLabel(`Mozilla/5.0 ${systemToken} ${browserToken}`);
        expect(label).toBe(`${onApple(system) ? browser : UNKNOWN_BROWSER}, ${system}`);
        made.add(label);
      }
    }
    for (const label of Object.values(PHONE_DEVICE_LABELS)) made.add(label);
    expect([...made].sort()).toEqual([...DEVICE_LABELS].sort());
    expect(new Set(DEVICE_LABELS).size).toBe(DEVICE_LABELS.length);
  });

  it('never lets header text through: any header gives a label of the list', () => {
    fc.assert(
      fc.property(userAgentArb, (userAgent) => {
        expect(DEVICE_LABELS).toContain(panelDeviceLabel(userAgent));
      }),
      { numRuns: 5000 },
    );
    // The list itself holds one-line, non-empty labels only.
    for (const label of DEVICE_LABELS) expect(label).toMatch(/^[^\p{Cc}]+$/u);
  });

  it('reads a header up to the length cap and none past it', () => {
    const [chrome] = KNOWN[2] as readonly [string, string];
    const atCap = chrome.padEnd(USER_AGENT_MAX_LENGTH, ' ');
    expect(panelDeviceLabel(atCap)).toBe('Chrome, Windows');
    expect(panelDeviceLabel(`${atCap} `)).toBe(UNKNOWN_BROWSER);
    expect(panelDeviceLabel(null)).toBe(UNKNOWN_BROWSER);
    fc.assert(
      fc.property(userAgentArb, fc.nat(200), (userAgent, extra) => {
        const long = `${chrome}${userAgent}`.padEnd(USER_AGENT_MAX_LENGTH + 1 + extra, 'x');
        expect(panelDeviceLabel(long)).toBe(UNKNOWN_BROWSER);
      }),
    );
  });
});
