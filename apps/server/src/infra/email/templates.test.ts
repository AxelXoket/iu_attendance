import { DEVICE_LABELS } from '@iu-attendance/core/identity/device-label';
import { LANGUAGES, type Language } from '@iu-attendance/core/shared/language';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FIXED_WARNING_SENTENCE, IF_NOT_YOU_SENTENCE } from './fixed-texts.ts';
import { checkLinks } from './link-check.ts';
import {
  OPERATIONS_TEMPLATES,
  PRODUCT_TEMPLATES,
  type RenderedEmail,
  renderEmail,
} from './templates/index.ts';
import { UNKNOWN_DEVICE_LABEL } from './templates/sign-in-notification.ts';
import {
  DEVICE_LABEL_MAX_LENGTH,
  EMAIL_TYPES,
  type EmailData,
  type EmailType,
  isSingleLine,
  OPERATIONS_LINE_LIMIT,
  type OperationsEmailType,
  type ProductEmailType,
  parseOutgoingEmail,
  SIGN_IN_INSTANT_RANGE_MS,
} from './types.ts';

// A stand-in for the product name setting.
const PRODUCT = 'İÜ Yoklama';
const PRODUCT_TYPES = (Object.keys(EMAIL_TYPES) as EmailType[]).filter(
  (type): type is ProductEmailType => EMAIL_TYPES[type].product,
);
const OPERATIONS_TYPES = (Object.keys(EMAIL_TYPES) as EmailType[]).filter(
  (type): type is OperationsEmailType => !EMAIL_TYPES[type].product,
);
const render = <T extends ProductEmailType>(
  type: T,
  language: Language,
  data: EmailData[T],
): RenderedEmail => PRODUCT_TEMPLATES[type][language](data, PRODUCT);
// What a transport takes: every rendered e-mail must pass it.
const outgoing = ({ subject, text }: RenderedEmail) =>
  parseOutgoingEmail({
    from: { name: PRODUCT, address: 'yoklama@istanbul.edu.tr' },
    to: 'hoca@istanbul.edu.tr',
    subject,
    text,
  });
const paragraphs = (text: string) => text.split('\n\n');
const valid = (type: EmailType, data: unknown) => EMAIL_TYPES[type].data.safeParse(data).success;

const SIGNED_IN_AT = new Date('2026-10-06T06:58:00Z');
const CODE = { code: '483920', validityMinutes: 10 };

// The golden texts, written by hand from the D14 template table.
const GOLDEN: { [T in ProductEmailType]: [EmailData[T], { [L in Language]: RenderedEmail }] } = {
  sign_in_code: [
    CODE,
    {
      tr: {
        subject: 'İÜ Yoklama giriş kodu',
        text: `Giriş kodun: 483920\nKod 10 dakika geçerli ve yalnız bir kez kullanılır.\n\n${FIXED_WARNING_SENTENCE.tr}`,
      },
      en: {
        subject: 'İÜ Yoklama sign-in code',
        text: `Your sign-in code: 483920\nThe code is valid for 10 minutes and can be used only once.\n\n${FIXED_WARNING_SENTENCE.en}`,
      },
    },
  ],
  application_code: [
    CODE,
    {
      tr: {
        subject: 'İÜ Yoklama başvuru kodu',
        text: `Başvuru kodun: 483920\nKod 10 dakika geçerli ve yalnız bir kez kullanılır. Kodu girince başvurun yönetici onayına gider.\n\n${FIXED_WARNING_SENTENCE.tr}`,
      },
      en: {
        subject: 'İÜ Yoklama application code',
        text: `Your application code: 483920\nThe code is valid for 10 minutes and can be used only once. Once you enter it, your application goes to an administrator for approval.\n\n${FIXED_WARNING_SENTENCE.en}`,
      },
    },
  ],
  application_deletion_code: [
    CODE,
    {
      tr: {
        subject: 'İÜ Yoklama başvuru silme kodu',
        text: `Başvuru silme kodun: 483920\nKod 10 dakika geçerli ve yalnız bir kez kullanılır. Kodu girince başvurun ve başvuru bilgilerin silinir.\n\n${FIXED_WARNING_SENTENCE.tr}`,
      },
      en: {
        subject: 'İÜ Yoklama application deletion code',
        text: `Your application deletion code: 483920\nThe code is valid for 10 minutes and can be used only once. Once you enter it, your application and its details are deleted.\n\n${FIXED_WARNING_SENTENCE.en}`,
      },
    },
  ],
  approval_pending: [
    {},
    {
      tr: {
        subject: 'İÜ Yoklama: başvurun onay bekliyor',
        text: `Başvurun yönetici onayı bekliyor; onaylanınca giriş kodu isteyebilirsin.\n\n${FIXED_WARNING_SENTENCE.tr}`,
      },
      en: {
        subject: 'İÜ Yoklama: your application is awaiting approval',
        text: `Your application is awaiting administrator approval; once it is approved, you can request a sign-in code.\n\n${FIXED_WARNING_SENTENCE.en}`,
      },
    },
  ],
  sign_in_notification: [
    {
      signedInAt: SIGNED_IN_AT,
      client: 'panel',
      deviceLabel: 'Edge, Windows',
      closedSessionLabel: 'Chrome, macOS',
    },
    {
      tr: {
        subject: 'İÜ Yoklama: yeni giriş',
        text: `Hesabına 6 Ekim 2026 Salı, 09:58'de giriş yapıldı.\nTarayıcı: Edge, Windows.\nBu girişle en eski oturumun kapandı: Chrome, macOS.\n\n${IF_NOT_YOU_SENTENCE.tr}\n\n${FIXED_WARNING_SENTENCE.tr}`,
      },
      en: {
        subject: 'İÜ Yoklama: new sign-in',
        text: `Your account was signed in on Tuesday, 6 October 2026 at 09:58 (Istanbul time).\nBrowser: Edge, Windows.\nThis sign-in closed your oldest session: Chrome, macOS.\n\n${IF_NOT_YOU_SENTENCE.en}\n\n${FIXED_WARNING_SENTENCE.en}`,
      },
    },
  ],
  application_approved: [
    {},
    {
      tr: {
        subject: 'İÜ Yoklama: hesabın onaylandı',
        text: `Hesabın onaylandı, uygulamadan giriş yap.\n\n${FIXED_WARNING_SENTENCE.tr}`,
      },
      en: {
        subject: 'İÜ Yoklama: your account has been approved',
        text: `Your account has been approved; sign in from the app.\n\n${FIXED_WARNING_SENTENCE.en}`,
      },
    },
  ],
};

// Device labels: the identity rule's list, any one-line text, and labels that hold a link
// (one at the 60-character limit, one with a full-width dot).
const LINK_LABELS = [
  'evil.com',
  'www.x',
  'a@b.co',
  'http://x',
  "istanbul.edu.tr'ye",
  'Chrome (evil.com)',
  'x.com/yol, Windows',
  `${'x'.repeat(DEVICE_LABEL_MAX_LENGTH - 9)} evil.com`,
  `evil${String.fromCodePoint(0xff0e)}com`,
];
// Labels outside the identity rule's list that hold no link print as they are.
const PLAIN_LABELS = [
  'chrony.json',
  'isletim.wal_arsivi',
  'saat 02:15',
  'Opera, Windows',
  'Edge 120.0, Windows',
];
const oneLineArb = fc
  .string({ unit: 'grapheme', minLength: 1, maxLength: 30 })
  .filter(isSingleLine);
const labelArb = fc.oneof(
  fc.constantFrom(...DEVICE_LABELS),
  oneLineArb,
  fc.constantFrom(...LINK_LABELS),
  fc
    .tuple(oneLineArb, fc.constantFrom('.com', '.tr', '.json', '.edu.tr', '.example'))
    .map(([text, end]) => `${text}${end}`.slice(-DEVICE_LABEL_MAX_LENGTH)),
);
const codeDataArb = fc.record({
  code: fc.stringMatching(/^[0-9]{6}$/),
  validityMinutes: fc.integer({ min: 1, max: 60 }),
});
const DATA_ARBS: { [T in ProductEmailType]: fc.Arbitrary<EmailData[T]> } = {
  sign_in_code: codeDataArb,
  application_code: codeDataArb,
  application_deletion_code: codeDataArb,
  approval_pending: fc.constant({}),
  application_approved: fc.constant({}),
  sign_in_notification: fc.record({
    signedInAt: fc.date({
      min: new Date(SIGN_IN_INSTANT_RANGE_MS.earliest),
      max: new Date(SIGN_IN_INSTANT_RANGE_MS.latest),
      noInvalidDate: true,
    }),
    client: fc.constantFrom('phone', 'panel'),
    deviceLabel: labelArb,
    closedSessionLabel: fc.option(labelArb),
  }),
};
const productArb = fc
  .constantFrom(...PRODUCT_TYPES)
  .chain((type) =>
    DATA_ARBS[type].map(
      (data) => ({ type, data }) as { type: ProductEmailType; data: EmailData[ProductEmailType] },
    ),
  );

describe('Şablonlarda bağlantı olmaz, son paragraf sabit cümledir (no links, the fixed sentence last)', () => {
  it('has a template in every language for each product type and one for each operations type', () => {
    // Six of the eight types are product e-mails.
    expect(PRODUCT_TYPES).toHaveLength(6);
    expect(OPERATIONS_TYPES).toEqual(['operations_warning', 'operations_summary']);
    expect(Object.keys(PRODUCT_TEMPLATES).sort()).toEqual([...PRODUCT_TYPES].sort());
    expect(Object.keys(OPERATIONS_TEMPLATES).sort()).toEqual([...OPERATIONS_TYPES].sort());
    for (const type of PRODUCT_TYPES) {
      expect(Object.keys(PRODUCT_TEMPLATES[type]).sort(), type).toEqual([...LANGUAGES].sort());
    }
    for (const type of OPERATIONS_TYPES) {
      expect(typeof OPERATIONS_TEMPLATES[type], type).toBe('function');
    }
  });

  it.each(PRODUCT_TYPES)('writes %s as the golden texts', (type) => {
    const [data, golden] = GOLDEN[type];
    expect(valid(type, data)).toBe(true);
    for (const language of LANGUAGES) {
      expect(render(type, language, data), language).toEqual(golden[language]);
    }
  });

  it('writes a phone sign-in, and one that closed no session', () => {
    const data: EmailData['sign_in_notification'] = {
      signedInAt: new Date('2026-10-06T06:40:00Z'),
      client: 'phone',
      deviceLabel: 'iPhone, iOS',
      closedSessionLabel: null,
    };
    expect(render('sign_in_notification', 'tr', data).text).toBe(
      `Hesabına 6 Ekim 2026 Salı, 09:40'ta giriş yapıldı.\nTelefon: iPhone, iOS.\n\n${IF_NOT_YOU_SENTENCE.tr}\n\n${FIXED_WARNING_SENTENCE.tr}`,
    );
    expect(render('sign_in_notification', 'en', data).text).toBe(
      `Your account was signed in on Tuesday, 6 October 2026 at 09:40 (Istanbul time).\nPhone: iPhone, iOS.\n\n${IF_NOT_YOU_SENTENCE.en}\n\n${FIXED_WARNING_SENTENCE.en}`,
    );
  });

  it('keeps every product e-mail free of links, its last paragraph the fixed sentence of its language', () => {
    fc.assert(
      fc.property(productArb, ({ type, data }) => {
        expect(valid(type, data)).toBe(true);
        for (const language of LANGUAGES) {
          const other = LANGUAGES.find((each) => each !== language) as Language;
          const email = render(type, language, data);
          const { subject, text } = email;
          expect(() => outgoing(email)).not.toThrow();
          // The sender's call gives the same e-mail, with no link counted.
          const options = { productName: PRODUCT, language };
          expect(renderEmail(type, data, options)).toEqual({ ...email, linkCount: 0 });
          expect(checkLinks(text).linkCount, `${type} ${language}`).toBe(0);
          expect(checkLinks(subject).linkCount).toBe(0);
          expect(paragraphs(text).at(-1)).toBe(FIXED_WARNING_SENTENCE[language]);
          expect(text).not.toContain(FIXED_WARNING_SENTENCE[other]);
          expect(subject).not.toMatch(/[\n\r]/);
          if ('code' in data) expect(subject).not.toContain(data.code);
          // The approval e-mail carries no code: no digit at all.
          if (type === 'application_approved') expect(text).not.toMatch(/\p{Nd}/u);
        }
      }),
      { numRuns: 2000 },
    );
  });

  it('counts the links a product name brings into a product e-mail, for the sender to refuse', () => {
    const [data] = GOLDEN.sign_in_code;
    const times = (text: string, part: string) => text.split(part).length - 1;
    for (const productName of ['yoklama.istanbul.edu.tr', 'www.yoklama']) {
      for (const language of LANGUAGES) {
        const email = renderEmail('sign_in_code', data, { productName, language });
        const named = times(email.subject, productName) + times(email.text, productName);
        expect(named, language).toBeGreaterThan(0);
        expect(email.linkCount, `${productName} ${language}`).toBe(named);
        // A product e-mail keeps its text: the sender refuses it, it does not rewrite it.
        expect(email.text).not.toContain('[adres]');
      }
    }
    // Ground control: the product name of the other tests brings none.
    const plain = renderEmail('sign_in_code', data, { productName: PRODUCT, language: 'tr' });
    expect(plain.linkCount).toBe(0);
  });

  it('refuses a type outside the list, an inherited name among them', () => {
    const options = { productName: PRODUCT, language: 'tr' } as const;
    for (const type of ['nope', 'toString', 'constructor', '__proto__']) {
      expect(() => renderEmail(type as EmailType, {} as never, options), type).toThrow(RangeError);
    }
    // Ground control: a listed type with no data renders.
    expect(renderEmail('approval_pending', {}, options).linkCount).toBe(0);
  });

  it('prints every label of the identity rule as it is, and a label with a link as an unknown device', () => {
    const notification = (deviceLabel: string, closedSessionLabel: string | null = null) => ({
      signedInAt: SIGNED_IN_AT,
      client: 'panel' as const,
      deviceLabel,
      closedSessionLabel,
    });
    for (const label of DEVICE_LABELS) {
      expect(valid('sign_in_notification', notification(label, label)), label).toBe(true);
      const lines = render('sign_in_notification', 'tr', notification(label, label)).text.split(
        '\n',
      );
      expect(lines[1]).toBe(`Tarayıcı: ${label}.`);
      expect(lines[2]).toBe(`Bu girişle en eski oturumun kapandı: ${label}.`);
      expect(render('sign_in_notification', 'en', notification(label)).text).toContain(
        `\nBrowser: ${label}.\n`,
      );
    }
    for (const label of LINK_LABELS) {
      expect(valid('sign_in_notification', notification(label, label)), label).toBe(true);
      for (const language of LANGUAGES) {
        const text = render('sign_in_notification', language, notification(label, label)).text;
        expect(text, label).not.toContain(label);
        expect(text.split(UNKNOWN_DEVICE_LABEL[language])).toHaveLength(3);
      }
    }
    // The spec's words, written out once: the constant must say them.
    expect(render('sign_in_notification', 'tr', notification('evil.com')).text).toContain(
      '\nTarayıcı: Bilinmeyen cihaz.\n',
    );
    expect(render('sign_in_notification', 'en', notification('evil.com')).text).toContain(
      '\nBrowser: Unknown device.\n',
    );
    // Ground control: a label with no link prints as it is, on the list or not.
    for (const label of ['Edge, Windows', ...PLAIN_LABELS]) {
      expect(valid('sign_in_notification', notification(label, label)), label).toBe(true);
      const tr = render('sign_in_notification', 'tr', notification(label, label)).text;
      expect(tr.split('\n').slice(1, 3)).toEqual([
        `Tarayıcı: ${label}.`,
        `Bu girişle en eski oturumun kapandı: ${label}.`,
      ]);
      const en = render('sign_in_notification', 'en', notification(label, label)).text;
      expect(en.split('\n').slice(1, 3)).toEqual([
        `Browser: ${label}.`,
        `This sign-in closed your oldest session: ${label}.`,
      ]);
      for (const language of LANGUAGES) {
        expect(
          render('sign_in_notification', language, notification(label, label)).text,
        ).not.toContain(UNKNOWN_DEVICE_LABEL[language]);
      }
    }
  });

  it('writes any instant the schema takes, and the schema takes none the phrase cannot write', () => {
    const at = (ms: number) => ({ ...GOLDEN.sign_in_notification[0], signedInAt: new Date(ms) });
    for (const ms of [SIGN_IN_INSTANT_RANGE_MS.earliest, SIGN_IN_INSTANT_RANGE_MS.latest]) {
      expect(valid('sign_in_notification', at(ms))).toBe(true);
      for (const language of LANGUAGES) {
        expect(() => render('sign_in_notification', language, at(ms))).not.toThrow();
      }
    }
    expect(
      render('sign_in_notification', 'tr', at(SIGN_IN_INSTANT_RANGE_MS.latest)).text,
    ).toContain('31 Aralık 9999 Cuma, 03:00');
    expect(valid('sign_in_notification', at(SIGN_IN_INSTANT_RANGE_MS.earliest - 1))).toBe(false);
    expect(valid('sign_in_notification', at(SIGN_IN_INSTANT_RANGE_MS.latest + 1))).toBe(false);
  });
});

describe('İşletim e-postaları (operations e-mails)', () => {
  const lines = [
    'Son yedek: 26 saat önce',
    'Ayrıntı: https://panel.example/durum ve www.x.com.',
    "isletim.wal_arsivi gecikti, chrony.json'dan okundu",
    'saat 02:15, sürüm 12.37.0',
  ];

  it.each(OPERATIONS_TYPES)('writes %s in Turkish with each link as [adres]', (type) => {
    const data = { subject: 'Yedek gecikti', lines };
    expect(valid(type, data)).toBe(true);
    const email = OPERATIONS_TEMPLATES[type](data, PRODUCT);
    const kind = type === 'operations_warning' ? 'uyarısı' : 'özeti';
    expect(email.subject).toBe(`İÜ Yoklama işletim ${kind}: Yedek gecikti`);
    expect(email.text.split('\n')).toEqual([
      lines[0],
      'Ayrıntı: [adres] ve [adres].',
      // Ground control: what only looks like a link goes as it is.
      lines[2],
      lines[3],
    ]);
    expect(email.linkCount).toBe(2);
    expect(email.text).not.toContain(FIXED_WARNING_SENTENCE.tr);
  });

  it.each(OPERATIONS_TYPES)(
    'writes a link in the subject of %s as [adres] too, and counts each link once',
    (type) => {
      const one = OPERATIONS_TEMPLATES[type](
        { subject: 'evil.com kapalı', lines: ['Ayrıntı yok'] },
        PRODUCT,
      );
      expect(one.subject).toMatch(/: \[adres\] kapalı$/);
      expect(one.linkCount).toBe(1);
      const three = OPERATIONS_TEMPLATES[type](
        { subject: 'evil.com kapalı', lines: ['bkz. www.x.com', 'a@b.co'] },
        PRODUCT,
      );
      expect(three.text).toBe('bkz. [adres]\n[adres]');
      expect(three.linkCount).toBe(3);
    },
  );

  it.each(OPERATIONS_TYPES)(
    'writes the subject as the body of %s when the lines give nothing to read',
    (type) => {
      for (const lines of [[], [''], ['', ''], ['  ', '\t']]) {
        const data = { subject: 'evil.com haftalık özet', lines };
        expect(valid(type, data), JSON.stringify(lines)).toBe(true);
        const email = OPERATIONS_TEMPLATES[type](data, PRODUCT);
        expect(email.text).toBe(email.subject);
        expect(email.text).toContain('[adres] haftalık özet');
        // The subject's link is one link, though the body repeats it.
        expect(email.linkCount).toBe(1);
      }
      // Ground control: an empty line beside a line with text is kept.
      expect(OPERATIONS_TEMPLATES[type]({ subject: 'x', lines: ['', 'y'] }, PRODUCT).text).toBe(
        '\ny',
      );
    },
  );

  it.each(OPERATIONS_TYPES)(
    'renders any valid data of %s as an e-mail a transport takes',
    (type) => {
      // The worst case: every line full of one-character links, each growing to [adres].
      const worst = {
        subject: 'x'.repeat(200),
        lines: Array.from({ length: OPERATIONS_LINE_LIMIT }, () => '@ '.repeat(500).slice(0, 1000)),
      };
      expect(valid(type, worst)).toBe(true);
      const email = OPERATIONS_TEMPLATES[type](worst, PRODUCT);
      expect(email.linkCount).toBe(OPERATIONS_LINE_LIMIT * 500);
      expect(() => outgoing(email)).not.toThrow();
      fc.assert(
        fc.property(
          fc.record({
            subject: fc
              .string({ minLength: 1, maxLength: 200 })
              .filter((text) => valid(type, { subject: text, lines: [] })),
            lines: fc.array(fc.string({ maxLength: 1000 }), { maxLength: 20 }),
          }),
          (data) => {
            expect(valid(type, data)).toBe(true);
            const email = OPERATIONS_TEMPLATES[type](data, PRODUCT);
            expect(() => outgoing(email)).not.toThrow();
            // The sender's call gives the same Turkish e-mail in either language.
            for (const language of LANGUAGES) {
              const options = { productName: PRODUCT, language };
              expect(renderEmail(type, data, options), language).toEqual(email);
            }
          },
        ),
        { numRuns: 500 },
      );
    },
  );
});
