# Shared helpers of the host scripts (module D15, operations): the current instant, its ISO
# form, and the whole-file write the containers read. Sourced by the scripts, never run.
#
# The status files live under STATUS_ROOT (default /var/lib/iu-attendance/status); the
# folder layout is in contracts operations.ts (status files). A script's own state lives
# under STATE_ROOT (default /var/lib/iu-attendance). Plain POSIX sh with GNU date (%N and -d @). Each function names
# its variables with its own prefix, as sh has no local variables.

STATUS_ROOT=${STATUS_ROOT:-/var/lib/iu-attendance/status}
STATE_ROOT=${STATE_ROOT:-/var/lib/iu-attendance}

# Prints a message to stderr (the journal) and exits with the given status.
die() {
  die_status=$1
  shift
  printf '%s\n' "$*" >&2
  exit "$die_status"
}

# The current instant in nanoseconds since the epoch. The tests fix it with TEST_NOW_NS.
now_ns() {
  if [ -n "${TEST_NOW_NS:-}" ]; then
    printf '%s\n' "$TEST_NOW_NS"
  else
    date -u +%s%N
  fi
}

# Nanoseconds since the epoch as seconds.nanoseconds, the form docker --since takes.
dotted_ns() {
  dotted_seconds=${1%?????????}
  printf '%s.%s\n' "$dotted_seconds" "${1#"$dotted_seconds"}"
}

# Nanoseconds since the epoch as UTC YYYY-MM-DDTHH:MM:SS.mmmZ, the contract's instant.
iso_ns() {
  iso_seconds=${1%?????????}
  iso_nanos=${1#"$iso_seconds"}
  printf '%s.%sZ\n' "$(date -u -d "@$iso_seconds" +%Y-%m-%dT%H:%M:%S)" "${iso_nanos%??????}"
}

# Writes standard input whole to <directory>/<name>: a temporary file in the same
# directory, renamed over the old one, so a reader sees the old file or the new one and
# never a part. The temporary name starts with a dot, so no reader opens it.
write_whole() {
  mkdir -p "$1" || return 1
  write_temporary=$(mktemp "$1/.$2.XXXXXX") || return 1
  if cat >"$write_temporary" && chmod 0644 "$write_temporary" &&
    mv -f "$write_temporary" "$1/$2"; then
    return 0
  fi
  rm -f "$write_temporary"
  return 1
}
