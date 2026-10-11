// Print inventory items (decided, gaps, contradictions, entities, endpoints, jobs, touches) of module X matching a regex.
const fs = require('fs');
const [id, pat, max] = process.argv.slice(2);
const I = JSON.parse(fs.readFileSync(__dirname + '/../../inv/' + id + '.json', 'utf8'));
const re = new RegExp(pat, 'i');
const groups = { K: I.decided, B: I.gaps, C: I.contradictions, N: I.entities, E: I.endpoints, J: I.jobs, T: I.touches_other_domains };
for (const [t, arr] of Object.entries(groups)) for (const x of arr || []) { const s = JSON.stringify(x); if (re.test(s)) console.log(t, s.slice(0, Number(max) || 1500)); }
