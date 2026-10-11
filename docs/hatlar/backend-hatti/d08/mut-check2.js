// Which constants c in T - floor((T*p + c)/100) survive the teknik table (p 70/80) vs the full table (p 0..100)?
const hakTanim = (T, p) => { let k = T; while (k > 0 && (T - k) * 100 < p * T) k--; return k; };
const survive = (ps) => { const s = []; for (let c = 0; c <= 120; c++) { let ok = true; for (const p of ps) { for (let T = 0; T <= 1000 && ok; T++) if (T - Math.floor((T * p + c) / 100) !== hakTanim(T, p)) ok = false; if (!ok) break; } if (ok) s.push(c); } return s; };
console.log('constants passing p=70,80 table :', survive([70, 80]).join(','));
console.log('constants passing p=0..100 table:', survive([...Array(101).keys()]).join(','));
