// Deterministic library stats: npm registry, npm downloads, ecosyste.ms repo and issue metadata,
// with github.com page and atom feed fallbacks. No api.github.com calls.
// Usage: node libstats.js [extra-package ...]   reads lib/L*.json, writes lib/stats.json and prints a table.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'lib');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'User-Agent': 'iu-yoklama-design-research' };
async function get(url, json = true) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(r.status);
      return json ? await r.json() : await r.text();
    } catch (e) { if (i === 2) return { __error: String(e.message || e) }; await sleep(800 * (i + 1)); }
  }
}
const pkgs = new Map();
for (const f of fs.readdirSync(dir).filter(f => /^L\d+\.json$/.test(f))) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, ''));
  for (const c of j.candidates || []) if (c.package && /^(@[\w.-]+\/)?[\w.-]+$/.test(c.package)) {
    const p = pkgs.get(c.package) || { package: c.package, repo: c.repo || '', files: new Set(), verdicts: new Set() };
    if (!p.repo && c.repo) p.repo = c.repo;
    p.files.add(f.replace('.json', '')); p.verdicts.add(c.verdict); pkgs.set(c.package, p);
  }
}
for (const extra of process.argv.slice(2)) if (!pkgs.has(extra)) pkgs.set(extra, { package: extra, repo: '', files: new Set(['extra']), verdicts: new Set() });

(async () => {
  const out = {};
  const list = [...pkgs.values()];
  let n = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (n < list.length) {
      const p = list[n++];
      const s = { package: p.package, files: [...p.files], verdicts: [...p.verdicts] };
      const doc = await get('https://registry.npmjs.org/' + p.package.replace('/', '%2F'));
      if (doc && !doc.__error) {
        s.version = doc['dist-tags'] && doc['dist-tags'].latest;
        s.next = doc['dist-tags'] && (doc['dist-tags'].next || doc['dist-tags'].beta || doc['dist-tags'].rc || '');
        s.released = doc.time && s.version ? (doc.time[s.version] || '').slice(0, 10) : '';
        s.modified = doc.time ? (doc.time.modified || '').slice(0, 10) : '';
        s.deprecated = !!(doc.versions && s.version && doc.versions[s.version] && doc.versions[s.version].deprecated);
        const repoUrl = doc.repository && (doc.repository.url || doc.repository);
        const m = typeof repoUrl === 'string' && repoUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(\.git)?(#.*)?$/);
        s.repo = p.repo || (m ? `${m[1]}/${m[2]}` : '');
        s.license = doc.license || (doc.versions && s.version && doc.versions[s.version] && doc.versions[s.version].license) || '';
      } else s.npmError = doc ? doc.__error : 'not found on npm';
      if (s.repo) {
        const key = encodeURIComponent(s.repo);
        const r = await get('https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/' + key);
        if (r && !r.__error) { s.stars = r.stargazers_count; s.pushedAt = (r.pushed_at || '').slice(0, 10); s.archived = r.archived; s.openIssues = r.open_issues_count; s.statsSource = 'ecosyste.ms'; }
        const iss = await get('https://issues.ecosyste.ms/api/v1/hosts/GitHub/repositories/' + key);
        if (iss && !iss.__error) {
          s.pastYearIssues = iss.past_year_issues_count; s.pastYearClosedIssues = iss.past_year_issues_closed_count;
          s.pastYearAvgDaysToCloseIssue = iss.past_year_avg_time_to_close_issue != null ? Math.round(iss.past_year_avg_time_to_close_issue / 86400) : null;
          s.pastYearMergedPRs = iss.past_year_pull_requests_merged_count;
        }
        if (s.stars == null) {
          const html = await get(`https://github.com/${s.repo}`, false);
          const mm = typeof html === 'string' && html.match(/id="repo-stars-counter-star"[^>]*title="([\d,]+)"/);
          if (mm) { s.stars = Number(mm[1].replace(/,/g, '')); s.statsSource = 'github.com page'; }
        }
        if (!s.pushedAt) {
          const atom = await get(`https://github.com/${s.repo}/commits.atom`, false);
          const mm = typeof atom === 'string' && atom.match(/<updated>([\d-]+)T/);
          if (mm) s.pushedAt = mm[1];
        }
      }
      out[p.package] = s;
    }
  }));
  // Downloads: bulk endpoint for unscoped names, one by one with backoff for scoped names (npm rate limits).
  const real = list.map(p => p.package).filter(k => out[k] && out[k].version);
  const unscoped = real.filter(k => !k.startsWith('@'));
  for (let i = 0; i < unscoped.length; i += 100) {
    const chunk = unscoped.slice(i, i + 100);
    const r = await get('https://api.npmjs.org/downloads/point/last-week/' + chunk.join(','));
    if (r && !r.__error) for (const k of chunk) { const v = chunk.length === 1 ? r : r[k]; if (v && v.downloads != null) out[k].weeklyDownloads = v.downloads; }
  }
  for (const k of real.filter(k => k.startsWith('@'))) {
    for (let t = 0; t < 5; t++) {
      const r = await get('https://api.npmjs.org/downloads/point/last-week/' + k);
      if (r && !r.__error && r.downloads != null) { out[k].weeklyDownloads = r.downloads; break; }
      await sleep(2000 * (t + 1));
    }
    await sleep(300);
  }
  fs.writeFileSync(path.join(dir, 'stats.json'), JSON.stringify(out, null, 2));
  const rows = Object.values(out).sort((a, b) => a.package.localeCompare(b.package));
  for (const s of rows) console.log([s.package, s.version || '?', s.released || '?', (s.weeklyDownloads ?? '?') + '/wk', (s.stars ?? '?') + '*', 'push ' + (s.pushedAt || '?'), s.archived ? 'ARCHIVED' : '', s.deprecated ? 'DEPRECATED' : '', s.pastYearAvgDaysToCloseIssue != null ? 'close ' + s.pastYearAvgDaysToCloseIssue + 'd' : '', s.npmError || ''].filter(Boolean).join('  '));
})();
