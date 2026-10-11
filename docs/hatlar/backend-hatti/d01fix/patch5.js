const fs = require('fs');
const edit = (f, pairs) => { let s = fs.readFileSync(f, 'utf8'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(f + ' missing: ' + a.slice(0, 90)); s = s.split(a).join(b); } fs.writeFileSync(f, s); };
edit('g2b.js', [["degisim_bekleyen rolünü yalnız /ben, /cikis ve üç değişim ucu kabul eder.", "degisim_bekleyen rolünü yalnız /ben, /cikis ve iki değişim ucu (POST /v1/kimlik/cihaz-degisimi ile QR yenileme ve talebin ret ucunda vazgeçme) kabul eder."]]);
edit('g2c.js', [["Kısıtlı oturum yalnız /ben, /cikis ve değişim uçlarına girdiğinden telefon takvimi indiremez, bu yüzden yoklama ekranını yalnız elle ya da QR ile bilinen oturumda açabilir. Öneri:", "Kısıtlı oturum yalnız /ben, /cikis ve değişim uçlarına girdiğinden telefon ders ve oturum takvimini indiremez. Öneri:"]]);
console.log('ok');
