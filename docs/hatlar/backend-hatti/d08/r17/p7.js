// Align round, part 7: DDL evidence sentence after running d08/pg/ddl-test-r18.mjs. Exact-once.
const fs = require('fs'), f = __dirname + '/../build-d08.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('count ' + n + ' for: ' + a.slice(0, 90)); s = s.replace(a, () => b); };
rep(`yoklama_saklama ana satırı silince çocuklar CASCADE ile gitti; iki yetki satırı bilerek bozulunca ilgili denetim kırmızı oldu (betikler d08/pg/ddl-test.mjs ve d08/pg/ddl-test-r17.mjs).');`,
    `yoklama_saklama ana satırı silince çocuklar CASCADE ile gitti; iki yetki satırı bilerek bozulunca ilgili denetim kırmızı oldu. Bütünleştirme turunda yeniden adlandırılan zaman sütunları ve kilit_ani ile aynı denetimler yeniden geçti; saklama sorgusu yoklama_saklama altında yalnız D08 tablolarına dokunarak kilidi sınırdan eski 133 satırı 3 partide sildi, kilidi boş ya da sınırdan yeni 266 satır kaldı, yetim çocuk 0; aynı rol bir D02 tablosunu okuyamadı (42501); sorgudaki kilit_ani süzgeci bilerek kaldırılınca denetim kırmızı oldu; dönemli LISTE_SATIRI tetikleyeni kabul edildi, dönemli DUZELTME reddedildi (betikler d08/pg/ddl-test.mjs, ddl-test-r17.mjs ve make-r18.js ile üretilen ddl-test-r18.mjs).');`);
fs.writeFileSync(f, s);
console.log('p7 ok');
