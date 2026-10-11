// L2 pass 2: prerelease dates, missing downloads, sizes, Material Symbols sharp inventory, icon stroke caps.
const fs = require('fs'), path = require('path');
const get = async (u, text) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: { 'user-agent': 'iu-yoklama-research' } }); if (r.status === 404) return null; if (!r.ok) throw new Error(r.status); return text ? r.text() : r.json(); } catch (e) { if (i === 2) return { __err: String(e.message || e) }; await new Promise(r => setTimeout(r, 900)); } } };
const out = {};
(async () => {
  // 1. specific version dates
  const want = { nativewind: ['5.0.0-rc.0', '4.0.1'], 'react-native-css': ['3.1.0-rc.0', '3.0.0'], tamagui: ['2.0.0', '3.0.0-beta.1604.1'], 'react-native-unistyles': ['3.0.0'], uniwind: ['1.0.0'], 'lucide-react-native': ['1.0.0'], '@shopify/restyle': ['2.0.0'], 'react-native-edge-to-edge': ['1.0.0'], '@expo/vector-icons': ['15.0.0'] };
  out.dates = {};
  for (const [p, vs] of Object.entries(want)) {
    const j = await get(`https://registry.npmjs.org/${p.replace('/', '%2F')}`);
    out.dates[p] = Object.fromEntries(vs.map(v => [v, j && j.time ? (j.time[v] || 'n/a').slice(0, 10) : 'err']));
    if (p === 'react-native-unistyles' && j) out.unistylesPeerMeta = j.versions[j['dist-tags'].latest].peerDependenciesMeta;
    if (p === 'nativewind' && j) { const rc = j.versions['5.0.0-rc.0']; out.nw5peer = rc && rc.peerDependencies; }
  }
  // 2. downloads that came back empty, plus new packages
  out.dl = {};
  for (const p of ['react-native-svg-transformer', '@expo-google-fonts/inter', '@terrazzo/cli', '@zoontek/react-native-navigation-bar', '@phosphor-icons/core', 'lucide-static']) {
    const d = await get(`https://api.npmjs.org/downloads/point/last-week/${p}`); out.dl[p] = d && d.downloads;
  }
  const zn = await get('https://registry.npmjs.org/@zoontek%2Freact-native-navigation-bar');
  if (zn && !zn.__err) { const l = zn['dist-tags'].latest; out.zoontekNav = { latest: l, time: (zn.time[l] || '').slice(0, 10), created: (zn.time.created || '').slice(0, 10), peer: zn.versions[l].peerDependencies, repo: (zn.versions[l].repository || {}).url, desc: zn.description }; }
  // 3. unpacked sizes
  out.size = {};
  for (const p of ['lucide-react-native', 'phosphor-react-native', '@material-symbols/svg-400', 'react-native-svg', '@expo/vector-icons']) {
    const j = await get(`https://registry.npmjs.org/${p.replace('/', '%2F')}/latest`); out.size[p] = j && j.dist ? { v: j.version, unpackedMB: +(j.dist.unpackedSize / 1048576).toFixed(1), files: j.dist.fileCount } : null;
  }
  // 4. Material Symbols sharp inventory
  const tree = await get('https://data.jsdelivr.com/v1/packages/npm/@material-symbols/svg-400@0.47.6?structure=flat');
  if (tree && tree.files) {
    const files = tree.files.map(f => f.name);
    const dirs = {}; files.forEach(f => { const d = f.split('/')[1]; if (f.endsWith('.svg')) dirs[d] = (dirs[d] || 0) + 1; });
    out.msDirs = dirs;
    const need = ['qr_code_2', 'qr_code_scanner', 'photo_camera', 'flashlight_on', 'check', 'check_circle', 'close', 'warning', 'error', 'info', 'wifi_off', 'cloud_off', 'cloud_done', 'sync', 'receipt_long', 'person', 'group', 'school', 'settings', 'logout', 'chevron_right', 'chevron_left', 'arrow_back', 'expand_more', 'calendar_month', 'event', 'schedule', 'history', 'notifications', 'download', 'upload', 'print', 'search', 'menu', 'more_vert', 'edit', 'delete', 'lock', 'mail', 'visibility', 'done_all', 'pending', 'hourglass_empty'];
    const sharp = new Set(files.filter(f => f.startsWith('/sharp/')).map(f => f.slice(7)));
    out.msMissing = need.filter(n => !sharp.has(n + '.svg'));
    out.msFillVariant = need.filter(n => sharp.has(n + '-fill.svg')).length + '/' + need.length;
  } else out.msTree = tree;
  out.msSample = await get('https://cdn.jsdelivr.net/npm/@material-symbols/svg-400@0.47.6/sharp/qr_code_scanner.svg', true);
  // 5. stroke caps in lucide and phosphor
  const luc = await get('https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/qr-code.svg', true);
  out.lucideSample = typeof luc === 'string' ? luc.slice(0, 400) : luc;
  const ph = await get('https://cdn.jsdelivr.net/npm/@phosphor-icons/core@latest/assets/regular/qr-code.svg', true);
  out.phosphorSample = typeof ph === 'string' ? ph.slice(0, 300) : ph;
  const phl = await get('https://cdn.jsdelivr.net/npm/@phosphor-icons/core@latest/assets/light/x.svg', true);
  out.phosphorLightX = typeof phl === 'string' ? phl.slice(0, 400) : phl;
  // 6. repo stars for zoontek nav bar
  out.repoNav = await get('https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/zoontek%2Freact-native-navigation-bar');
  if (out.repoNav && !out.repoNav.__err) out.repoNav = { stars: out.repoNav.stargazers_count, pushed: (out.repoNav.pushed_at || '').slice(0, 10), issues: out.repoNav.open_issues_count };
  fs.writeFileSync(path.join(__dirname, 'L2-meta2.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
})();
