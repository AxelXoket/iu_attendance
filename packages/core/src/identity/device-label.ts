// The short device label of a sign-in session (D01-B11): a browser or phone family and an
// operating system from a fixed list, never free text such as a model name, so the sign-in
// notification and the session list show only these values. A panel session is labelled
// from its User-Agent header, a phone session from its platform. A browser that is not one
// of the four families is "Tarayıcı"; an unknown operating system leaves only the family;
// a header longer than USER_AGENT_MAX_LENGTH is not read at all.

/** The longest User-Agent header read; a longer one gives "Tarayıcı". */
export const USER_AGENT_MAX_LENGTH = 512;

export const BROWSER_FAMILIES = ['Edge', 'Chrome', 'Firefox', 'Safari'] as const;
export const UNKNOWN_BROWSER = 'Tarayıcı';
// The systems a label names; the lecturer's lectern list keeps its own, longer list in the
// projection contract.
export const LABEL_SYSTEMS = ['Windows', 'macOS', 'Linux', 'Android', 'iOS'] as const;
/** Safari runs on Apple's systems only; a Safari-like header elsewhere is another browser. */
export const SAFARI_SYSTEMS = ['macOS', 'iOS'] as const;

type Browser = (typeof BROWSER_FAMILIES)[number] | typeof UNKNOWN_BROWSER;
type LabelSystem = (typeof LABEL_SYSTEMS)[number];

/** A phone session's label by its platform. */
export const PHONE_DEVICE_LABELS = {
  android: 'Android telefon, Android',
  ios: 'iPhone, iOS',
} as const;

export type DeviceLabel =
  | Exclude<Browser, 'Safari'>
  | `${Exclude<Browser, 'Safari'>}, ${LabelSystem}`
  | `Safari, ${(typeof SAFARI_SYSTEMS)[number]}`
  | (typeof PHONE_DEVICE_LABELS)[keyof typeof PHONE_DEVICE_LABELS];

const pairs = (browser: Browser, systems: readonly LabelSystem[]) =>
  systems.map((system) => `${browser}, ${system}` as DeviceLabel);

/** Every label there is: each browser alone and with each system it runs on, then the phones. */
export const DEVICE_LABELS: readonly DeviceLabel[] = [
  ...(['Edge', 'Chrome', 'Firefox', UNKNOWN_BROWSER] as const).flatMap((browser) => [
    browser,
    ...pairs(browser, LABEL_SYSTEMS),
  ]),
  ...pairs('Safari', SAFARI_SYSTEMS),
  ...Object.values(PHONE_DEVICE_LABELS),
];

// Other brands name Chrome, Safari or both, so they are told apart first: Opera, Samsung,
// Yandex, UC, Huawei, Xiaomi, DuckDuckGo and Firefox Focus by their own token, and an
// Android app's built-in browser by its "; wv)" mark. A brand that hides behind Chrome's
// own header (Brave, Vivaldi) is Chrome. Edge names Chrome and Safari, Chrome names Safari.
const OTHER_BRANDS =
  /\b(?:OPR|OPT|SamsungBrowser|YaBrowser|YaSearchBrowser|UCBrowser|HuaweiBrowser|MiuiBrowser|DuckDuckGo|Focus)\/|; wv\)/;
const BROWSER_TESTS: readonly (readonly [Browser, RegExp])[] = [
  ['Edge', /\b(?:Edg|EdgA|EdgiOS|Edge)\//],
  ['Chrome', /\b(?:Chrome|CriOS)\//],
  ['Firefox', /\b(?:Firefox|FxiOS)\//],
  ['Safari', /\bVersion\/[\d.]+.*\bSafari\//],
];
// iOS before macOS (an iPhone or iPad says "like Mac OS X"; an iPod says "iPhone OS"),
// Android before Linux.
const SYSTEM_TESTS: readonly (readonly [LabelSystem, RegExp])[] = [
  ['iOS', /\b(?:iPhone|iPad)\b/],
  ['Android', /\bAndroid\b/],
  ['Windows', /\bWindows\b/],
  ['macOS', /\bMac OS X\b/],
  ['Linux', /\bLinux\b/],
];

function browserOf(userAgent: string, system: LabelSystem | undefined): Browser {
  if (OTHER_BRANDS.test(userAgent)) return UNKNOWN_BROWSER;
  const browser = BROWSER_TESTS.find(([, test]) => test.test(userAgent))?.[0] ?? UNKNOWN_BROWSER;
  const onApple = (SAFARI_SYSTEMS as readonly (LabelSystem | undefined)[]).includes(system);
  return browser === 'Safari' && !onApple ? UNKNOWN_BROWSER : browser;
}

/** A panel session's label from its User-Agent header; null or empty gives "Tarayıcı". */
export function panelDeviceLabel(userAgent: string | null): DeviceLabel {
  if (userAgent === null || userAgent.length > USER_AGENT_MAX_LENGTH) return UNKNOWN_BROWSER;
  const system = SYSTEM_TESTS.find(([, test]) => test.test(userAgent))?.[0];
  const browser = browserOf(userAgent, system);
  return (system === undefined ? browser : `${browser}, ${system}`) as DeviceLabel;
}

/** A phone session's label from its platform. */
export function phoneDeviceLabel(platform: keyof typeof PHONE_DEVICE_LABELS): DeviceLabel {
  if (!Object.hasOwn(PHONE_DEVICE_LABELS, platform)) {
    throw new RangeError(`unknown platform ${String(platform)}`);
  }
  return PHONE_DEVICE_LABELS[platform];
}
