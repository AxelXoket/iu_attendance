// One class of 53 students. Every figure on the page that counts students is counted from these rows: the panel
// screen, the key figure in the role map (Gece mavisi nerede) and the panel type sample (Tipografi). Owner: F1b.
const FIRST = ['Ayşe', 'Berk', 'Burak', 'Can', 'Cem', 'Ceren', 'Çağla', 'Çınar', 'Defne', 'Deniz', 'Doruk', 'Ece', 'Ege', 'Elif', 'Emre', 'Eren', 'Esra', 'Fatma', 'Furkan', 'Gizem', 'Gökçe', 'Hakan', 'Hande', 'Ilgın', 'Irmak', 'İlayda', 'İrem', 'İsmail', 'Kaan', 'Kerem', 'Kübra', 'Melike', 'Mehmet', 'Merve', 'Nehir', 'Oğuz', 'Onur', 'Ömer', 'Özge', 'Pelin', 'Rana', 'Selin', 'Sena', 'Serkan', 'Şeyma', 'Şule', 'Tuna', 'Tuğba', 'Umut', 'Ümran', 'Yasin', 'Zehra', 'Zeynep'];
const LAST = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Özcan', 'Korkmaz', 'Çakır', 'Erdoğan', 'Yavuz', 'Acar', 'Şen', 'Aktaş', 'Güler', 'Yalçın', 'Güneş', 'Bozkurt', 'Bulut', 'Keskin', 'Ünal', 'Turan', 'Gül', 'Özer', 'Işık', 'Kaplan', 'Avcı', 'Tekin', 'Taş', 'Uysal', 'Ateş', 'Çiftçi', 'Karaca', 'Tunç', 'Erdem', 'Duman', 'Uçar', 'Akın'];
if (FIRST.length !== 53 || LAST.length !== 53 || new Set(LAST).size !== 53 || new Set(FIRST).size !== 53) throw new Error('name lists must hold 53 distinct names');
const COLL = new Intl.Collator('tr');
const STUDENTS = FIRST.map((f, i) => ({ name: f + ' ' + LAST[(i * 17 + 5) % 53], no: '0412230' + String(100 + ((i * 37) % 53) * 17).padStart(3, '0') })).sort((a, b) => COLL.compare(a.name, b.name));
// Exceptions by position in the sorted list (so the first screenful shows every state); everyone else is Var.
const SPECIAL = { 2: { fin: 'gorevli' }, 4: { dec: 'incelemede', tags: ['Saat doğrulanamadı', 'İkinci profil'], sel: true }, 6: { fin: 'yok' }, 7: { dec: 'beklemede', tags: ['Kendi beyanı'] }, 9: { dec: 'ret', fin: 'yok', tags: ['İkinci profil'] }, 11: { fin: 'elle' }, 23: { fin: 'belgeli' }, 31: { fin: 'muaf' }, 40: { dec: 'incelemede', tags: ['Cihaz doğrulanmadı'] }, 47: { fin: 'yok' } };
const VARTAGS = { 1: ["QR'sız"], 15: ['Yedek kodlu'], 28: ["QR'sız"], 36: ['Saat doğrulanamadı'] };
const GROUP = { var: 'var', yok: 'yok', gorevli: 'diger', belgeli: 'diger', elle: 'diger', muaf: 'diger' };
const ROWS = STUDENTS.map((s, k) => {
  const sp = SPECIAL[k] || { dec: 'var', fin: 'var', tags: VARTAGS[k] || [] };
  const hasRecord = !!sp.dec;
  return { ...s, dec: sp.dec || null, fin: sp.fin || null, tags: sp.tags || [], sel: !!sp.sel, t: hasRecord ? '10:' + String(1 + ((k * 7) % 14)).padStart(2, '0') : '', f: sp.fin ? GROUP[sp.fin] : 'bekleyen' };
});
const N = ROWS.length;
const cnt = f => ROWS.filter(r => r.f === f).length;
const cntDec = d => ROWS.filter(r => r.dec === d).length;
const cntFin = d => ROWS.filter(r => r.fin === d).length;
const RECORDS = ROWS.filter(r => r.t).length, HEAD = 46, DIFF = RECORDS - HEAD;
const FLAGGED = DIFF > 3 && DIFF > HEAD * 0.05; // plan.html#hile-otomatik-kabul-kurali: more than 3 people and more than 5 percent
const GROUPS = [['var', 'Var'], ['yok', 'Yok'], ['bekleyen', 'Karar bekleyen'], ['diger', 'Düzeltme ve muaf']];
if (GROUPS.reduce((a, [f]) => a + cnt(f), 0) !== N) throw new Error('panel groups do not add up to ' + N);
module.exports = { ROWS, N, cnt, cntDec, cntFin, RECORDS, HEAD, DIFF, FLAGGED, GROUPS };
