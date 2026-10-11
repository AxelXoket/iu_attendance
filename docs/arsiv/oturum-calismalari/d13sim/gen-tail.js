  {
    key: 'APP', size: 'L',
    title: 'Bileşim kökü uygulamaKur ve süreç türleri',
    files: ['apps/server/src/app.ts', I + 'openapi.ts', ST + 'surec-adimlari.ts', F + 'surec.feature'],
    exports: ['uygulamaKur', 'UygulamaBagimliliklari', 'saatOznesiKur'],
    needs: APP_NEEDS, deps: ['F1', 'F3', 'S1', 'S2'],
    tests: ['HEAD ikizi açılışı durdurmaz', 'Süreç türü kurulumu belirler', 'Kimlik dinleyicileri eklentilerden önce kurulur', 'Ölçü yazıcısı yalnız verilen seçenekle açılır', 'Kimlik dinleyicileri eklentilerden sonra kurulursa senaryo kırmızı olur'],
    notes: 'app.ts kimlik dinleyicilerini eklentilerden önce kurar, apiKur ve bütün <ad>Eklentisi kayıtlarını süreç tablosuna göre bağlar, açılışta yayın bilgisini ve eşik alımını yapar, belge kipinde openapi.ts ile swagger kaydeder; süreç senaryoları, açılış adım kaydı, HEAD ikizi ve dinleyici sırası mutasyonu denetler. Bütün eklentileri beklediği için yalnız uçtan uca paketler ve süreç girişleri bunu bekler.'
  },
  {
    key: 'EK', size: 'S',
    title: 'Eşik kararı ve açılış alımı senaryoları',
    files: [F + 'esik-karari.feature', OR + 'yayin-bilgisi/bozuk.json'],
    exports: [], needs: [], deps: ['S2', 'APP'],
    tests: oldOf('D13-P10').tests,
    notes: oldOf('D13-P10').notes
  },
  {
    key: 'OA', size: 'M',
    title: 'OpenAPI belgesi üretimi ve saklama işi',
    files: ['apps/server/scripts/api/openapi-belgesi-sakla.ts', ST + 'sozlesme-adimlari.ts', F + 'openapi-belgesi.feature'],
    jobs: ['openapi_belgesi_sakla'],
    exports: [], needs: oldOf('D13-P13').needs, deps: ['APP'],
    tests: oldOf('D13-P13').tests,
    notes: oldOf('D13-P13').notes
  },
  {
    key: 'OD', size: 'M',
    title: 'oasdiff kırılma kapısı ve sözleşme iş akışı',
    files: oldOf('D13-P14').files,
    jobs: ['oasdiff_kirilma_denetimi'],
    exports: [], needs: [], deps: ['OA'],
    tests: oldOf('D13-P14').tests,
    notes: oldOf('D13-P14').notes + ' Kapı senaryosunun adımları sozlesme-adimlari.ts içinde olduğu için OpenAPI paketinden sonra gelir.'
  },
  {
    key: 'BT', size: 'M',
    title: 'Bütünleşik doğrulama',
    files: oldOf('D13-P16').files,
    exports: [], needs: oldOf('D13-P16').needs, deps: ['APP'],
    tests: oldOf('D13-P16').tests,
    notes: oldOf('D13-P16').notes
  }
];

const ids = new Map(P.map((p, i) => [p.key, 'D13-P' + String(i + 1).padStart(2, '0')]));
const out = { id: 'D13', packages: P.map(p => ({
  id: ids.get(p.key), title: p.title, files: p.files, tables: p.tables || [], endpoints: p.endpoints || [], jobs: p.jobs || [],
  exports: p.exports, needs: p.needs, tests: p.tests, depends_on: p.deps.map(d => { if (!ids.has(d)) throw new Error('bad dep ' + d); return ids.get(d); }), size: p.size, notes: p.notes
})) };
// self checks: every spec file, export and test exactly once; no dash characters
const cnt = (list, key) => { const m = new Map(); for (const p of out.packages) for (const x of p[key]) m.set(x, (m.get(x) || 0) + 1); return m; };
const errs = [];
const fm = cnt(null, 'files'), em = cnt(null, 'exports'), tm = cnt(null, 'tests');
for (const f of S.files) { const fp = typeof f === 'string' ? f : f.path; if (fm.get(fp) !== 1) errs.push('file ' + fp + ' x' + (fm.get(fp) || 0)); }
for (const [f] of fm) if (!S.files.includes(f) && !f.startsWith('apps/server/migrations/')) errs.push('extra file ' + f);
for (const e of S.exports) if (em.get(e.name) !== 1) errs.push('export ' + e.name + ' x' + (em.get(e.name) || 0));
for (const t of S.tests) if (tm.get(t.name) !== 1) errs.push('test ' + t.name + ' x' + (tm.get(t.name) || 0));
for (const [t] of tm) if (!S.tests.find(x => x.name === t)) errs.push('extra test ' + t);
if (/[\u2013\u2014]/.test(JSON.stringify(out))) errs.push('dash');
if (errs.length) { console.log('SELF CHECK FAILED\n' + errs.join('\n')); process.exit(1); }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + '\n');
console.log('wrote ' + process.argv[2] + ': ' + out.packages.length + ' packages; ' + out.packages.map(p => p.id + '=' + P[out.packages.indexOf(p)].key).join(' '));
