#!/bin/sh
# Version check of the PostgreSQL image, a CI quality gate (module D12, database).
#
# compose.yaml names the image built from the Dockerfile in this directory
# iu-attendance-postgres:<PostgreSQL version>-pgbackrest<pgBackRest upstream version>.
# Dependabot raises only the FROM line and pgBackRest is raised by hand, so the name can
# drift away from what the image holds. The check passes only when every image name in the
# YAML files here (compose.yaml must have one) carries the exact PostgreSQL version of the
# Dockerfile's FROM postgres:<major>.<minor>-<suite> line and the upstream part of its
# pgbackrest=<Debian version> pins (2.59.3 of 2.59.3-1.pgdg13+1; all pins must agree).
# Otherwise it fails with DATABASE_VERSION_MISMATCH, lists every disagreeing line and
# prints the name to write.
#
# Usage:
#   sh docker/postgres/version-check.sh [directory]   check a directory (default: this one)
#   sh docker/postgres/version-check.sh --self-test   run the behaviour test on copies
# Exit status: 0 the versions match, 1 they do not or cannot be read, 2 usage or tool error.
# Plain POSIX sh and awk (mawk, gawk, busybox); AWK may name another awk.

set -u

CODE=DATABASE_VERSION_MISMATCH
REPOSITORY=iu-attendance-postgres
AWK=${AWK:-awk}

# Operands: the Dockerfile, compose.yaml, then any other YAML file. mode=versions reads only
# the Dockerfile and prints "<PostgreSQL> <pin> <pgBackRest upstream>" for the self-test.
AWK_PROGRAM='
function problem(text) { problems[++problem_count] = text }
function shown(path) {
  if (root != "" && index(path, root "/") == 1) return substr(path, length(root) + 2)
  return path
}
function where() { return shown(FILENAME) ":" FNR }
# Debian version without its epoch and revision: 1:2.59.3-1.pgdg13+1 -> 2.59.3
function upstream(version,    u) {
  u = version
  sub(/^[0-9]+:/, "", u)
  if (match(u, /-[^-]*$/)) u = substr(u, 1, RSTART - 1)
  return u
}
function read_from(    i, ref, image, tag, version) {
  ref = ""
  for (i = 2; i <= NF; i++) {
    if (substr($i, 1, 2) != "--") { ref = $i; break }
  }
  image = ref
  sub(/^docker\.io\//, "", image)
  sub(/^library\//, "", image)
  if (image != "postgres" && index(image, "postgres:") != 1 && index(image, "postgres@") != 1) return
  from_count++
  tag = image
  sub(/@.*/, "", tag)
  sub(/^postgres:?/, "", tag)
  version = tag
  sub(/-.*/, "", version)
  if (version !~ /^[0-9]+\.[0-9]+$/) {
    problem(where() ": FROM " ref " names no exact PostgreSQL version (postgres:<major>.<minor>-<suite>)")
    return
  }
  if (!(version in pg_seen)) { pg_seen[version] = 1; pg_list = pg_list " " version; pg_distinct++ }
  if (pg == "") pg = version
}
function read_pins(    line, n, i, tok, full, up) {
  line = $0
  gsub(/[";|&()]/, " ", line)
  gsub(/\\/, " ", line)
  gsub(q, " ", line)
  n = split(line, tok, /[ \t]+/)
  for (i = 1; i <= n; i++) {
    if (index(tok[i], "pgbackrest=") != 1) continue
    pin_count++
    full = substr(tok[i], 12)
    up = upstream(full)
    if (up !~ /^[0-9]+(\.[0-9]+)+$/) {
      problem(where() ": pgbackrest=" full " names no exact pgBackRest version")
      continue
    }
    if (!(up in pgbr_seen)) { pgbr_seen[up] = 1; pgbr_list = pgbr_list " " up; pgbr_distinct++ }
    if (pgbr == "") { pgbr = up; pin = full }
  }
}
function read_names(    line, n, i, tok, image, tag) {
  line = " " $0
  if (match(line, /[ \t]#/)) line = substr(line, 1, RSTART - 1)
  gsub(/[",{}]/, " ", line)
  gsub(/\[/, " ", line)
  gsub(/\]/, " ", line)
  gsub(q, " ", line)
  n = split(line, tok, /[ \t]+/)
  for (i = 1; i <= n; i++) {
    image = tok[i]
    sub(/^.*\//, "", image)
    if (index(image, repository ":") != 1) continue
    tag = substr(image, length(repository) + 2)
    name_count++
    names[name_count] = tag
    name_at[name_count] = where()
    if (FILENAME == compose) compose_names++
  }
}
BEGIN {
  dockerfile = ARGV[1]
  compose = ARGV[2]
  root = ENVIRON["VERSION_CHECK_ROOT"]
}
FNR == 1 { continued = 0 }
{ sub(/\r$/, "") }
FILENAME == dockerfile {
  # Docker drops comment and blank lines, also inside a continued instruction.
  if ($0 ~ /^[ \t]*#/ || $0 ~ /^[ \t]*$/) next
  starts = !continued
  continued = ($0 ~ /\\[ \t]*$/)
  if (starts && toupper($1) == "FROM") read_from()
  read_pins()
  next
}
{ read_names() }
END {
  if (mode == "versions") {
    if (pg == "" || pin == "") exit 1
    print pg, pin, pgbr
    exit 0
  }
  if (from_count == 0) problem(shown(dockerfile) ": no FROM postgres:<version> line")
  if (pin_count == 0) problem(shown(dockerfile) ": no pinned pgbackrest=<version> package")
  if (pg_distinct > 1) problem(shown(dockerfile) ": FROM lines name different PostgreSQL versions:" pg_list)
  if (pgbr_distinct > 1) problem(shown(dockerfile) ": pgbackrest pins name different versions:" pgbr_list)
  if (compose_names == 0) problem(shown(compose) ": names no " repository " image")
  known = (pg_distinct == 1 && pgbr_distinct == 1)
  expected = pg "-pgbackrest" pgbr
  if (known) {
    for (i = 1; i <= name_count; i++) {
      if (names[i] != expected) problem(name_at[i] ": " repository ":" names[i])
    }
  }
  if (problem_count == 0) {
    print "version-check: " repository ":" expected " matches the Dockerfile (PostgreSQL " pg ", pgBackRest " pgbr ")"
    exit 0
  }
  print code ": the PostgreSQL image name and the Dockerfile disagree"
  for (i = 1; i <= problem_count; i++) print "  " problems[i]
  if (known) print "  write " repository ":" expected " (PostgreSQL " pg " from FROM, pgBackRest " pgbr " from pgbackrest=" pin ")"
  exit 1
}
'

# run_awk MODE ROOT FILE...
run_awk() {
  run_mode=$1
  run_root=$2
  shift 2
  VERSION_CHECK_ROOT=$run_root "$AWK" -v mode="$run_mode" -v code="$CODE" \
    -v repository="$REPOSITORY" -v q="'" "$AWK_PROGRAM" "$@"
}

# check_dir DIRECTORY: prints the verdict and returns 0 (match), 1 (mismatch) or 2 (tool).
check_dir() {
  check_root=$1
  for check_file in Dockerfile compose.yaml; do
    if [ ! -f "$check_root/$check_file" ]; then
      printf '%s: %s is missing in %s\n' "$CODE" "$check_file" "$check_root" >&2
      return 1
    fi
  done
  set -- "$check_root/Dockerfile" "$check_root/compose.yaml"
  for check_file in "$check_root"/*.yaml "$check_root"/*.yml \
    "$check_root"/*/*.yaml "$check_root"/*/*.yml; do
    if [ -f "$check_file" ] && [ "$check_file" != "$check_root/compose.yaml" ]; then
      set -- "$@" "$check_file"
    fi
  done
  check_report=$(run_awk check "$check_root" "$@")
  check_status=$?
  case $check_status in
    0)
      printf '%s\n' "$check_report"
      return 0
      ;;
    1)
      printf '%s\n' "$check_report" >&2
      return 1
      ;;
  esac
  printf 'version-check: %s stopped with status %s\n' "$AWK" "$check_status" >&2
  return 2
}

# ---- Behaviour test: every case copies the Dockerfile and compose.yaml of this directory
# into a temporary directory, changes the copy and runs the check on it. Versions come from
# the real Dockerfile through the same parser, so the cases follow every version bump.

st_cleanup() {
  case ${st_work-} in
    */version-check.*) rm -rf -- "$st_work" ;;
  esac
}

# st_replace FILE OLD NEW: replaces every literal OLD; fails when there is none.
st_replace() {
  if ST_OLD=$2 ST_NEW=$3 "$AWK" '
    BEGIN { old = ENVIRON["ST_OLD"]; replacement = ENVIRON["ST_NEW"] }
    {
      line = $0
      out = ""
      while ((at = index(line, old)) > 0) {
        out = out substr(line, 1, at - 1) replacement
        line = substr(line, at + length(old))
        count++
      }
      print out line
    }
    END { exit (count > 0 ? 0 : 1) }
  ' "$1" > "$1.new"; then
    mv -- "$1.new" "$1"
  else
    rm -f -- "$1.new"
    return 1
  fi
}

st_edit() { st_replace "$st_dir/$1" "$2" "$3"; }
st_append() { printf '%s\n' "$2" >> "$st_dir/$1"; }
st_remove() { rm -f -- "$st_dir/$1"; }

st_bump_both() {
  st_edit Dockerfile "postgres:$st_pg" "postgres:$st_pg_next" &&
    st_edit compose.yaml "$st_name" "$REPOSITORY:$st_pg_next-pgbackrest$st_pgbr"
}

st_floating() {
  st_edit Dockerfile "postgres:$st_pg" "postgres:$st_major" &&
    st_edit compose.yaml "$st_name" "$REPOSITORY:$st_major-pgbackrest$st_pgbr"
}

st_change_digest() {
  if "$AWK" -v digest="$st_fake_digest" '
    toupper($1) == "FROM" && match($0, /@sha256:[0-9a-f]+/) {
      $0 = substr($0, 1, RSTART - 1) "@sha256:" digest substr($0, RSTART + RLENGTH)
      count++
    }
    { print }
    END { exit (count > 0 ? 0 : 1) }
  ' "$st_dir/Dockerfile" > "$st_dir/Dockerfile.new"; then
    mv -- "$st_dir/Dockerfile.new" "$st_dir/Dockerfile"
  else
    rm -f -- "$st_dir/Dockerfile.new"
    return 1
  fi
}

st_comments() {
  st_append Dockerfile '# FROM postgres:9.6-stretch' &&
    st_append Dockerfile '  # RUN apt-get install pgbackrest=1.0-1' &&
    st_append compose.yaml "# image: $REPOSITORY:9.6-pgbackrest1.0" &&
    st_edit compose.yaml "$st_name" "$st_name  # was $REPOSITORY:9.6-pgbackrest1.0"
}

st_crlf() {
  for st_crlf_file in "$st_dir/Dockerfile" "$st_dir/compose.yaml"; do
    "$AWK" '{ sub(/\r$/, ""); printf "%s\r\n", $0 }' "$st_crlf_file" > "$st_crlf_file.new" &&
      mv -- "$st_crlf_file.new" "$st_crlf_file" || return 1
  done
}

st_nested() {
  mkdir -- "$st_dir/backup" &&
    printf 'services:\n  trial:\n    image: %s\n' "$1" > "$st_dir/backup/compose.trial.yaml"
}

st_name_only_nested() {
  st_edit compose.yaml "$st_name" "postgres:$st_pg" && st_nested "$st_name"
}

# A continued RUN whose later line starts with the word FROM, after a comment and a blank line.
st_continuation() {
  printf '%s\n' 'RUN echo \' '  # a comment inside the instruction' '' \
    '  FROM postgres:9.6-stretch' >> "$st_dir/Dockerfile"
}

# A YAML file that names the given image, at the top level or one level down.
st_yml() {
  case $1 in */*) mkdir -p -- "$st_dir/${1%/*}" || return 1 ;; esac
  printf 'services:\n  trial:\n    image: %s\n' "$2" > "$st_dir/$1"
}

st_inexact_pin() {
  st_edit Dockerfile "pgbackrest=$st_pin" "pgbackrest=${st_pgbr%.*}*" &&
    st_edit compose.yaml "$st_name" "$REPOSITORY:$st_pg-pgbackrest${st_pgbr%.*}*"
}

st_verdict() {
  st_code_seen=no
  if grep -q "$CODE" "$st_dir.out" "$st_dir.err"; then st_code_seen=yes; fi
  st_good=no
  case $st_expect in
    pass)
      if [ "$st_status" -eq 0 ] && [ "$st_code_seen" = no ] && [ ! -s "$st_dir.err" ] &&
        grep -q 'matches the Dockerfile' "$st_dir.out"; then
        st_good=yes
      fi
      ;;
    fail)
      if [ "$st_status" -eq 1 ] && grep -q "$CODE" "$st_dir.err"; then st_good=yes; fi
      ;;
  esac
  if [ "$st_good" = yes ]; then
    st_passed=$((st_passed + 1))
    printf 'ok %d - %s\n' "$st_number" "$st_description"
  else
    st_failed=$((st_failed + 1))
    printf 'not ok %d - %s (expected %s, exit status %s)\n' \
      "$st_number" "$st_description" "$st_expect" "$st_status"
    sed 's/^/    # /' "$st_dir.out" "$st_dir.err"
  fi
}

st_setup_failed() {
  st_failed=$((st_failed + 1))
  printf 'not ok %d - %s (%s)\n' "$st_number" "$st_description" "$1"
}

# st_case pass|fail DESCRIPTION SETUP [ARGUMENT...]
st_case() {
  st_expect=$1
  st_description=$2
  shift 2
  st_number=$((st_number + 1))
  st_dir=$st_work/case-$st_number
  if ! mkdir -- "$st_dir" || ! cp -- "$script_dir/Dockerfile" "$script_dir/compose.yaml" "$st_dir/"; then
    st_setup_failed "cannot copy the files of $script_dir"
    return
  fi
  if ! "$@"; then
    st_setup_failed 'cannot set the case up: the files no longer have the expected shape'
    return
  fi
  (check_dir "$st_dir") > "$st_dir.out" 2> "$st_dir.err"
  st_status=$?
  st_verdict
}

self_test() {
  st_work=$(mktemp -d "${TMPDIR:-/tmp}/version-check.XXXXXX") || {
    printf 'version-check self-test: cannot create a temporary directory\n' >&2
    return 2
  }
  trap st_cleanup EXIT
  trap 'st_cleanup; exit 2' HUP INT TERM
  st_number=0
  st_passed=0
  st_failed=0

  if ! st_versions=$(run_awk versions "$script_dir" "$script_dir/Dockerfile"); then
    printf 'version-check self-test: no versions can be read from %s/Dockerfile\n' "$script_dir" >&2
    return 1
  fi
  read -r st_pg st_pin st_pgbr <<EOF
$st_versions
EOF
  case $st_pin in
    "$st_pgbr" | "$st_pgbr"-*) ;;
    *)
      printf 'version-check self-test: unexpected pin form %s\n' "$st_pin" >&2
      return 1
      ;;
  esac
  st_major=${st_pg%%.*}
  st_pg_next=$st_major.$((${st_pg#*.} + 1))
  st_pgbr_next=${st_pgbr%.*}.$((${st_pgbr##*.} + 1))
  st_revision=${st_pin#"$st_pgbr"}
  st_name=$REPOSITORY:$st_pg-pgbackrest$st_pgbr
  st_other=$REPOSITORY:$st_pg_next-pgbackrest$st_pgbr
  st_fake_digest=$(printf '%064d' 0)

  # Ground control: the files of this directory, unchanged.
  st_number=1
  st_expect=pass
  st_description="the files of this directory pass ($st_name)"
  st_dir=$st_work/case-1
  (check_dir "$script_dir") > "$st_dir.out" 2> "$st_dir.err"
  st_status=$?
  st_verdict

  st_case pass 'an unchanged copy passes' true
  st_case fail 'FROM moves to the next PostgreSQL minor version, the name stays (Dependabot)' \
    st_edit Dockerfile "postgres:$st_pg" "postgres:$st_pg_next"
  st_case fail 'the name carries another PostgreSQL version than FROM' \
    st_edit compose.yaml "$st_name" "$st_other"
  st_case fail 'the Dockerfile pins a newer pgBackRest, the name stays' \
    st_edit Dockerfile "pgbackrest=$st_pin" "pgbackrest=$st_pgbr_next$st_revision"
  st_case fail 'the name carries another pgBackRest version than the pin' \
    st_edit compose.yaml "$st_name" "$REPOSITORY:$st_pg-pgbackrest$st_pgbr_next"
  st_case fail 'the name has a suffix after the pgBackRest version' \
    st_edit compose.yaml "$st_name" "$st_name-extra"
  st_case pass 'FROM and the name move to the next minor version together' st_bump_both
  st_case pass 'only the Debian revision of the pin changes' \
    st_edit Dockerfile "pgbackrest=$st_pin" "pgbackrest=$st_pgbr-9.selftest+1"
  st_case pass 'only the FROM digest changes (FROM must carry an @sha256 digest)' st_change_digest
  st_case pass 'FROM in lower case with a platform flag and a registry prefix' \
    st_edit Dockerfile 'FROM postgres:' 'from --platform=linux/amd64 docker.io/library/postgres:'
  st_case pass 'a second FROM stage with the same version, no suite, a digest' \
    st_append Dockerfile "FROM postgres:$st_pg@sha256:$st_fake_digest AS plain"
  st_case pass 'a continued line that starts with the word FROM is no instruction' st_continuation
  st_case pass 'a quoted pin is read' \
    st_edit Dockerfile "pgbackrest=$st_pin" "'pgbackrest=$st_pin'"
  st_case pass 'an epoch in the pin is ignored' \
    st_edit Dockerfile "pgbackrest=$st_pin" "pgbackrest=1:$st_pin"
  st_case pass 'a quoted image name is read' \
    st_edit compose.yaml "$st_name" "\"$st_name\""
  st_case fail 'floating major tags on both sides' st_floating
  st_case fail 'pgbackrest installed without a pinned version' \
    st_edit Dockerfile "pgbackrest=$st_pin" 'pgbackrest'
  st_case fail 'a second FROM postgres stage names another version' \
    st_append Dockerfile "FROM postgres:$st_pg_next-trixie AS other"
  st_case fail 'two pgbackrest pins disagree' \
    st_append Dockerfile "RUN apt-get install -y pgbackrest=$st_pgbr_next$st_revision"
  st_case pass 'stale versions in comments are ignored' st_comments
  st_case pass 'CRLF line endings' st_crlf
  st_case fail 'a second image line in compose.yaml names another version' \
    st_append compose.yaml "x-stale: { image: $st_other }"
  st_case fail 'a nested YAML file names another version' st_nested "$st_other"
  st_case pass 'a nested YAML file with the current name' st_nested "$st_name"
  st_case fail 'compose.yaml names no image' \
    st_edit compose.yaml "$st_name" "postgres:$st_pg"
  st_case fail 'compose.yaml names no image, a nested YAML file does' st_name_only_nested
  st_case fail 'compose.yaml is missing' st_remove compose.yaml
  st_case fail 'a registry-prefixed image name names another version' \
    st_append compose.yaml "x-registry: { image: ghcr.io/example/$st_other }"
  st_case pass 'a registry-prefixed image name with the current versions' \
    st_append compose.yaml "x-registry: { image: ghcr.io/example/$st_name }"
  st_case fail 'a top-level .yml file names another version' st_yml extra.yml "$st_other"
  st_case fail 'a nested .yml file names another version' st_yml backup/compose.trial.yml "$st_other"
  st_case fail 'a pin and a name without an exact pgBackRest version' st_inexact_pin
  st_case fail 'the Dockerfile is missing' st_remove Dockerfile

  printf 'version-check self-test: %d passed, %d failed\n' "$st_passed" "$st_failed"
  [ "$st_failed" -eq 0 ]
}

usage() {
  printf 'usage: sh %s [directory | --self-test]\n' "$0" >&2
  exit 2
}

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P) || exit 2

case $# in
  0)
    check_dir "$script_dir"
    exit $?
    ;;
  1) ;;
  *) usage ;;
esac
case $1 in
  --self-test)
    self_test
    exit $?
    ;;
  -*) usage ;;
esac
if [ ! -d "$1" ]; then
  printf 'version-check: %s is not a directory\n' "$1" >&2
  exit 2
fi
target_dir=$(CDPATH='' cd -- "$1" && pwd -P) || exit 2
check_dir "$target_dir"
exit $?
