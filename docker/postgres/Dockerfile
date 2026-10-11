# PostgreSQL image of the attendance system (module D12, database): the official postgres
# image plus two packages at exact versions, nothing else: pgbackrest and ca-certificates.
#
# Dependabot raises the FROM line (tag and digest); pgBackRest is raised by hand after its
# release notes are read. compose.yaml names the image
# iu-attendance-postgres:<PostgreSQL version>-pgbackrest<pgBackRest upstream version>, and
# version-check.sh stops CI until that name carries the versions written in this file. Both
# pgbackrest pins below name the same version; the check fails when they differ.
#
# ca-certificates: the base image has no CA trust store, so without it pgBackRest cannot
# verify the TLS certificate of an S3 repository (the repository type is still open: S3 or
# SFTP) and apt cannot reach the https-only apt-archive.postgresql.org. It is pinned to the
# version of the base image's Debian release (trixie); when Debian replaces that version,
# the build stops with "Version ... was not found" and the pin moves to the new one.
#
# The base image already defines the PGDG apt source (apt.postgresql.org) with its signing
# key and empties the apt lists, so the install starts with apt-get update. ca-certificates
# and pgbackrest's Debian dependencies (libssh2-1t64) come from deb.debian.org.
# apt.postgresql.org keeps only the newest pgbackrest versions. Only when a simulated
# install of the pin (apt-get install -s) fails there, the archive
# (apt-archive.postgresql.org, suite trixie-pgdg-archive, signed by the same key) is added
# and the same version comes from it. apt-cache show cannot be that test: it answers 0
# even for a missing version.
FROM postgres:18.6-trixie@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates=20250419; \
  if ! apt-get install -s --no-install-recommends pgbackrest=2.59.3-1.pgdg13+1 > /dev/null; then \
    echo 'deb [ signed-by=/usr/local/share/keyrings/postgres.gpg.asc ] https://apt-archive.postgresql.org/pub/repos/apt trixie-pgdg-archive main' \
      > /etc/apt/sources.list.d/pgdg-archive.list; \
    apt-get update; \
  fi; \
  apt-get install -y --no-install-recommends pgbackrest=2.59.3-1.pgdg13+1; \
  rm -rf /var/lib/apt/lists/*
