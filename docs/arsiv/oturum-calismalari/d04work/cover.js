// Checks every spec test name of a module appears in exactly one package and lists unknown names.
const D = process.argv[2], id = process.argv[3] || 'D04';
const S = require(D + '/spec/' + id + '.json'), P = require(D + '/packages/' + id + '.json');
const seen = new Map();
for (const p of P.packages) for (const t of p.tests) seen.set(t, (seen.get(t) || []).concat(p.id));
const names = S.tests.map(t => t.name);
const missing = names.filter(n => !seen.has(n)), dup = [...seen].filter(([, v]) => v.length > 1), extra = [...seen.keys()].filter(n => !names.includes(n));
console.log('spec tests', names.length, 'missing', missing, 'duplicated', dup, 'not in spec', extra);
