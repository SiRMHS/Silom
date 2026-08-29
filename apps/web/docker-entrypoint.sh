#!/bin/sh
# Runner entrypoint.
#
# docker-compose mounts a named volume over public/uploads so admin-panel
# uploads survive a redeploy. A volume mount hides whatever the image had at
# that path, and Docker only copies the image's contents into it the first time
# the volume is created — so uploads committed to the repo after that first
# `up` would never appear on the server, and a `Media` row from the content
# snapshot would point at a file the container cannot see.
#
# The image therefore keeps its copy at /app/seed-uploads (outside the mount)
# and this fills in whatever the volume is missing. Existing files are left
# alone: the volume is authoritative for anything uploaded through the panel,
# and upload filenames carry a content hash, so a collision is the same file.
set -e

if [ -d /app/seed-uploads ]; then
  mkdir -p "$PWD/public/uploads"
  # An explicit loop rather than `cp -n`: this is busybox sh, and a flag it
  # doesn't support would fail the copy quietly and leave images broken.
  for src in /app/seed-uploads/*; do
    [ -e "$src" ] || continue
    dest="$PWD/public/uploads/$(basename "$src")"
    [ -e "$dest" ] || cp "$src" "$dest"
  done
fi

exec "$@"
