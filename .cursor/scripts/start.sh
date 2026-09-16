#!/usr/bin/env bash
#
# Per-boot startup: start the Docker daemon, apply the nested-networking fix,
# and bring up the local Supabase stack (schema + seed). Returns once the stack
# is ready; the Vite dev server runs separately via the "vite-dev" terminal.
#
set -euo pipefail
bash /workspace/.cursor/scripts/bootstrap-supabase.sh
