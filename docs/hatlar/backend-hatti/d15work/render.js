// Render an HTML doc into the validator's text form, one block per line, ids marked as {#id}.
// Inline tags become a space (as the validator does); block tags become a newline.
const fs = require('fs');
const [,, src, out] = process.argv;
let html = fs.readFileSync(src, 'utf8');
html = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
const BLOCK = /^(p|li|tr|td|th|h[1-6]|div|section|article|header|footer|nav|main|aside|table|thead|tbody|ul|ol|dl|dt|dd|blockquote|details|summary|br|hr|figure|figcaption|pre|caption)$/i;
html = html.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (m, close, tag, attrs) => {
  const idm = attrs.match(/\sid="([^"]+)"/);
  const mark = idm ? ` {#${idm[1]}} ` : ' ';
  return BLOCK.test(tag) ? '\n' + mark : mark;
});
html = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ');
html = html.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const lines = html.split('\n').map(l => l.replace(/[ \t\r\f\v]+/g, ' ').trim()).filter(l => l.length);
fs.writeFileSync(out, lines.map((l, i) => l).join('\n'), 'utf8');
console.log(out, lines.length, 'lines');
