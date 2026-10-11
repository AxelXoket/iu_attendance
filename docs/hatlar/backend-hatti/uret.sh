#!/usr/bin/env bash
# Runs every gate on the backend specs and regenerates belgeler/backend (index, 41 stages, module pages, open points).
# ilerleme.json and ilerleme-notlari.md are kept when they already exist (they hold real progress).
set -euo pipefail
B="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$B/../.." && pwd)"; OUT="$R/belgeler/backend"
cd "$B"
for d in D01 D02 D03 D04 D05 D06 D07 D08 D09 D10 D11 D12 D13 D14 D15; do node spec-validate.js $d | grep -q '^OK' || { node spec-validate.js $d; exit 1; }; done; echo "spec-validate: 15 OK"
node contracts-validate.js | tail -1
node sahip-check.js --all | tail -1
node ozet-validate.js --all | tail -1
node test-schedule.js | tail -1
node schedule.js | head -1 | cut -c1-120
KEEP="$(mktemp -d)"; for f in ilerleme.json ilerleme-notlari.md; do [ -f "$OUT/$f" ] && cp "$OUT/$f" "$KEEP/"; done
node gen-kademe.js "$OUT" | cut -c1-160
for f in ilerleme.json ilerleme-notlari.md; do [ -f "$KEEP/$f" ] && cp "$KEEP/$f" "$OUT/$f"; done; rm -rf "$KEEP"
node link-check.js "$R/belgeler"
