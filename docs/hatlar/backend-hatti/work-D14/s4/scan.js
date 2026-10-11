const S = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const txt = JSON.stringify(S);
for (const p of ['destek.ts', 'pg_advisory_xact_lock', '05:15', '04:10', 'fromDrizzle(veritabani,', '(istek)', 'her kod http 500', 'app.ts kurucusu', '<UTC zaman>', 'iki anahtarlı', 'yayinBilgisiYukle', 'ilk 4 bayt', 'adresle ilgili başka kilit']) {
  const hits = []; let i = -1;
  while ((i = txt.indexOf(p, i + 1)) !== -1) hits.push(txt.slice(Math.max(0, i - 90), i + 70));
  console.log('##', p, hits.length); hits.slice(0, 6).forEach(h => console.log('   ', h));
}
console.log(S.exports.map(e => e.name).join(', '));
