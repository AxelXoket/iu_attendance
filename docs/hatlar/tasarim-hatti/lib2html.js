// Generates the library tables of tasarim.html (the <!--@lib-tables--> include, doc/kutuphaneler.html) from lib/final.json
// and lib/stats.json. Every number comes from stats.json; nothing is retyped. Compact form (decision D10): per topic the
// pick, the version to use, one sentence of reason, the second choice and three measured numbers (npm's last release
// with its date, weekly downloads, stars; a repository's stars are printed once). Each table sits closed in a <details>
// whose summary states the decision in one line (decision E10, final.json "summaries"). Rejected candidates, risks,
// sources, resolved conflicts and overturned picks stay in final.json and go to the research side with --arastirma.
// The font files are checked against the type tokens in variants/A2/tokens.json: the phone's static files must cover
// every weight a phone style uses (and its Bold Text weight when the style carries one), the panel's Plex Mono imports
// must be exactly the weights panel Mono styles use. Design values are never retyped here (decision E1).
// Usage: node lib2html.js <out.html> [--arastirma <research-fragment.html>] [--final <final.json>] [--tokens <tokens.json>]
//   (--final and --tokens default to lib/final.json and variants/A2/tokens.json; the overrides exist for the tests)
const fs = require('fs'), path = require('path');
const D = __dirname;
const argv = process.argv.slice(2);
const optv = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const F = JSON.parse(fs.readFileSync(optv('--final') || path.join(D, 'lib', 'final.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(path.join(D, 'lib', 'stats.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync(optv('--tokens') || path.join(D, 'variants', 'A2', 'tokens.json'), 'utf8').replace(/^\uFEFF/, ''));
const OUT = argv[0];
const RES = argv.includes('--arastirma') ? argv[argv.indexOf('--arastirma') + 1] : null;
if (!OUT || OUT.startsWith('--') || (argv.includes('--arastirma') && !RES)) { console.log('usage: node lib2html.js <out.html> [--arastirma <research-fragment.html>]'); process.exit(1); }

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const date = d => { if (!d) return ''; const [y, m, g] = d.split('-'); return `${+g} ${AY[+m - 1]} ${y}`; };
const num = n => Number(n).toLocaleString('tr-TR');
const problems = [];

// Package names: mono, no chip box; each piece stays whole, a line may break only after the scope, after
// "react-native-" or at a space.
const pkgHtml = name => '<code class="lib-pkg">' + esc(name).split(/(?<=\/)|(?<=^react-native-)|(?<=\/react-native-)|(?<= )/).map(p => `<span>${p}</span>`).join('<wbr>') + '</code>';
// Inline markup in final.json strings: `code` and [label](href). Hrefs may only point inside this page, to plan.html,
// teknik.html or an https page; anything else is reported and the build fails.
const okHref = h => /^#[a-z0-9-]+$/.test(h) || /^(plan|teknik)\.html#[a-z0-9-]+$/.test(h) || /^https:\/\//.test(h);
const inline = (s, pkg = false) => String(s ?? '').split('`').map((seg, i) => {
  if (i % 2) return pkg ? pkgHtml(seg) : `<code>${esc(seg)}</code>`;
  return esc(seg).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
    if (!okHref(href)) problems.push('bad link target: ' + href);
    return `<a href="${href}"${/^https:/.test(href) ? ' rel="noopener"' : ''}>${label}</a>`;
  });
}).join('');
const plain = s => String(s ?? '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

// A repository's stars are printed with the first package that comes from it; later packages name the repository only.
const repoCount = {};
for (const e of [...F.phone, ...F.panel, ...F.shared]) for (const p of e.packages || []) if (S[p] && S[p].repo) repoCount[S[p].repo] = (repoCount[S[p].repo] || 0) + 1;
const repoSeen = new Set();
const measure = e => {
  if (e.external) return `<p class="lib-m"><span>${esc(e.external)}</span></p>`;
  const list = e.packages || [];
  if (!list.length) return '<p class="lib-m"><span>Ek paket yok</span></p>';
  const lines = [], rowRepos = new Set();
  for (const p of list) {
    const s = S[p];
    if (!s || !s.version) { problems.push('no measurement for ' + p); continue; }
    const who = list.length > 1 ? `${esc(p.replace(/^@[^/]+\//, ''))}: ` : '';
    lines.push(`${who}npm'de ${esc(s.version)} · ${date(s.released)}`);
    let tail = s.weeklyDownloads != null ? `${num(s.weeklyDownloads)} indirme/hafta` : 'indirme ölçülemedi';
    const r = s.repo;
    if (r && !repoSeen.has(r)) {
      repoSeen.add(r);
      if (s.stars != null) tail += ` · ${num(s.stars)} yıldız` + (repoCount[r] > 1 ? ` (${esc(r)} deposu)` : '');
    } else if (r && !rowRepos.has(r)) tail += ` · ${esc(r)} deposu`;
    if (r) rowRepos.add(r);
    lines.push(tail);
  }
  return `<p class="lib-m">${lines.map(l => `<span>${l}</span>`).join('')}</p>`;
};

// "yok: X" picks show X; a sentence-case first letter (Turkish rules) unless X starts with code.
const capTr = s => (/^[a-zçğıöşü]/.test(s) ? s[0].toLocaleUpperCase('tr-TR') + s.slice(1) : s);
const pickHtml = e => {
  const m = String(e.pick).match(/^yok(?::\s*(.*))?$/i);
  const main = m ? (m[1] ? inline(capTr(m[1]), true) : 'Yok') : inline(e.pick, true);
  return `<p class="lib-pick">${main}</p>` + (e.version ? `<p class="lib-v">${inline(e.version, true)}</p>` : '') + measure(e);
};

// Font weights the type tokens need. A style is Mono when tokens.json says so (family field) or, as the DTCG generator
// reads it, when its use names Plex Mono. A style's Bold Text weight (decision E4) is read from boldText, when present.
const famOf = s => (s.family ? (/mono/i.test(s.family) ? 'mono' : 'sans') : /Plex Mono/.test(s.use || '') ? 'mono' : 'sans');
const need = { phone: { sans: new Set(), mono: new Set() }, phoneBold: { sans: new Set(), mono: new Set() }, panel: { sans: new Set(), mono: new Set() } };
for (const side of ['phone', 'panel']) for (const s of (T.type && T.type[side]) || []) {
  need[side][famOf(s)].add(+s.weight);
  const b = s.boldText ?? (s.$extensions && s.$extensions.boldText);
  if (side === 'phone' && b != null) need.phoneBold[famOf(s)].add(+b);
}
const boldKnown = need.phoneBold.sans.size + need.phoneBold.mono.size > 0;
if (!need.phone.sans.size || !need.panel.sans.size) problems.push('tokens.json has no phone or panel type styles');

// Explicit table roles keep the table semantics when narrow screens restack rows as cards (display: block). Each table
// sits closed in a <details>; its summary carries the one-line decision from final.json "summaries". The table never
// scrolls sideways (it shrinks, then restacks as cards below 900 px), so its box is not a keyboard scroll region; the
// font subsetting command wraps inside its box for the same reason.
const sumLine = (id, key, title, n) => {
  const s = (F.summaries || {})[key];
  if (!s) problems.push('no summary line for ' + key);
  return `<summary><span><b id="${id}-t">${esc(title)}</b>${n ? ` · ${n} konu` : ''}: ${inline(s)}</span></summary>`;
};
const table = (id, key, title, rows) => {
  let h = `<details class="kt-det" id="${id}">${sumLine(id, key, title, rows.length)}<div>\n<div class="lib-wrap"><table class="lib-table" role="table" aria-labelledby="${id}-t">` +
    '<colgroup><col class="c-konu"><col class="c-secim"><col class="c-neden"><col class="c-yedek"></colgroup>' +
    '<thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Konu</th><th scope="col" role="columnheader">Seçim, sürüm ve ölçüm</th><th scope="col" role="columnheader">Neden</th><th scope="col" role="columnheader">Yedek</th></tr></thead><tbody role="rowgroup">\n';
  for (const e of rows) {
    if (!e.why) problems.push('no reason for ' + e.category);
    h += `<tr role="row"><th scope="row" role="rowheader">${esc(e.category)}</th><td role="cell" data-label="Seçim">${pickHtml(e)}</td><td role="cell" data-label="Neden">${inline(e.why)}</td><td role="cell" data-label="Yedek">${e.second ? inline(e.second, true) : '<span class="lib-none">Yok</span>'}</td></tr>\n`;
  }
  return h + '</tbody></table></div>\n</div></details>\n';
};

const fontsBlock = () => {
  const f = F.fonts, mz = f.measured;
  const rel = f.releases.map(r => {
    const s = S[r.package];
    if (!s || !s.version) { problems.push('no measurement for ' + r.package); return ''; }
    return `<a href="${esc(r.url)}" rel="noopener">${esc(r.family)} ${esc(s.version)} sürümü</a> (${date(s.released)}, <code>${esc(r.zip)}</code>)`;
  });
  const and = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' ve ' + a[a.length - 1] : a.join(''));
  // Coverage against the type tokens: every weight a phone style uses, and its Bold Text weight, has a file.
  for (const fam of ['sans', 'mono']) {
    const prefix = fam === 'sans' ? 'IBMPlexSans' : 'IBMPlexMono';
    const have = new Set(f.files.filter(x => x.file.startsWith(prefix)).map(x => +x.weight));
    for (const w of [...need.phone[fam], ...need.phoneBold[fam]]) if (!have.has(w)) problems.push(`phone ${prefix} ${w} is used by a type style but has no TTF file`);
    if (boldKnown) for (const x of f.files.filter(x => x.file.startsWith(prefix))) {
      const boldOnly = need.phoneBold[fam].has(+x.weight) && !need.phone[fam].has(+x.weight);
      if (!!x.boldText !== boldOnly) problems.push(`${x.file}: final.json marks boldText ${!!x.boldText}, the type tokens say ${boldOnly}`);
      if (!need.phone[fam].has(+x.weight) && !need.phoneBold[fam].has(+x.weight)) problems.push(`${x.file} is embedded but no phone style or Bold Text weight uses it`);
    }
  }
  const weights = fam => {
    const set = f.files.filter(x => x.file.startsWith(fam));
    return and(set.filter(x => !x.boldText).map(x => x.weight)) + ', Kalın Metin için ' + and(set.filter(x => x.boldText).map(x => x.weight));
  };
  const names = f.files.map(x => x.file.replace(/\.ttf$/, ''));
  const loop = `for f in ${names.slice(0, 4).join(' ')} \\\n         ${names.slice(4).join(' ')}; do\n  pyftsubset "$f.ttf" \\\n    --unicodes="${f.unicodes}" \\\n    --layout-features-=liga --name-IDs='*' \\\n    --output-file="${f.outDir}$f.ttf"\ndone`;
  return `<details class="kt-det" id="kutuphaneler-yazi">${sumLine('kutuphaneler-yazi', 'fonts', f.title, 0)}<div>\n` +
    `<p class="body">IBM'in GitHub sürümlerinden statik TTF: ${rel.join(' ve ')}, ZIP içinde <code>${esc(f.dir)}</code> klasörü. Sans ve Mono için Regular, Medium, SemiBold ve Bold, sekiz dosya: Sans ${weights('IBMPlexSans')}; Mono ${weights('IBMPlexMono')} (<a href="#tipografi">Tipografi</a>).</p>\n` +
    `<p class="body">Dosyalar bir kez alt kümeye indirilip <code>${esc(f.outDir)}</code> altına konur. Aralık panelin latin ve latin-ext alt kümelerinin birleşimidir; <code>--layout-features-=liga</code> f ile i bağını çıkarır, <code>--name-IDs='*'</code> bütün ad kayıtlarını korur, çünkü iOS Medium ve SemiBold dosyalarını aileye 16 ve 17 numaralı kayıtla bağlar.</p>\n` +
    `<div class="lib-cmd"><pre><code>${esc(loop)}</code></pre></div>\n` +
    `<p class="body">app.json'daki <code>expo-font</code> eklentisinde Android için <code>android.fonts</code> altında "IBM Plex Sans" ve "IBM Plex Mono" ailesi açılır, her dosya <code>path</code> ve <code>weight</code> ile <code>fontDefinitions</code> içine yazılır; iOS için <code>ios.fonts</code> dosya yollarını alır, aile adını dosyadan okur. ${date(mz.on)} denemesi (${esc(mz.tool)}): sekiz dosya toplam ${num(mz.totalBytes)} bayt; Türkçe harfler ve eşit genişlikli rakamlar duruyor, liga yok.</p>\n` +
    `<p class="body">Yapı farkı: panelin Fontsource dosyaları Google Fonts yapısıdır (Sans ${esc(mz.panelSans)}, Mono ${esc(mz.panelMono)}), bu dosyalar IBM yapısı (Sans ${esc(mz.phoneSans)}, Mono ${esc(mz.phoneMono)}); aile aynı, yapı ayrı. Aynı yapı istenirse telefon Google Fonts'un statik dosyalarını ya da panel IBM'in WOFF2 dosyalarını alır. Plex Sans'ın statik dosyaları Kasım 2024'ten beri değişmedi; bunlar paket değil, depoya kopyalanan varlık.</p>\n</div></details>\n`;
};

// The panel imports Plex Mono only at the weights panel Mono styles use (Sans is the variable file, every weight).
{
  const row = F.panel.find(e => e.category === 'Yazı tipi');
  const listed = new Set([...String(row && row.version).matchAll(/`(\d{3})\.css`/g)].map(m => +m[1]));
  const want = need.panel.mono;
  if ([...listed].sort().join() !== [...want].sort().join()) problems.push(`panel Plex Mono imports ${[...listed].join(', ')} differ from the weights panel Mono styles use: ${[...want].join(', ')}`);
}

// The plan's own sentences, quoted and linked (decision E8).
const intro = `<div class="kt-oku">\n<p class="body">Ölçüt <a href="${esc(F.rule)}">plan.html, Sürdürülebilirlik ilkeleri</a>: "Son 12 ayda sürüm çıkarmamış paket bakımı durmuş sayılır." ve "Tek kişinin bakımındaki her paketin yedeği belli". Expo SDK 57'nin sabitlediği paketler <code>npx expo install</code> ile o sürümde, öbürleri tam sürümle kurulur; kullanılacak sürüm seçimin altında, npm'deki en yeni sürüm ölçüm satırındadır.</p>\n` +
  `<p class="body">Ölçümler ${date(F.measuredOn)} tarihinde bir betikle npm kayıt defterinden, npm indirme sayacından ve ecosyste.ms'ten alındı; bir deponun yıldızı o depodan gelen ilk satırda yazılır. Elenen adaylar, gerekçeleri ve kaynakları depo dışındaki araştırma dosyasında (L1 ile L5).</p>\n</div>\n`;

let html = intro + table('kutuphaneler-telefon', 'phone', 'Telefon uygulaması', F.phone) + fontsBlock() + table('kutuphaneler-panel', 'panel', 'Web paneli', F.panel) + table('kutuphaneler-ortak', 'shared', 'İki tarafta ortak', F.shared);

// Research side: everything the compact tables leave out, so nothing is lost when it leaves the design document.
const label = u => {
  let m;
  if ((m = u.match(/^https:\/\/registry\.npmjs\.org\/(.+?)(?:\/(\d[^/]*))?$/))) return `npm kaydı: ${decodeURIComponent(m[1])}${m[2] ? ' ' + m[2] : ''}`;
  if ((m = u.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/))) return `${m[2]} deposu (${m[3]}): ${m[4].split('/').pop()}`;
  if ((m = u.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(pull|issues|discussions)\/(\d+)/))) return `${m[2]} #${m[4]}`;
  if ((m = u.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\?/))) return `${m[2]} issue araması`;
  if ((m = u.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/commits/))) return `${m[2]} commit geçmişi`;
  if ((m = u.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/(.+)$/))) return `${m[2]} sürümü ${decodeURIComponent(m[3])}`;
  try { const x = new URL(u); const last = x.pathname.split('/').filter(Boolean).pop() || ''; return `${x.hostname.replace(/^www\./, '')}${last ? ': ' + decodeURIComponent(last) : ''}${x.hash ? ' ' + x.hash : ''}`; } catch { return u; }
};
const researchRow = e => `<div class="kk-row"><h4>${esc(e.category)}</h4><p><b>Seçim.</b> ${esc(plain(e.pick))}</p>` +
  (e.version ? `<p><b>Sürüm.</b> ${esc(plain(e.version))}</p>` : '') +
  (e.home ? `<p><b>Yeri.</b> ${esc(e.home)}</p>` : '') +
  (e.detail ? `<p>${esc(e.detail)}</p>` : '') +
  (e.second ? `<p><b>Yedek.</b> ${esc(plain(e.second))}</p>` : '') +
  (e.risk ? `<p><b>Risk.</b> ${esc(e.risk)}</p>` : '') +
  ((e.rejected || []).length ? `<ul>${e.rejected.map(r => `<li><code>${esc(r.package)}</code>: ${esc(r.why)}</li>`).join('')}</ul>` : '') +
  ((e.sources || []).length ? `<p class="kk-src">${e.sources.map(u => `<a href="${esc(u)}" rel="noopener">${esc(label(u))}</a>`).join(' · ')}</p>` : '') + '</div>\n';
const research = () => `<section id="kutuphane-kararlari">\n<h2>Kütüphane kararları</h2>\n<p class="summary">Tasarım belgesinin Kütüphaneler bölümündeki seçimlerin ayrıntısı: uzun gerekçe, risk, elenen adaylar ve kaynaklar; sonra başka yere taşınan konular (tasarım belgesinin başka bölümü ya da teknik.html), çözülen çelişkiler, eleştirmenin değiştirdiği seçimler ve notlar. Kaynak lib/final.json, sayılar lib/stats.json (${date(F.measuredOn)}).</p>\n` +
  `<h3>Telefon uygulaması</h3>\n${F.phone.map(researchRow).join('')}<h3>Web paneli</h3>\n${F.panel.map(researchRow).join('')}<h3>İki tarafta ortak</h3>\n${F.shared.map(researchRow).join('')}` +
  `<h3>Başka yere taşınanlar</h3>\n${F.moved.map(researchRow).join('')}` +
  `<h3>Çözülen çelişkiler</h3>\n<ul>${F.conflicts.map(c => `<li><b>${esc(c.topic)}.</b> ${esc(c.decision)} ${esc(c.why)}</li>`).join('\n')}</ul>\n` +
  `<h3>Eleştirmenin değiştirdiği seçimler</h3>\n<ul>${F.overturned.map(o => `<li><b>${esc(o.category)}.</b> ${esc(o.old)} yerine ${esc(o.new)}. ${esc(o.why)}</li>`).join('\n')}</ul>\n` +
  `<h3>Notlar</h3>\n<ul>${F.notes.map(n => `<li>${esc(n)}</li>`).join('\n')}</ul>\n</section>\n`;

// Gates: no dash characters, no Inter, no "sahip" (decision E9), no View-bar success recipe (E7), every package
// measured, every link target allowed.
const outs = [['design', html]];
if (RES) outs.push(['research', research()]);
for (const [name, h] of outs) {
  if (/[\u2013\u2014]/.test(h)) problems.push(name + ': U+2013 or U+2014 in output');
  if (/\bInter\b/.test(h)) problems.push(name + ': the word Inter in output (decision D11)');
  if (/sahip|sahib/i.test(h)) problems.push(name + ': "sahip" in output (decision E9)');
  if (/View\b[^.]{0,40}çubu|çubuklarıyla/.test(h)) problems.push(name + ': View bars in the success recipe (decision E7)');
}
if (problems.length) { console.error('lib2html.js FAILED:\n  ' + [...new Set(problems)].join('\n  ')); process.exit(1); }
fs.writeFileSync(OUT, html);
if (RES) fs.writeFileSync(RES, outs[1][1]);
const words = h => h.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').split(/\s+/).filter(Boolean).length;
console.log(`wrote ${OUT}: ${F.phone.length} phone, ${F.panel.length} panel, ${F.shared.length} shared rows, ${words(html)} words` + (RES ? `; ${RES}: ${words(outs[1][1])} words` : ''));
