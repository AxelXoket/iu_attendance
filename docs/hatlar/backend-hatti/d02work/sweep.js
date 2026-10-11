// Sweep plan.html and teknik.html: for each sentence containing a D02 keyword, print nearest id above + sentence.
const fs = require('fs');
const REPO = 'C:/Users/USER/Desktop/iu_attendance/';
const kw = /(dönem|Dönem|takvim|tatil|sınav hafta|ekle-bırak|Ekle-bırak|kilit|Kilit|arşiv|birim|Birim|şube|Şube|derslik|program|Program|telafi|Telafi|oturum|Oturum|ders saati|Ders saati|ders günü|son ders|blok|Blok|çakış|Çakış|haftada|hafta|yapıldı|Yapıldı|yapılan|yapılmay|ders ayar|ders ve program|Ders ve program|başka hocanın|o dersin hocası|dersin hocası|deneme dersi|yıllık|Yıllık|anabilim|hazırlık|çift anadal|son gün|Europe\/Istanbul|İstanbul saati)/;
for (const f of ['plan.html', 'teknik.html']) {
  let html = fs.readFileSync(REPO + f, 'utf8');
  html = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  // walk tags, track latest id
  const re = /<[^>]+>|[^<]+/g; let m, lastId = '', buf = '', out = [];
  const flush = () => { const t = buf.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim(); if (t) out.push([lastIdAtStart, t]); buf=''; };
  let lastIdAtStart = '';
  while ((m = re.exec(html))) {
    const tok = m[0];
    if (tok[0] === '<') {
      const idm = tok.match(/\sid="([^"]+)"/);
      if (/^<\/?(div|li|p|h[1-6]|section|details|summary|ul|ol|pre|nav|header)\b/i.test(tok)) { flush(); }
      if (idm) lastId = idm[1];
      if (!buf) lastIdAtStart = lastId;
    } else { if (!buf.trim()) lastIdAtStart = lastId; buf += tok; }
  }
  flush();
  for (const [id, t] of out) {
    if (/^(Kaynaklar|Sözlük)$/.test(t)) continue;
    const sents = t.split(/(?<=[.;:])\s+(?=[A-ZÇĞİÖŞÜ"(])/);
    for (const s of sents) if (kw.test(s) && s.length > 12) console.log(`${f}#${id} | ${s}`);
  }
}
