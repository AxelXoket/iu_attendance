// L2 metadata collector: npm registry (version, publish time, deps), npm downloads, ecosyste.ms (stars, last push).
// Usage: node l2meta.js  -> writes L2-meta.json next to this file and prints a compact table.
const fs = require('fs'), path = require('path');
const PKGS = [
  'react-native-unistyles', 'uniwind', 'nativewind', 'react-native-css', 'tamagui', '@tamagui/core', '@shopify/restyle',
  'lucide-react-native', 'phosphor-react-native', '@expo/vector-icons', 'expo-symbols', '@material-symbols/svg-400',
  'material-symbols', '@react-native-vector-icons/common', '@react-native-vector-icons/material-symbols',
  '@react-native-vector-icons/material-design-icons', 'react-native-vector-icons',
  'react-native-svg', 'react-native-svg-transformer', '@svgr/cli',
  'expo-font', '@expo-google-fonts/inter', '@expo-google-fonts/ibm-plex-sans',
  'expo-image', 'react-native-safe-area-context', 'react-native-edge-to-edge',
  'expo-system-ui', 'expo-status-bar', 'expo-navigation-bar', 'expo-blur', 'expo-glass-effect',
  'style-dictionary', '@terrazzo/cli',
];
const TAGS_ONLY = ['react-native', 'expo'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, asText) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'iu-yoklama-research' } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return asText ? r.text() : r.json();
    } catch (e) { if (i === 2) return { __err: String(e.message || e) }; await sleep(800); }
  }
}
function repoOf(m) {
  const r = m && m.repository; let u = typeof r === 'string' ? r : (r && r.url) || '';
  if (u.startsWith('github:')) return u.slice(7);
  const mm = u.match(/github\.com[/:]([^/]+)\/([^/#]+?)(\.git)?(#.*)?$/) || u.match(/github\.com[/:]([^/]+)\/([^/#]+)/);
  if (mm) return mm[1] + '/' + mm[2].replace(/\.git$/, '');
  if (/^[\w.-]+\/[\w.-]+$/.test(u)) return u;
  return '';
}
(async () => {
  const out = { fetchedAt: new Date().toISOString(), packages: {}, tags: {}, repos: {}, expoBundled: null };
  for (const name of TAGS_ONLY) out.tags[name] = await get(`https://registry.npmjs.org/-/package/${name}/dist-tags`);
  for (const name of PKGS) {
    const enc = name.replace('/', '%2F');
    const p = await get(`https://registry.npmjs.org/${enc}`);
    if (!p || p.__err) { out.packages[name] = { missing: true, err: p && p.__err }; continue; }
    const tags = p['dist-tags'] || {}; const latest = tags.latest; const m = (p.versions || {})[latest] || {};
    const dl = await get(`https://api.npmjs.org/downloads/point/last-week/${name}`);
    const times = p.time || {};
    // last stable releases (no prerelease) to judge cadence
    const stable = Object.keys(times).filter(v => /^\d+\.\d+\.\d+$/.test(v)).sort((a, b) => new Date(times[b]) - new Date(times[a])).slice(0, 4).map(v => v + '@' + times[v].slice(0, 10));
    out.packages[name] = {
      latest, latestTime: (times[latest] || '').slice(0, 10), modified: (times.modified || '').slice(0, 10), created: (times.created || '').slice(0, 10),
      tags, recentStable: stable, license: m.license || p.license, repo: repoOf(m) || repoOf(p), deprecated: m.deprecated || null,
      peer: m.peerDependencies || {}, deps: Object.keys(m.dependencies || {}).slice(0, 12), weekly: dl && dl.downloads, homepage: m.homepage || p.homepage || '',
    };
  }
  const repos = [...new Set(Object.values(out.packages).map(x => x.repo).filter(Boolean).concat(['google/material-design-icons', 'phosphor-icons/core']))];
  for (const r of repos) {
    const d = await get(`https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/${encodeURIComponent(r)}`);
    out.repos[r] = d && !d.__err ? { full: d.full_name, stars: d.stargazers_count, pushed: (d.pushed_at || '').slice(0, 10), openIssues: d.open_issues_count, archived: d.archived, license: d.license, synced: (d.last_synced_at || '').slice(0, 10) } : { err: d && d.__err || 'not found' };
  }
  const expoLatest = out.tags.expo && out.tags.expo.latest;
  if (expoLatest) {
    const b = await get(`https://cdn.jsdelivr.net/npm/expo@${expoLatest}/bundledNativeModules.json`);
    out.expoBundled = { expo: expoLatest, map: b };
  }
  fs.writeFileSync(path.join(__dirname, 'L2-meta.json'), JSON.stringify(out, null, 1));
  console.log('tags', JSON.stringify(out.tags));
  for (const [n, x] of Object.entries(out.packages)) {
    if (x.missing) { console.log(`${n}: MISSING ${x.err || ''}`); continue; }
    const rr = out.repos[x.repo] || {};
    console.log(`${n} | ${x.latest} @ ${x.latestTime} | mod ${x.modified} | dl/wk ${x.weekly} | ${x.license} | ${x.repo} | stars ${rr.stars} push ${rr.pushed} issues ${rr.openIssues} arch ${rr.archived}${x.deprecated ? ' | DEPRECATED: ' + x.deprecated : ''}`);
    const otherTags = Object.entries(x.tags).filter(([k]) => k !== 'latest').map(([k, v]) => k + '=' + v).join(', ');
    console.log(`   tags: ${otherTags || '-'} | stable: ${x.recentStable.join(' ')} | peer: ${JSON.stringify(x.peer)}`);
  }
  for (const r of ['google/material-design-icons', 'phosphor-icons/core']) console.log(r, JSON.stringify(out.repos[r]));
  if (out.expoBundled && out.expoBundled.map && !out.expoBundled.map.__err) {
    const keep = ['react-native', 'react-native-svg', 'react-native-safe-area-context', 'react-native-edge-to-edge', 'expo-image', 'expo-font', 'expo-symbols', 'expo-system-ui', 'expo-status-bar', 'expo-navigation-bar', 'expo-blur', 'expo-glass-effect', '@expo/vector-icons', 'react-native-reanimated', 'react-native-worklets', 'react-native-screens', 'react-native-nitro-modules'];
    console.log('expo ' + expoLatest + ' bundledNativeModules:', JSON.stringify(Object.fromEntries(keep.map(k => [k, out.expoBundled.map[k]]))));
  } else console.log('bundledNativeModules not fetched', JSON.stringify(out.expoBundled));
})();
