// The sign-in notification (D01): when, in Istanbul time, and on which device the account
// was signed in, the session this sign-in closed if any, then the if-not-you sentence and
// the fixed warning sentence, each a paragraph of its own. A device label that holds a
// link is written as an unknown device, so no link reaches the e-mail.

import type { BilingualText } from '@iu-attendance/contracts/shared';
import type { Language } from '@iu-attendance/core/shared/language';
import { FIXED_WARNING_SENTENCE, IF_NOT_YOU_SENTENCE } from '../fixed-texts.ts';
import { formatIstanbulTime } from '../format.ts';
import { checkLinks } from '../link-check.ts';
import type { ProductTemplate } from './index.ts';

export const UNKNOWN_DEVICE_LABEL: BilingualText = Object.freeze({
  tr: 'Bilinmeyen cihaz',
  en: 'Unknown device',
});

const shown = (label: string, language: Language) =>
  checkLinks(label).linkCount > 0 ? UNKNOWN_DEVICE_LABEL[language] : label;

export const signInNotificationTemplate: ProductTemplate<'sign_in_notification'> = Object.freeze({
  tr: ({ signedInAt, client, deviceLabel, closedSessionLabel }, productName) => ({
    subject: `${productName}: yeni giriş`,
    text: [
      `Hesabına ${formatIstanbulTime(signedInAt.getTime(), 'tr')} giriş yapıldı.`,
      `${client === 'phone' ? 'Telefon' : 'Tarayıcı'}: ${shown(deviceLabel, 'tr')}.`,
      ...(closedSessionLabel === null
        ? []
        : [`Bu girişle en eski oturumun kapandı: ${shown(closedSessionLabel, 'tr')}.`]),
      '',
      IF_NOT_YOU_SENTENCE.tr,
      '',
      FIXED_WARNING_SENTENCE.tr,
    ].join('\n'),
  }),
  en: ({ signedInAt, client, deviceLabel, closedSessionLabel }, productName) => ({
    subject: `${productName}: new sign-in`,
    text: [
      `Your account was signed in on ${formatIstanbulTime(signedInAt.getTime(), 'en')} (Istanbul time).`,
      `${client === 'phone' ? 'Phone' : 'Browser'}: ${shown(deviceLabel, 'en')}.`,
      ...(closedSessionLabel === null
        ? []
        : [`This sign-in closed your oldest session: ${shown(closedSessionLabel, 'en')}.`]),
      '',
      IF_NOT_YOU_SENTENCE.en,
      '',
      FIXED_WARNING_SENTENCE.en,
    ].join('\n'),
  }),
});
