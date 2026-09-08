#!/usr/bin/env bash
#
# Build-time setup (runs after checkout; result is captured in the environment
# snapshot). Keep this idempotent and terminating.
#
set -euo pipefail
cd /workspace

echo "[install] npm ci"
npm ci

# Best-effort: pull the Supabase Docker images and initialise the local DB at
# build time so they are baked into the snapshot and agent boots are fast. This
# is guarded because the Docker daemon may not be runnable during the build
# phase; if it is skipped here, start.sh performs the same work on first boot.
echo "[install] pre-warming local Supabase stack (best-effort)"
if bash /workspace/.cursor/scripts/bootstrap-supabase.sh; then
  echo "[install] Supabase stack pre-warmed"
else
  echo "[install] pre-warm skipped; start.sh will bring Supabase up on boot"
fi
