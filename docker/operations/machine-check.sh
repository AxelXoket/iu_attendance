#!/bin/sh
# Machine check (module D15, job machine_check). Every ten minutes at :08, :18, ... on the
# host (iu-attendance-machine-check.timer), so the operations check at :10, :20, ... reads
# a file two minutes old. It writes <STATUS_ROOT>/machine/machine.json (contracts
# machineStatusSchema, format 2) and applies no threshold; the operations check does.
#
#   disks       df of the root file system and of Docker's data directory, each mount once
#   memory      MemTotal and MemAvailable of /proc/meminfo, in bytes
#   containers  the Compose services caddy, api-1, api-2, worker, postgres and xprem of
#               project COMPOSE_PROJECT_NAME (default iu-attendance, the directory name
#               compose.yaml lies in), one-off `compose run` containers left out: container
#               id, state, health (null without a health check), restart count and start
#               instant
#
# Out-of-memory kills are counted as events, never as a state: docker events with
# event=oom over the window from just after the previous run's instant to now, per
# container (oomIncrease). Inspect's OOMKilled is never read: it tells only of the last
# exit, and Docker versions keep or clear it on a restart. The restart increase compares
# the restart count with the previous run's count for the same container id only: a new id
# (a release recreated the container, its count back at 0) gives 0, never below 0. The
# previous run's instant and counts are kept in <STATE_ROOT>/machine-previous.json, read by
# this script alone; without it the window is the last ten minutes and every increase 0.
# docker events takes both bounds inclusively, so the next window starts one nanosecond
# after this one ends and no event is counted twice. A clock set back behind the previous
# run counts no event (its window would overlap the previous one) and keeps the previous
# end; the restart counts are compared all the same, as they need no clock.
#
# Usage: sh machine-check.sh
# Exit status: 0 written; 1 a reading failed (docker, df or meminfo) and nothing was
# written, so the file ages and the operations check warns that the check is silent; 2
# setup error (the script's own directory or common.sh not found), nothing written.
# DOCKER, DF and MEMINFO_FILE name other commands and files (the tests' stand-ins).

set -u

HERE=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd) || exit 2
[ -r "$HERE/common.sh" ] || exit 2
. "$HERE/common.sh"

DOCKER=${DOCKER:-docker}
DF=${DF:-df}
MEMINFO_FILE=${MEMINFO_FILE:-/proc/meminfo}
PROJECT=${COMPOSE_PROJECT_NAME:-iu-attendance}
# contracts operations.ts MACHINE_SERVICES, the list the operations check expects.
SERVICES='caddy api-1 api-2 worker postgres xprem'
PREVIOUS=$STATE_ROOT/machine-previous.json
FIRST_WINDOW_NS=600000000000

work=$(mktemp -d) || die 1 "no temporary directory"
trap 'rm -rf "$work"' EXIT

now=$(now_ns)
# No leading zero: the shell would read that number as octal.
previous_until=$(sed -n 's/.*"until":"\([1-9][0-9]\{0,18\}\)".*/\1/p' "$PREVIOUS" 2>/dev/null | head -n 1)
if [ -z "$previous_until" ]; then
  since_ns=$((now - FIRST_WINDOW_NS))
  until_ns=$now
elif [ "$previous_until" -lt "$now" ]; then
  since_ns=$((previous_until + 1))
  until_ns=$now
else
  since_ns=''
  until_ns=$previous_until
fi

docker_root=$("$DOCKER" info --format '{{.DockerRootDir}}') || die 1 "docker info failed"
"$DF" -P -B1 / "$docker_root" >"$work/disks" || die 1 "df failed"
[ -r "$MEMINFO_FILE" ] || die 1 "$MEMINFO_FILE cannot be read"
"$DOCKER" ps -a -q --no-trunc --filter "label=com.docker.compose.project=$PROJECT" \
  --filter label=com.docker.compose.oneoff=False >"$work/ids" || die 1 "docker ps failed"
: >"$work/containers"
if [ -s "$work/ids" ]; then
  # shellcheck disable=SC2046 # one argument per container id
  "$DOCKER" inspect --format \
    '{{index .Config.Labels "com.docker.compose.service"}}|{{.Id}}|{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}|{{.RestartCount}}|{{.State.StartedAt}}' \
    $(cat "$work/ids") >"$work/containers" || die 1 "docker inspect failed"
fi
if [ -n "$since_ns" ]; then
  "$DOCKER" events --since "$(dotted_ns "$since_ns")" --until "$(dotted_ns "$until_ns")" \
    --filter event=oom --format '{{.Actor.ID}}' >"$work/oom" || die 1 "docker events failed"
else
  : >"$work/oom"
fi
if [ -n "$previous_until" ]; then
  grep -o '"id":"[0-9a-f]*","restartCount":[0-9]*' "$PREVIOUS" >"$work/previous" || :
else
  : >"$work/previous"
fi

# One awk pass over the readings: machine.json on standard output, the next previous
# file's container lines into $work/next.
awk -v services="$SERVICES" -v at="$(iso_ns "$now")" -v start="$(iso_ns "${since_ns:-$now}")" \
  -v next_file="$work/next" '
function clean(text) { gsub(/[^A-Za-z0-9_.-]/, "", text); return text }
function quoted(text) { return "\"" text "\"" }
# A Docker RFC 3339 UTC time in the contract form, milliseconds exactly.
function instant(text,    fraction) {
  fraction = ""
  if (substr(text, 20, 1) == ".") { fraction = substr(text, 21); sub(/[^0-9].*$/, "", fraction) }
  return substr(text, 1, 19) "." substr(fraction "000", 1, 3) "Z"
}
BEGIN { split(services, list, " "); for (i in list) wanted[list[i]] = 1 }
FILENAME ~ /\/disks$/ && FNR > 1 {
  mount = $6
  for (i = 7; i <= NF; i++) mount = mount " " $i
  if (!(mount in mounted)) {
    mounted[mount] = 1
    disks = disks (disks == "" ? "" : ",") sprintf("{\"mount\":%s,\"totalBytes\":%.0f,\"usedBytes\":%.0f}", quoted(mount), $2, $3)
  }
}
FILENAME ~ /\/oom$/ && $0 != "" { oom[$0]++ }
FILENAME ~ /\/previous$/ {
  split($0, part, "\"")
  count = $0
  sub(/.*:/, "", count)
  previous[part[4]] = count + 0
}
FILENAME ~ /\/containers$/ {
  split($0, value, "|")
  service = value[1]
  if (!(service in wanted)) next
  id = clean(value[2])
  restarts = value[5] + 0
  increase = (id in previous && restarts >= previous[id]) ? restarts - previous[id] : 0
  health = clean(value[4])
  containers = containers (containers == "" ? "" : ",") \
    sprintf("{\"service\":%s,\"containerId\":%s,\"state\":%s,\"health\":%s,\"restartCount\":%d,\"restartIncrease\":%d,\"oomIncrease\":%d,\"startedAt\":%s}", \
      quoted(service), quoted(id), quoted(clean(value[3])), health == "" ? "null" : quoted(health), \
      restarts, increase, oom[id] + 0, quoted(instant(value[6])))
  printf "{\"id\":%s,\"restartCount\":%d}\n", quoted(id), restarts >next_file
}
# The last operand is the meminfo file.
FILENAME == ARGV[ARGC - 1] {
  if ($1 == "MemTotal:") total = $2 * 1024
  if ($1 == "MemAvailable:") available = $2 * 1024
}
END {
  printf "{\"format\":2,\"measuredAt\":%s,\"eventWindow\":{\"start\":%s,\"end\":%s},\"disks\":[%s],\"memory\":{\"totalBytes\":%.0f,\"availableBytes\":%.0f},\"containers\":[%s]}\n", \
    quoted(at), quoted(start), quoted(at), disks, total, available, containers
  close(next_file)
}' "$work/disks" "$work/oom" "$work/previous" "$work/containers" "$MEMINFO_FILE" >"$work/machine" ||
  die 1 "the readings could not be combined"
[ -f "$work/next" ] || : >"$work/next"

write_whole "$STATUS_ROOT/machine" machine.json <"$work/machine" || die 1 "could not write machine.json"
{
  printf '{"format":1,"until":"%s","containers":[\n' "$until_ns"
  sed '$!s/$/,/' "$work/next"
  printf ']}\n'
} | write_whole "$STATE_ROOT" machine-previous.json || die 1 "could not write machine-previous.json"
