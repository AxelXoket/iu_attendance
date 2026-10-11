#!/usr/bin/env bash
# Progress monitor for the research fan-out. Source of truth: finished report files in research/.
S="$(cd "$(dirname "$0")" && pwd)"
TOTAL=10
START=$(stat -c %Y "$S/rubric.md")
NOW=$(date +%s)
DONE=$(ls "$S/research"/*.md 2>/dev/null | wc -l)
ELAPSED=$((NOW-START))
PCT=$((DONE*100/TOTAL))
if [ "$DONE" -gt 0 ] && [ "$DONE" -lt "$TOTAL" ]; then
  # Agents run in parallel; remaining ones are expected near the slowest pace seen so far.
  ETA="~$(( (ELAPSED/DONE) / 60 + 1 )) dk (kaba tahmin, paralel çalışma)"
elif [ "$DONE" -ge "$TOTAL" ]; then ETA="0"; else ETA="bilinmiyor"; fi
FILES=$(ls "$S/research"/*.md 2>/dev/null | xargs -n1 basename 2>/dev/null | tr '\n' ' ')
LINE="$(date '+%Y-%m-%d %H:%M:%S') | IU Yoklama araştırması | ${PCT}% (${DONE}/${TOTAL}) | geçen $((ELAPSED/60)) dk | kalan ${ETA} | biten: ${FILES}"
echo "$LINE" | tee -a "$S/status.log"
