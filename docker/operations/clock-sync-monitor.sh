#!/bin/sh
# Clock sync monitor (module D15, job clock_sync_monitor). Every thirty seconds on the host
# (iu-attendance-clock-sync.timer), outside pg-boss, so it runs while the api and the
# worker are down too. It turns `chronyc -c tracking` into <STATUS_ROOT>/clock/chrony.json
# (contracts chronyStatusSchema): the api reads it every five seconds for D04's document
# rule and the operations check alerts on it; both apply the thresholds and the file age.
#
#   synced        the leap status is Normal, Insert second or Delete second (anything but
#                 "Not synchronised" chrony prints) and the stratum is 1 to 15
#   offsetMs      ceil(1000 x (|system time| + root dispersion + root delay / 2)), chrony's
#                 bound on the clock error in whole milliseconds rounded up, summed in whole
#                 nanoseconds so an exact bound is not rounded up by floating point
#   stratum       1 to 16, otherwise null; source: the reference name, otherwise null
#   lastBrokenAt  this instant when the clock is not synced or the offset is above
#                 CLOCK_SYNC_THRESHOLD_MS, otherwise the previous file's; one that lies
#                 ahead of this instant (the clock was stepped back) becomes this instant
#
# `chronyc -c tracking` prints one line of 14 comma-separated fields (chrony client.c):
# reference ID, name, stratum, reference time, system time, last offset, RMS offset,
# frequency, residual frequency, skew, root delay, root dispersion, update interval, leap
# status; the times in seconds with nine decimals. When chronyc fails or prints anything
# else the file says not synced, with offset 0 and no stratum or source, and the script
# exits 1.
#
# CLOCK_SYNC_THRESHOLD_MS is the api's setting (the unit reads the release settings) and
# takes exactly the values the settings take (1 to 16 digits, 1 to 5000); unset or empty,
# it is the settings default, 100.
#
# Usage: sh clock-sync-monitor.sh
# Exit status: 0 written; 1 written as not synced because chronyc failed, or not written;
# 2 usage or setup error (CLOCK_SYNC_THRESHOLD_MS not one the settings take, or the
# script's own directory or common.sh not found), nothing written.
# CHRONYC names another chronyc (the tests' stand-in, never put on PATH).

set -u

HERE=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd) || exit 2
[ -r "$HERE/common.sh" ] || exit 2
. "$HERE/common.sh"

CHRONYC=${CHRONYC:-chronyc}
THRESHOLD_MS=${CLOCK_SYNC_THRESHOLD_MS:-100}
DIRECTORY=$STATUS_ROOT/clock
NAME=chrony.json

# The settings' rule for the same variable: 1 to 16 ASCII digits, leading zeros allowed, a
# value from 1 to 5000. The leading zeros come off before the value is read; what is left
# must then be the digits of 1 to 5000, which refuses an empty, signed or spaced value.
THRESHOLD_ERROR="CLOCK_SYNC_THRESHOLD_MS must be 1 to 16 digits of milliseconds from 1 to 5000"
[ "${#THRESHOLD_MS}" -le 16 ] || die 2 "$THRESHOLD_ERROR"
THRESHOLD_MS=${THRESHOLD_MS#"${THRESHOLD_MS%%[!0]*}"}
case $THRESHOLD_MS in
  [1-9] | [1-9][0-9] | [1-9][0-9][0-9] | [1-4][0-9][0-9][0-9] | 5000) ;;
  *) die 2 "$THRESHOLD_ERROR" ;;
esac

at=$(iso_ns "$(now_ns)")
chronyc_failed=0
tracking=$("$CHRONYC" -c tracking 2>/dev/null) || chronyc_failed=1
# The previous file's lastBrokenAt, carried over while the clock stays healthy.
previous=$(sed -n 's/.*"lastBrokenAt":"\([0-9TZ:.-]*\)".*/\1/p' "$DIRECTORY/$NAME" 2>/dev/null | head -n 1)

unusable=0
json=$(printf '%s\n' "$tracking" | awk -F, -v at="$at" -v threshold="$THRESHOLD_MS" \
  -v previous="$previous" -v chronyc_failed="$chronyc_failed" '
function quoted(text) { return "\"" text "\"" }
# Seconds with up to nine decimals, as chrony prints them, in whole nanoseconds.
function nanoseconds(text,    sign, dot, whole, fraction) {
  sign = 1
  if (substr(text, 1, 1) == "-") { sign = -1; text = substr(text, 2) }
  dot = index(text, ".")
  whole = dot ? substr(text, 1, dot - 1) : text
  fraction = dot ? substr(text, dot + 1) : ""
  return sign * (whole * 1000000000 + substr(fraction "000000000", 1, 9))
}
NR == 1 { sub(/\r$/, ""); fields = NF; for (i = 1; i <= NF; i++) field[i] = $i }
END {
  usable = !chronyc_failed && NR == 1 && fields == 14 && field[3] ~ /^[0-9]+$/
  for (i = 4; usable && i <= 13; i++) usable = field[i] ~ /^-?[0-9]+(\.[0-9]+)?$/
  # Root delay and root dispersion are never below 0.
  usable = usable && field[11] !~ /^-/ && field[12] !~ /^-/
  if (usable) {
    stratum = field[3] + 0
    system_time = nanoseconds(field[5])
    if (system_time < 0) system_time = -system_time
    # Twice the bound, in whole nanoseconds; one millisecond is 2,000,000 of them.
    doubled = 2 * system_time + 2 * nanoseconds(field[12]) + nanoseconds(field[11])
    offset = int(doubled / 2000000)
    if (offset * 2000000 < doubled) offset++
    healthy_leap = field[14] == "Normal" || field[14] == "Insert second" || field[14] == "Delete second"
    synced = healthy_leap && stratum >= 1 && stratum <= 15
    source = field[2]
    gsub(/[^A-Za-z0-9.:_-]/, "", source)
    source = substr(source, 1, 64)
  } else {
    stratum = 0
    offset = 0
    synced = 0
    source = ""
  }
  broken = !synced || offset > threshold + 0
  if (broken) last_broken = quoted(at)
  else if (previous ~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]\.[0-9][0-9][0-9]Z$/) last_broken = quoted(previous "" <= at "" ? previous : at)
  else last_broken = "null"
  printf "{\"format\":1,\"measuredAt\":%s,\"synced\":%s,\"offsetMs\":%.0f,\"stratum\":%s,\"source\":%s,\"lastBrokenAt\":%s}\n", \
    quoted(at), synced ? "true" : "false", offset, \
    (stratum >= 1 && stratum <= 16) ? stratum : "null", \
    source == "" ? "null" : quoted(source), last_broken
  exit !usable
}') || unusable=1

printf '%s\n' "$json" | write_whole "$DIRECTORY" "$NAME" || die 1 "could not write $DIRECTORY/$NAME"
[ "$unusable" -eq 0 ] || die 1 "chronyc tracking could not be read; written as not synced"
