const crypto = require('crypto');
const s = 'AXNiLTIwMjdiAQGSj258Gns-mkAbLD1OX2AAAQIDBAUGBwgJCgsMDQ4PAAABoQqlywCCm42nPdGk06qxixd-TUa6lZUqU7A8KP6pwHOqquHSag';
const b = Buffer.from(s, 'base64url');
console.log('chars', s.length, 'bytes', b.length);
console.log('version', b[0]);
console.log('kid', JSON.stringify(b.subarray(1, 9).toString('latin1')));
console.log('ozneTuru', b[9]);
const u = b.subarray(10, 26).toString('hex');
console.log('ozne', `${u.slice(0,8)}-${u.slice(8,12)}-${u.slice(12,16)}-${u.slice(16,20)}-${u.slice(20)}`);
console.log('deger', b.subarray(26, 42).toString('hex'));
const ms = b.readBigUInt64BE(42);
console.log('saatMs', ms.toString(), new Date(Number(ms)).toISOString());
const key = Buffer.alloc(32, 0x07);
const mac = crypto.createHmac('sha256', key).update(b.subarray(0, 50)).digest();
console.log('mac matches', mac.equals(b.subarray(50, 82)));
console.log('expected 2026-10-05T06:00:00Z ms =', Date.UTC(2026, 9, 5, 6, 0, 0));
// Istanbul 09:00 = 06:00Z
// formula example
const k = x => Math.ceil(x / 10000);
const S = Date.UTC(2026,9,5,6,0,0), q = 300, g = 7*60000;
const lo = S + g - k(g), hi = S + g + q + k(g+q);
const ist = t => new Date(t + 3*3600000).toISOString().slice(11,23);
console.log('ileri araligi (Istanbul)', ist(lo), ist(hi), 'pay', q + k(g));
console.log('k(1 gun)', k(86400000), 'k(7 gun)', k(7*86400000));
// UUIDv7 check of sample ozne: version nibble
console.log('ozne version nibble', u[12], 'variant', u[16]);
