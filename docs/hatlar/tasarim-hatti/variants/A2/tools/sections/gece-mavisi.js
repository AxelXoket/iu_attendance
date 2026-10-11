// Section 'Gece mavisi nerede' (#gece-mavisi): the three rules, the usage map (role, place, step, reason), the never
// list and the measured share in one line. The map, the list, the steps and the budget are read from tokens.json; the
// measured shares stay under each drawn screen (coverage.json), and the Röntgen switch in Telefon ekranları numbers the
// roles on those screens. Owner: F1b.
const { T, COV } = require('../lib/inputs');
const { esc, tr, resolve } = require('../lib/format');
const { I } = require('../lib/icons');
const { stamp } = require('../lib/marks');
const { section, sub, ref, anchor } = require('../lib/section');
const { rich } = require('../lib/refs');
const { cnt } = require('../screens/roster');

// The usage map and the never list are the token file's own (tokens.json accentUsage and accentNever, kept by its owner);
// this section only draws them. Role numbers are the pins of the Röntgen view.
const ROLES = T.accentUsage;
const NEVER = T.accentNever;
const WORDS = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'on bir', 'on iki'];
// Possessive suffix after a number written in digits ("%13,6'sı"): it follows the last spoken word of the number.
const ONES = ['ı', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'], TENS = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
const suffix = s => {
  const part = s.includes(',') ? s.split(',')[1] : s.replace(/^%/, '');
  const n = parseInt(part, 10);
  if (!n) return 'ı';
  if (n % 10) return ONES[n % 10];
  if (n % 100) return TENS[(n / 10) % 10];
  return n % 1000 ? 'ü' : 'i';
};

// One lesson of the drawn class (Veri Yapıları, 10:00 ile 11:50) with the 15-minute window the screens count down: the
// filled midnight blue stays on the student's screen only while the window is open.
const LESSON = { from: '10:00', to: '11:50', window: ['10:00', '10:15'] };
const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function lessonLine() {
  const ink = mins(LESSON.window[1]) - mins(LESSON.window[0]), total = mins(LESSON.to) - mins(LESSON.from);
  const share = tr(ink / total * 100, 1);
  return 'Bir derste dolu gece mavisi öğrencinin ekranında yalnız pencere açıkken durur: ' + total + ' dakikalık derste ' + ink + ' dakika (%' + share + "'" + suffix(share) + ').';
}
// Measured share: one line here, the bars under each drawn screen. Families as tools/measure.js counts them.
function coverageLine() {
  const b = T.coverageBudget;
  // This version's budget (the owner's direction note, 6 October 2026): it is redefined when midnight blue widens.
  const widen = ' Gece mavisi genişleyince bütçe yeniden tanımlanır (' + anchor('acik', 'acik-gece-mavisi', 'Açık noktalar, Gece mavisinin genişletilmesi') + ').';
  if (!COV) return 'Ölçüm henüz alınmadı; bu sürümün bütçesi telefon ekranında %' + b.phone + ', panelde %' + b.panel + '.' + widen;
  const all = ['1440', '390'].flatMap(w => Object.values(COV[w] || {}));
  const banned = Math.max(...all.map(p => p.yasak || 0));
  return 'Bu sürümün bütçesi telefon ekranında %' + b.phone + ', panelde %' + b.panel + '; her ekranın ölçülen payı altındaki çubukta durur (' + ref('ekranlar', 'Telefon ekranları') + ', ' + ref('panel', 'Panel ekranı') + ').' + widen + ' Ölçüm 390 ve 1440 px\'te: ' + esc(b.method) + ' Sarı ve yeşil ailesi bütün ekranlarda ' + (banned ? '%' + tr(banned, 2) : 'sıfır piksel') + '.';
}

function geceMavisi() {
  const MINI = ['<span class="mini-btn"></span>', '<span class="mini-ring"></span>', '<span class="mini-link">bağlantı</span>', '<span class="mini-mark"></span>', '<span class="mini-ctl"><span class="b"></span><span class="s"></span></span>', '<span class="mini-fig num">' + cnt('var') + '</span>', stamp('var', 'Var', 'check'), '<span class="mini-prog"></span>'];
  const n = ROLES.length;
  return section('gece-mavisi', 'Nötr ölçek gece mavisinin tonunu taşıdığı için alt ton her gri yüzeyde hissedilir (' + ref('renk', 'Renk') + '); renk olarak gece mavisi yalnız aşağıdaki ' + WORDS[n] + ' rolde görünür. İlke: ' + ref('ilkeler', 'İlkeler') + ', Kâğıt ve mürekkep.',
    '<div class="thesis"><p class="thesis-q">Bir ekranda gece mavisi nereye düşüyorsa, kullanıcının <em>yapacağı ya da yaptığı şey</em> oradadır.</p>' +
    '<ol class="rules-3"><li><span class="k">01</span><p><b>Tek dolu düğme.</b> Her ekranda en çok bir dolu gece mavisi düğme vardır: birincil eylem. İşaretli kutu, açık anahtarın rayı ve ilerleme çubuğu bu sayıya girmez; ikincil düğmeler gri çerçeveli, hayalet düğmeler çerçevesizdir.</p></li>' +
    '<li><span class="k">02</span><p><b>Seçim işaretle gösterilir.</b> Seçili öğe gri kalır; seçimi gece mavisi çizgi anlatır (rol 4).</p></li>' +
    '<li><span class="k">03</span><p><b>Renkli zemin yoktur.</b> Gece mavisi zemine sürülmez; durumlar da zeminsizdir. İki istisna kırmızıdır: yoğun tabloda Yok ve Ret gül zemin alır (' + ref('renk', 'Renk') + ', Durum renkleri), uyarı seviyesi 4 dolu kırmızı şerittir (' + ref('durumlar', 'Durumlar') + ', Uyarı seviyeleri).</p></li></ol></div>' +
    '<div class="gm-meta"><p class="body">' + coverageLine() + ' ' + lessonLine() + '</p>' +
    '<a class="btn btn-secondary btn-sm xr-go" href="#ekranlar" data-xray-go>' + I('visibility', 20) + 'Röntgen\'i aç</a></div>' +
    sub('Kullanım haritası', n + ' rol · Röntgen bu numaraları ekranlarda gösterir', '<div class="u-list">' + ROLES.map((u, i) =>
      '<div class="u-row"><span class="u-pin">' + (i + 1) + '</span><div class="u-demo">' + MINI[i] + '</div><p class="u-role">' + esc(u.role) + '<span class="u-step">' + u.step + ' · ' + resolve(u.step) + '</span></p><p class="u-where">' + rich(u.where) + '</p><p class="u-why">' + rich(u.why) + '</p></div>').join('') + '</div>') +
    // The list is the first version's baseline: the owner's direction note of 6 October 2026, quoted as the decision.
    sub('Bu sürümde gece mavisi olmayan yerler', NEVER.length + ' madde', '<p class="never-karar">Karar, 6 Ekim 2026: bu liste ilk sürümün tabanıdır. Frontend aşamasında gece mavisi yazılarda, panel içlerinde ve yüzeylerde kademeli olarak genişler; kırık beyaz ve griden gece mavisine geçişler ve panel arka aydınlatması birlikte tasarlanacak (' + anchor('acik', 'acik-gece-mavisi', 'Açık noktalar') + ').</p>' +
      '<p class="never-lead">Bu sürümde gece mavisi şuralarda yoktur:</p><ul class="never">' + NEVER.map(t => '<li>' + I('block', 20) + '<p>' + rich(t) + '</p></li>').join('') + '</ul>'));
}
geceMavisi.title = 'Gece mavisi nerede';
geceMavisi.ROLES = ROLES;
geceMavisi.WORDS = WORDS;
geceMavisi.suffix = suffix;
module.exports = geceMavisi;
