// R12: deterministic package facts (npm registry + GitHub REST API, unauthenticated).
// Usage: node r12_pkgs.js            -> writes r12_pkgs.json and prints a compact table
// Search API is throttled (10 req/min unauthenticated), core API kept under 60 req.
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'r12_pkgs.json');
const NOW = new Date('2026-10-06T00:00:00Z');
const D30 = new Date(NOW - 30 * 864e5).toISOString().slice(0, 10);

const NPM = ['expo', 'react', 'react-native', 'react-native-reanimated', 'react-native-worklets',
  'react-native-gesture-handler', 'moti', '@expo/ui', '@shopify/react-native-skia', 'lottie-react-native',
  'rive-react-native', '@rive-app/react-native', 'expo-haptics', 'react-native-unistyles', 'nativewind',
  'react-native-css', 'tamagui', '@shopify/restyle', '@gorhom/bottom-sheet', 'react-native-screens',
  'expo-router', 'zeego', 'expo-font', 'style-dictionary', '@terrazzo/cli', 'tailwindcss', 'motion',
  'framer-motion', 'radix-ui', '@radix-ui/react-dialog', '@base-ui/react', '@base-ui-components/react',
  'react-aria-components', '@fontsource-variable/inter', 'vite'];

// [owner/repo, doIssueSearch]
const GH = [['software-mansion/react-native-reanimated', 1], ['software-mansion/react-native-gesture-handler', 1],
  ['nandorojo/moti', 1], ['Shopify/react-native-skia', 1], ['lottie-react-native/lottie-react-native', 1],
  ['rive-app/rive-react-native', 1], ['rive-app/rive-nitro-react-native', 1], ['jpudysz/react-native-unistyles', 1], ['nativewind/nativewind', 1],
  ['tamagui/tamagui', 1], ['Shopify/restyle', 1], ['gorhom/react-native-bottom-sheet', 1],
  ['software-mansion/react-native-screens', 1], ['nandorojo/zeego', 1], ['style-dictionary/style-dictionary', 1],
  ['terrazzoapp/terrazzo', 1], ['tailwindlabs/tailwindcss', 0], ['motiondivision/motion', 1],
  ['radix-ui/primitives', 1], ['mui/base-ui', 1], ['adobe/react-spectrum', 0], ['expo/expo', 0],
  ['design-tokens/community-group', 0], ['fontsource/fontsource', 0]];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = { 'User-Agent': 'r12-research', Accept: 'application/vnd.github+json' };
async function j(url, headers = {}) {
  const r = await fetch(url, { headers });
  if (!r.ok) return { __status: r.status };
  return r.json();
}
(async () => {
  const out = { fetched_at: new Date().toISOString(), npm: {}, gh: {}, expoSdk57: {} };
  for (const p of NPM) {
    const u = 'https://registry.npmjs.org/' + p.replace('/', '%2F');
    const d = await j(u);
    if (d.__status) { out.npm[p] = { url: u, status: d.__status }; continue; }
    const tags = d['dist-tags'] || {};
    const t = d.time || {};
    const tagInfo = {};
    for (const [k, v] of Object.entries(tags)) tagInfo[k] = { v, at: (t[v] || '').slice(0, 10) };
    out.npm[p] = { url: u, tags: tagInfo, modified: (t.modified || '').slice(0, 10), deprecated: (d.versions?.[tags.latest]?.deprecated) || null,
      peer: d.versions?.[tags.latest]?.peerDependencies || null };
    if (p === 'expo') {
      const v57 = Object.keys(d.versions).filter(v => /^57\.\d+\.\d+$/.test(v));
      out.expoSdk57.versions = v57.map(v => v + '@' + (t[v] || '').slice(0, 10));
      out.expoSdk57.latest = v57[v57.length - 1];
    }
  }
  if (out.expoSdk57.latest) {
    const u = `https://unpkg.com/expo@${out.expoSdk57.latest}/bundledNativeModules.json`;
    const b = await j(u);
    out.expoSdk57.bundledUrl = u;
    const want = ['react', 'react-native', 'react-native-reanimated', 'react-native-worklets', 'react-native-gesture-handler',
      '@shopify/react-native-skia', 'lottie-react-native', 'expo-haptics', 'expo-font', 'expo-router', 'react-native-screens',
      '@expo/ui', 'react-native-svg', 'expo-camera', 'expo-keep-awake', 'react-native-safe-area-context', 'expo-glass-effect', 'rive-react-native', '@gorhom/bottom-sheet'];
    out.expoSdk57.bundled = Object.fromEntries(want.map(k => [k, b[k] || null]));
  }
  for (const [repo] of GH) {
    const u = 'https://api.github.com/repos/' + repo;
    const d = await j(u, H);
    if (d.__status) { out.gh[repo] = { url: u, status: d.__status }; continue; }
    const c = await j(u + '/commits?per_page=1', H);
    const lastCommit = Array.isArray(c) && c[0] ? c[0].commit.committer.date.slice(0, 10) : null;
    out.gh[repo] = { url: u, stars: d.stargazers_count, pushed: (d.pushed_at || '').slice(0, 10), lastCommit,
      archived: d.archived, openIssuesAndPRs: d.open_issues_count, license: d.license?.spdx_id || null };
  }
  for (const [repo, s] of GH) {
    if (!s || out.gh[repo].status) continue;
    const q = (x) => `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${repo} is:issue ${x}`)}&per_page=1`;
    const opened = await j(q(`created:>=${D30}`), H); await sleep(6500);
    const closed = await j(q(`closed:>=${D30}`), H); await sleep(6500);
    out.gh[repo].issues30d = { since: D30, opened: opened.total_count ?? ('err' + opened.__status), closed: closed.total_count ?? ('err' + closed.__status) };
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  // compact print
  console.log('EXPO 57:', out.expoSdk57.latest, '| versions:', (out.expoSdk57.versions || []).slice(-3).join(' '));
  console.log('BUNDLED:', JSON.stringify(out.expoSdk57.bundled));
  for (const [p, x] of Object.entries(out.npm)) console.log('NPM', p, x.status || JSON.stringify(x.tags), x.deprecated ? 'DEPRECATED:' + x.deprecated : '');
  for (const [r, x] of Object.entries(out.gh)) console.log('GH', r, x.status || `stars=${x.stars} lastCommit=${x.lastCommit} pushed=${x.pushed} archived=${x.archived} open=${x.openIssuesAndPRs} 30d=${JSON.stringify(x.issues30d || '')}`);
})();
