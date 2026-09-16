#!/usr/bin/env bash
#
# Configure the Supabase backend for PickupFrisbee based on SUPABASE_TARGET:
#
#   local   (default) - bring up the local Supabase stack (Docker) and apply the
#                       canonical fresh schema (supabase/schema.sql) + seed data.
#   staging           - point .env.local at the remote staging project.
#   prod              - point .env.local at the remote production hub (read-first;
#                       never auto-seeds).
#
# All targets write .env.local, which is the single source the Vite app and the
# node scripts (seed/verify) read. Idempotent and safe to re-run: it is used both
# at build time (install.sh) and on every boot (start.sh).
#
set -euo pipefail

REPO="${REPO:-/workspace}"
cd "$REPO"

log() { echo "[supabase-bootstrap] $*"; }

TARGET="${SUPABASE_TARGET:-local}"

# Public project refs (documented in README.md). The URLs are not secret; only
# the anon/service keys are. Each is overridable via the matching *_URL secret.
STAGING_URL_DEFAULT="https://iunqmpxpwhybqyfxcsdt.supabase.co"
PROD_URL_DEFAULT="https://mczxxonwvsztbrqmjzlu.supabase.co"

# Vercel platform vars (e.g. VERCEL_OIDC_TOKEN) come from `vercel env pull`,
# which writes .env.vercel.local (gitignored, VM-only). We merge only VERCEL_*
# keys into the generated .env.local so the dev server and node scripts (which
# read .env.local) can use the OIDC token, without clobbering the target's
# Supabase config. Keys already present in .env.local are left untouched.
VERCEL_ENV_FILE="$REPO/.env.vercel.local"

merge_vercel_env() {
  [ -f "$VERCEL_ENV_FILE" ] || return 0
  [ -f "$REPO/.env.local" ] || return 0
  local added=0 key
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue;; esac
    key="${line%%=*}"
    [ "$key" = "$line" ] && continue          # no '='
    case "$key" in VERCEL_*) ;; *) continue;; esac
    grep -q "^${key}=" "$REPO/.env.local" && continue
    printf '%s\n' "$line" >> "$REPO/.env.local"
    added=$((added + 1))
  done < "$VERCEL_ENV_FILE"
  [ "$added" -gt 0 ] && log "merged $added VERCEL_* var(s) from .env.vercel.local into .env.local"
  return 0
}

# ===========================================================================
# LOCAL TARGET
# ===========================================================================

# ---------------------------------------------------------------------------
# 1. Docker daemon
# ---------------------------------------------------------------------------
ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  log "starting dockerd (fuse-overlayfs)..."
  sudo mkdir -p /etc/docker
  # The VM root fs is an overlay mount, so overlay2 cannot mount nested there;
  # fuse-overlayfs works and keeps images on disk so they persist in snapshots.
  echo '{ "storage-driver": "fuse-overlayfs" }' | sudo tee /etc/docker/daemon.json >/dev/null
  sudo bash -c 'nohup dockerd >/var/log/dockerd.log 2>&1 &'
  for _ in $(seq 1 60); do
    if sudo docker info >/dev/null 2>&1; then break; fi
    sleep 1
  done
  sudo chmod 666 /var/run/docker.sock || true
  docker info >/dev/null 2>&1 || { log "dockerd failed to start"; return 1; }
}

# ---------------------------------------------------------------------------
# 2. Nested-container networking fix
# ---------------------------------------------------------------------------
# Docker installs its ACCEPT rules in the nftables backend, but the VM also has
# a leftover legacy-iptables FORWARD chain whose policy is DROP. With bridge
# netfilter enabled, that legacy chain drops bridged container-to-container
# packets, so Supabase services (e.g. Realtime -> Postgres) time out. Bypass
# bridge netfilter and open the legacy FORWARD policy.
fix_network() {
  sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 >/dev/null 2>&1 || true
  sudo sysctl -w net.bridge.bridge-nf-call-ip6tables=0 >/dev/null 2>&1 || true
  sudo iptables-legacy -P FORWARD ACCEPT >/dev/null 2>&1 || true
}

# ---------------------------------------------------------------------------
# 3. Supabase stack
# ---------------------------------------------------------------------------
# The numbered files in supabase/migrations are legacy remote-push history for
# the shared hub and do NOT apply cleanly to a fresh local database (they alter
# tables that only get created later / in another schema). The documented
# fresh-install path is supabase/schema.sql, so we start the stack WITHOUT
# running those migrations and load schema.sql directly.
MIG="$REPO/supabase/migrations"
BAK="$REPO/supabase/.temp/migrations-disabled"

disable_migrations() {
  mkdir -p "$BAK"
  shopt -s nullglob
  for f in "$MIG"/*.sql; do mv -f "$f" "$BAK"/; done
  shopt -u nullglob
}

restore_migrations() {
  mkdir -p "$MIG"
  shopt -s nullglob
  for f in "$BAK"/*.sql; do mv -f "$f" "$MIG"/; done
  shopt -u nullglob
}

db_container()   { docker ps --filter "name=supabase_db_"   --format '{{.Names}}' | head -1; }
rest_container() { docker ps --filter "name=supabase_rest_" --format '{{.Names}}' | head -1; }

db_healthy() {
  local db; db="$(db_container)"
  [ -n "$db" ] && docker exec "$db" pg_isready -U postgres >/dev/null 2>&1
}

start_stack() {
  # A running-but-unhealthy stack can happen when booting from a snapshot that
  # captured Postgres mid-run; only treat the stack as up when the DB actually
  # accepts connections, otherwise stop and start cleanly (the DB volume, and
  # therefore the schema/seed, is preserved across a plain `supabase stop`).
  if db_healthy; then
    log "supabase already running and healthy"
    return 0
  fi
  if [ -n "$(db_container)" ]; then
    log "supabase present but DB not healthy; restarting cleanly..."
    supabase stop >/dev/null 2>&1 || true
  fi
  log "starting supabase stack..."
  disable_migrations
  trap restore_migrations EXIT
  # --ignore-health-check: PostgREST is unhealthy until schema.sql is loaded
  # (the exposed pickup_frisbee/lyanne_library schemas do not exist yet).
  supabase start --ignore-health-check
  restore_migrations
  trap - EXIT
}

wait_db_ready() {
  for _ in $(seq 1 60); do
    db_healthy && return 0
    sleep 1
  done
  log "WARN: Postgres did not become ready in time"
  return 1
}

status_val() {
  # $1 = key name, e.g. API_URL
  supabase status -o env 2>/dev/null | sed -n "s/^$1=\"\\(.*\\)\"$/\\1/p"
}

apply_schema_if_missing() {
  local db; db="$(db_container)"
  if docker exec -i "$db" psql -U postgres -d postgres -tAc \
       "select to_regclass('pickup_frisbee.games')" 2>/dev/null | grep -q games; then
    log "schema already present; skipping schema.sql"
    return 0
  fi
  log "applying supabase/schema.sql..."
  # lyanne_library is a foreign schema listed in config.toml's exposed schemas
  # but never created by this repo; create it empty so PostgREST's cache loads.
  docker exec -i "$db" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c \
    "CREATE SCHEMA IF NOT EXISTS lyanne_library; GRANT USAGE ON SCHEMA lyanne_library TO anon, authenticated, service_role;"
  docker exec -i "$db" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < "$REPO/supabase/schema.sql"
}

ensure_rest_healthy() {
  local url anon code
  url="$(status_val API_URL)"; anon="$(status_val ANON_KEY)"
  for attempt in 1 2; do
    for _ in $(seq 1 20); do
      code="$(curl -s -o /dev/null -w '%{http_code}' \
        "$url/rest/v1/groups?select=id&limit=1" \
        -H "apikey: $anon" -H "Accept-Profile: pickup_frisbee" 2>/dev/null || true)"
      [ "$code" = "200" ] && { log "PostgREST healthy"; return 0; }
      sleep 2
    done
    # PostgREST caches the schema on boot; restart it once to pick up schema.sql.
    log "restarting PostgREST to reload schema cache..."
    docker restart "$(rest_container)" >/dev/null 2>&1 || true
    sleep 3
  done
  log "WARN: PostgREST did not become healthy"
  return 1
}

write_env_local() {
  local url anon svc
  url="$(status_val API_URL)"; anon="$(status_val ANON_KEY)"; svc="$(status_val SERVICE_ROLE_KEY)"
  [ -n "$url" ] && [ -n "$anon" ] || { log "WARN: could not read supabase status; keeping existing .env.local"; return 0; }
  cat > "$REPO/.env.local" <<EOF
# Auto-generated by .cursor/scripts/bootstrap-supabase.sh (target: local).
# Points at the local Supabase stack (supabase start). Gitignored.
VITE_SUPABASE_URL=$url
VITE_SUPABASE_ANON_KEY=$anon
VITE_SUPABASE_DB_SCHEMA=pickup_frisbee
SUPABASE_URL=$url
SUPABASE_SERVICE_ROLE_KEY=$svc
VITE_ENABLE_SW=false
EOF
  log "wrote .env.local (local)"
}

seed_if_empty() {
  local url anon count
  url="$(status_val API_URL)"; anon="$(status_val ANON_KEY)"
  count="$(curl -s "$url/rest/v1/games?select=id" \
    -H "apikey: $anon" -H "Accept-Profile: pickup_frisbee" 2>/dev/null | grep -c '"id"' || true)"
  if [ "${count:-0}" -gt 0 ]; then
    log "games already seeded; skipping db:seed"
    return 0
  fi
  log "seeding groups and games..."
  npm run db:seed
}

setup_local() {
  ensure_docker
  fix_network
  start_stack
  wait_db_ready
  apply_schema_if_missing
  write_env_local
  ensure_rest_healthy
  seed_if_empty
}

# ===========================================================================
# REMOTE TARGETS (staging / prod)
# ===========================================================================
#
# Key resolution for a remote target, in order of precedence:
#   1. A local dotenv file (.env.stage.local / .env.prod.local) if present.
#      This matches the repo's local convention and is copied verbatim to
#      .env.local (with schema/SW defaults appended if absent), so any extra
#      vars in it (e.g. VAPID keys) are preserved.
#   2. The matching Cloud Agent Secrets: <PREFIX>_SUPABASE_ANON_KEY (required),
#      <PREFIX>_SUPABASE_SERVICE_ROLE_KEY (optional), <PREFIX>_SUPABASE_URL
#      (optional; defaults to the documented project ref).
# These files are gitignored (.env*.local), so they never ship in the repo and
# must be provided on the VM (pasted in or added as secrets).

# read_env_var <file> <name>: last matching value, quotes stripped.
read_env_var() {
  sed -n "s/^$2=//p" "$1" 2>/dev/null | tail -1 | sed 's/^["'\'']//; s/["'\'']$//'
}

# write_env_remote <target> <url> <anon> <service>
write_env_remote() {
  local target="$1" url="$2" anon="$3" svc="$4"
  cat > "$REPO/.env.local" <<EOF
# Auto-generated by .cursor/scripts/bootstrap-supabase.sh (target: $target).
# Points at the REMOTE $target Supabase project. Gitignored.
VITE_SUPABASE_URL=$url
VITE_SUPABASE_ANON_KEY=$anon
VITE_SUPABASE_DB_SCHEMA=pickup_frisbee
SUPABASE_URL=$url
SUPABASE_SERVICE_ROLE_KEY=$svc
VITE_ENABLE_SW=false
EOF
  log "wrote .env.local ($target -> $url)"
}

# check_remote <url> <anon>: probe PostgREST with the anon key. Reachability
# problems only warn (the app will surface its own error); they never abort boot.
check_remote() {
  local url="$1" anon="$2" code
  [ -n "$url" ] && [ -n "$anon" ] || { log "WARN: missing url/anon; skipping reachability probe"; return 0; }
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 15 \
    "$url/rest/v1/groups?select=id&limit=1" \
    -H "apikey: $anon" -H "Accept-Profile: pickup_frisbee" 2>/dev/null || true)"
  case "$code" in
    200) log "remote PostgREST reachable and authorized (HTTP 200)";;
    401|403) log "WARN: remote reachable but key rejected (HTTP $code) - check the anon key";;
    000|"") log "WARN: could not reach $url (network/egress) - app may fail to load data";;
    *) log "WARN: unexpected response from remote (HTTP $code)";;
  esac
}

warn_if_prod() {
  [ "$1" = "prod" ] || return 0
  log "############################################################"
  log "# TARGET=prod: .env.local now points at PRODUCTION.        #"
  log "# Anything you do in the app writes to LIVE data.          #"
  log "# Remote seeding is never run automatically for prod.      #"
  log "############################################################"
}

# setup_remote <target> <url_default> <secret_prefix> <dotenv_file>
setup_remote() {
  local target="$1" url_default="$2" prefix="$3" file="$4"
  local url anon

  # 1. Prefer a local dotenv file (repo convention).
  if [ -f "$REPO/$file" ]; then
    log "using $file"
    cp "$REPO/$file" "$REPO/.env.local"
    grep -q '^VITE_SUPABASE_DB_SCHEMA=' "$REPO/.env.local" || echo 'VITE_SUPABASE_DB_SCHEMA=pickup_frisbee' >> "$REPO/.env.local"
    grep -q '^VITE_ENABLE_SW='          "$REPO/.env.local" || echo 'VITE_ENABLE_SW=false'                    >> "$REPO/.env.local"
    url="$(read_env_var "$REPO/.env.local" VITE_SUPABASE_URL)"
    anon="$(read_env_var "$REPO/.env.local" VITE_SUPABASE_ANON_KEY)"
    if [ -z "$anon" ]; then
      log "WARN: $file has no VITE_SUPABASE_ANON_KEY; the app will not load data."
    fi
    warn_if_prod "$target"
    check_remote "$url" "$anon"
    return 0
  fi

  # 2. Fall back to Cloud Agent Secrets.
  local svc
  url="$(eval "printf '%s' \"\${${prefix}_SUPABASE_URL:-}\"")"
  anon="$(eval "printf '%s' \"\${${prefix}_SUPABASE_ANON_KEY:-}\"")"
  svc="$(eval "printf '%s' \"\${${prefix}_SUPABASE_SERVICE_ROLE_KEY:-}\"")"
  url="${url:-$url_default}"

  if [ -z "$anon" ]; then
    log "ERROR: SUPABASE_TARGET=$target but no $file file and ${prefix}_SUPABASE_ANON_KEY is not set."
    log "Provide $file on the VM, or add ${prefix}_SUPABASE_ANON_KEY (and optionally"
    log "${prefix}_SUPABASE_URL / ${prefix}_SUPABASE_SERVICE_ROLE_KEY) in Cloud Agent Secrets, then re-run."
    return 1
  fi

  warn_if_prod "$target"
  write_env_remote "$target" "$url" "$anon" "$svc"
  check_remote "$url" "$anon"
}

# ===========================================================================
# DISPATCH
# ===========================================================================
log "target: $TARGET"
case "$TARGET" in
  local)
    setup_local
    ;;
  staging|stg)
    setup_remote staging "$STAGING_URL_DEFAULT" STAGING .env.stage.local
    ;;
  prod|production)
    setup_remote prod "$PROD_URL_DEFAULT" PROD .env.prod.local
    ;;
  *)
    log "ERROR: unknown SUPABASE_TARGET='$TARGET' (expected: local | staging | prod)"
    exit 1
    ;;
esac
merge_vercel_env
log "done"
