const s = require('fs').readFileSync('build-d08.js', 'utf8');
for (const p of ["tükenen", "tükenen iş", "tükenen iş D14", "tükenen iş D14\'", "tükenen iş D14\'ün ölü", "kuyruğuna.',"]) console.log(JSON.stringify(p), s.includes(p));
