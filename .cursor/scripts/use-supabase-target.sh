#!/usr/bin/env bash
#
# Switch which Supabase backend the app talks to, then rewrite .env.local.
#
#   .cursor/scripts/use-supabase-target.sh local     # local Docker stack (default)
#   .cursor/scripts/use-supabase-target.sh staging   # remote staging project
#   .cursor/scripts/use-supabase-target.sh prod      # remote production hub
#
# Remote targets read their keys from, in order of precedence:
#   1. A local dotenv file (repo convention), if present on the VM:
#        staging -> .env.stage.local     prod -> .env.prod.local
#      (both are gitignored, so they never ship in the repo).
#   2. Cloud Agent Secrets:
#        STAGING_SUPABASE_ANON_KEY (required)  STAGING_SUPABASE_SERVICE_ROLE_KEY (optional)
#        PROD_SUPABASE_ANON_KEY    (required)  PROD_SUPABASE_SERVICE_ROLE_KEY    (optional)
#        STAGING_SUPABASE_URL / PROD_SUPABASE_URL (optional; default to the documented refs)
#
# After switching, restart the "vite-dev" terminal (Ctrl-C, then `npm run dev`)
# so Vite reloads the new .env.local.
#
set -euo pipefail

target="${1:-}"
case "$target" in
  local|staging|stg|prod|production) ;;
  *)
    echo "usage: $0 <local|staging|prod>" >&2
    exit 1
    ;;
esac

SUPABASE_TARGET="$target" bash /workspace/.cursor/scripts/bootstrap-supabase.sh

echo
echo "Switched Supabase target to '$target'. Restart the vite-dev terminal"
echo "(Ctrl-C, then 'npm run dev') so Vite picks up the new .env.local."
