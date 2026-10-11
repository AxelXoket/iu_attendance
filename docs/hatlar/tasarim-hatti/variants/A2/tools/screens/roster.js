// One class in an Aşama 2 lesson with a 15-minute window (QR and backup code): one row per state the panel table has to
// show, plus two plain Var rows (17 students). Every figure on the page that counts students is counted from these rows:
// the panel screen, the key figure in the usage map (Gece mavisi nerede) and the panel type sample (Tipografi). The rows
// follow plan.html#gun-kayit-etiketleri: a QR record carries Doğrulanmış (the usual label, not drawn in the table), a
// QR'sız record in a QR lesson stays İncelemede until the instructor approves it, Cihaz doğrulanmadı and İkinci profil
// records count, Kendi beyanı exists only without a window, and a decision other than a plain Var shows its reason
// (gerekçe). Owner: F1b.
const NAMES = ['Ayşe Yıldız', 'Berk Korkmaz', 'Burak Işık', 'Can Şahin', 'Cem Polat', 'Çağla Kaya', 'Çınar Özkan', 'Defne Ünal', 'Deniz Akın', 'Elif Demir', 'Emre Aslan', 'Gizem Tunç', 'İrem Bulut', 'Kaan Çelik', 'Ömer Kılıç', 'Şule Aydın', 'Zeynep Koç'];
if (new Set(NAMES).size !== NAMES.length) throw new Error('student names must be distinct');
const COLL = new Intl.Collator('tr');
const STUDENTS = NAMES.map((name, i) => ({ name, no: '0412230' + String(100 + ((i * 37) % 53) * 17).padStart(3, '0') })).sort((a, b) => COLL.compare(a.name, b.name));
// The state of each row by its position in the Turkish name order, so the eleven rows in view show every final status and
// every server decision. dec: server decision, fin: final status (none while the decision is open), why: the decision's
// reason, tags: labels other than Doğrulanmış, sel: the row drawn selected.
const STATES = [
  { dec: 'var', fin: 'var' },
  { dec: 'incelemede', why: "QR'lı derste QR'sız", tags: ["QR'sız"] },
  { fin: 'gorevli' },
  { dec: 'var', fin: 'var', tags: ['İkinci profil'] },
  { dec: 'incelemede', why: "2'lik sınır aşıldı", tags: ['Saat doğrulanamadı'], sel: true },
  { fin: 'yok' },
  { dec: 'beklemede', why: 'teyit bekliyor' },
  { dec: 'ret', fin: 'yok', why: 'yoklamada sınıfta değil' },
  { fin: 'elle' },
  { fin: 'belgeli' },
  { fin: 'muaf' },
  { dec: 'var', fin: 'var', tags: ['Yedek kodlu'] },
  { dec: 'var', fin: 'var', why: 'hoca onayladı', tags: ["QR'sız"] },
  { dec: 'var', fin: 'var', tags: ['Saat doğrulanamadı'] },
  { dec: 'var', fin: 'var', tags: ['Cihaz doğrulanmadı'] },
  { fin: 'yok' },
  { dec: 'var', fin: 'var' }
];
if (STATES.length !== STUDENTS.length) throw new Error('one state per student');
const GROUP = { var: 'var', yok: 'yok', gorevli: 'diger', belgeli: 'diger', elle: 'diger', muaf: 'diger' };
const ROWS = STUDENTS.map((s, k) => {
  const sp = STATES[k];
  // Record times fall inside the 10:00 to 10:15 window.
  return { ...s, dec: sp.dec || null, fin: sp.fin || null, why: sp.why || '', tags: sp.tags || [], sel: !!sp.sel, t: sp.dec ? '10:' + String(1 + ((k * 5) % 14)).padStart(2, '0') : '', f: sp.fin ? GROUP[sp.fin] : 'bekleyen' };
});
const N = ROWS.length;
const cnt = f => ROWS.filter(r => r.f === f).length;
const cntDec = d => ROWS.filter(r => r.dec === d).length;
const cntFin = d => ROWS.filter(r => r.fin === d).length;
const RECORDS = ROWS.filter(r => r.t).length, HEAD = RECORDS - 1, DIFF = RECORDS - HEAD;
const FLAGGED = DIFF > 3 && DIFF > HEAD * 0.05; // plan.html#kararlar-kafa-sayisi: more than 3 people and more than 5 percent
// The open-decision group is named with the plan's own decision names (never "karar bekleyen", which plan.html#devam
// uses for an AKSİS result).
const GROUPS = [['var', 'Var'], ['yok', 'Yok'], ['bekleyen', 'İncelemede ve beklemede'], ['diger', 'Düzeltme ve muaf']];
if (GROUPS.reduce((a, [f]) => a + cnt(f), 0) !== N) throw new Error('panel groups do not add up to ' + N);
// Plan rules the rows must keep (a broken row stops the build), and the variety the table exists to show.
for (const r of ROWS) {
  if (r.tags.includes('Kendi beyanı')) throw new Error(r.name + ': Kendi beyanı exists only in a lesson without a window');
  if (r.tags.includes("QR'sız") && r.dec === 'var' && !r.why) throw new Error(r.name + ": a QR'sız record counts only after the instructor approves it");
  if (r.dec && r.dec !== 'var' && !r.why) throw new Error(r.name + ': a ' + r.dec + ' decision shows its reason');
  if (r.dec === 'ret' && r.fin !== 'yok') throw new Error(r.name + ': a refused record ends as Yok');
}
for (const k of ['var', 'yok', 'gorevli', 'belgeli', 'elle', 'muaf']) if (!cntFin(k)) throw new Error('no row with the final status ' + k);
for (const d of ['var', 'beklemede', 'incelemede', 'ret']) if (!cntDec(d)) throw new Error('no row with the decision ' + d);
module.exports = { ROWS, N, cnt, cntDec, cntFin, RECORDS, HEAD, DIFF, FLAGGED, GROUPS };
