// The link check (D14, Baglanti denetimi): e-mails carry no links. The text is cut into
// tokens at whitespace; a token, with its leading and trailing ( ) [ ] < > , ; : . ! ? and
// quote marks (" ' « » “ ” ‘ ’) and … stripped, and a Turkish suffix after an apostrophe
// (istanbul.edu.tr'ye) set aside, is a link when it has a scheme (:// anywhere, or http:,
// https:, ftp:, mailto: at its start), starts with www., holds an @, or is a host name:
// two or more dot-separated labels of letters (any script), digits and hyphens with an
// optional :port and an optional /path, ?query or #fragment, the last label an IANA
// top-level domain (the tlds package, pinned) or a special-use name. Case does not count.
// A product e-mail with a link is refused by the sender; any other e-mail goes with each
// link replaced by [adres], its punctuation and suffix kept.

import tlds from 'tlds' with { type: 'json' };

const PLACEHOLDER = '[adres]';
const LEAD = /^[()[\]<>,;:.!?"'«»“”‘’…]*/;
const TRAIL = /[()[\]<>,;:.!?"'«»“”‘’…]*$/;
// A suffix of letters after an apostrophe: 'ye, ’a, 'dan.
const SUFFIX = /['’]\p{L}+$/u;
const SCHEME = /:\/\/|^(?:https?|ftp|mailto):/i;
const HOST = /^(?:[\p{L}\p{N}-]+\.)+([\p{L}\p{N}-]+)(?::\d+)?(?:[/?#]\S*)?$/u;
/** RFC 6761 special-use names, and local, onion and internal. */
export const SPECIAL_USE_NAMES = [
  'example',
  'invalid',
  'localhost',
  'test',
  'local',
  'onion',
  'internal',
] as const;
const TOP_LEVEL = new Set<string>([...tlds, ...SPECIAL_USE_NAMES]);

function isLink(token: string): boolean {
  if (SCHEME.test(token) || /^www\./i.test(token) || token.includes('@')) return true;
  const host = HOST.exec(token);
  return host !== null && TOP_LEVEL.has((host[1] as string).toLowerCase());
}

/** How many links the text holds, and the text with each one replaced by [adres]. */
export function checkLinks(text: string): { linkCount: number; cleanText: string } {
  let linkCount = 0;
  const cleanText = text.replace(/\S+/g, (token) => {
    const lead = (LEAD.exec(token) as RegExpExecArray)[0].length;
    const trail = (TRAIL.exec(token.slice(lead)) as RegExpExecArray)[0].length;
    const core = token.slice(lead, token.length - trail);
    const suffix = SUFFIX.exec(core)?.[0] ?? '';
    if (!isLink(core.slice(0, core.length - suffix.length))) return token;
    linkCount += 1;
    return token.slice(0, lead) + PLACEHOLDER + suffix + token.slice(token.length - trail);
  });
  return { linkCount, cleanText };
}
