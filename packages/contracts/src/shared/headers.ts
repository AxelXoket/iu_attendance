import type { Language } from './language.ts';

// Header names in one list (headers and cookies table), plus the standard header
// that carries the request language.
export const HEADERS = {
  appVersion: 'X-App-Version',
  updateId: 'X-Update-Id',
  platform: 'X-Platform',
  channel: 'X-Channel',
  installId: 'X-Install-Id',
  clockRequest: 'X-Clock-Request',
  background: 'X-Background',
  panelVersion: 'X-Panel-Version',
  requestId: 'X-Request-Id',
  clockAttestation: 'X-Clock-Attestation',
  acceptLanguage: 'Accept-Language',
} as const;

// Cookie names: identity sets the session cookie, projection sets its own. The
// __Host- prefix requires Path=/, so the two cookies differ by name.
export const COOKIES = {
  session: '__Host-attendance-session',
  projection: '__Host-attendance-projection',
} as const;

// Built by the root hook from the X- headers and Accept-Language without rejecting
// anything: a broken or missing header is null; background is true for
// X-Background: 1; language comes from selectLanguage and is never null.
export type ClientInfo = {
  appVersion: string | null;
  updateId: string | null;
  platform: 'android' | 'ios' | null;
  channel: 'play' | 'github' | 'appstore' | 'testflight' | null;
  installId: string | null;
  panelVersion: string | null;
  background: boolean;
  language: Language;
};
