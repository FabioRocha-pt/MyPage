#!/bin/sh
set -e

# Bring the database schema up to date before the app starts. The project uses
# `prisma db push` (no migration history). Without --accept-data-loss it refuses
# any change that would drop data, so a destructive schema change stops the
# container here instead of silently losing rows.
if [ "${SKIP_DB_PUSH:-0}" != "1" ]; then
  ./node_modules/.bin/prisma db push --skip-generate
fi

exec "$@"
