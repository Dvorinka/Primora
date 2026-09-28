#!/usr/bin/env bash
# Primora one-line installer.
#
#   curl -fsSL https://raw.githubusercontent.com/Dvorinka/Primora/master/install.sh | bash
#
# Installs into ./primora (override with PRIMORA_DIR). On a fresh install,
# interactive shells get one question — the URL the app will be opened on
# (domain or IP, optional port). Non-interactive:
#   PUBLIC_URL=https://primora.example.com bash install.sh
#   DOMAIN=192.168.1.50 NGINX_PORT=8085 bash install.sh   (legacy form)
#
# https URLs mean TLS terminates at your own proxy in front of Primora's
# bundled nginx (which always speaks http on NGINX_PORT).
#
# Pulls prebuilt GHCR images when available; otherwise downloads the source
# tarball and builds locally. Either way the result is the same compose stack.

set -euo pipefail

REPO="Dvorinka/Primora"
REF="${PRIMORA_REF:-master}"
DIR="${PRIMORA_DIR:-primora}"
NGINX_PORT="${NGINX_PORT:-80}"
PUBLIC_URL="${PUBLIC_URL:-}"

info() { echo "==> $*"; }
die()  { echo "ERROR: $*" >&2; exit 1; }

# '|' delimiter for sed: base64 output can contain '/', '+', '='.
SED=(sed -i)
[[ "$OSTYPE" == darwin* ]] && SED=(sed -i '')

command -v docker >/dev/null 2>&1 || die "docker is not installed"
docker compose version >/dev/null 2>&1 || die "docker compose plugin is not installed"
command -v curl >/dev/null 2>&1 || die "curl is not installed"

mkdir -p "$DIR/infra/nginx"
cd "$DIR"

# The compose stack needs exactly these three files from the repo.
# Timeouts + retries: a stalled connection must fail loudly, not hang.
info "Fetching compose files ($REF)"
for f in docker-compose.yml .env.example infra/nginx/default.conf; do
  curl -fsSL --connect-timeout 10 --max-time 60 --retry 3 --retry-delay 1 --retry-all-errors \
    "https://raw.githubusercontent.com/$REPO/$REF/$f" -o "$f" \
    || die "could not fetch $f — check connectivity to raw.githubusercontent.com"
done

if [ -f .env ]; then
  info "Existing .env kept"
  # Display URL comes from the file — answers here would change nothing.
  PUBLIC_URL="$(grep -E '^VITE_APP_URL=' .env | tail -1 | cut -d= -f2- || true)"
  [ -z "$PUBLIC_URL" ] && PUBLIC_URL="http://localhost"
else
  # Public URL — the single question. Env wins, then prompt, then default.
  if [ -z "$PUBLIC_URL" ] && [ -n "${DOMAIN:-}" ]; then
    PUBLIC_URL="http://${DOMAIN}"
    [ "$NGINX_PORT" != "80" ] && PUBLIC_URL="$PUBLIC_URL:$NGINX_PORT"
  fi
  if [ -z "$PUBLIC_URL" ]; then
    DEFAULT_URL="http://localhost"
    [ "$NGINX_PORT" != "80" ] && DEFAULT_URL="http://localhost:$NGINX_PORT"
    # Under `curl | bash` stdin is the script pipe — prompt on the
    # controlling terminal instead. No tty (CI/cron) → default silently.
    if exec 9</dev/tty 2>/dev/null; then
      read -rp "URL where you'll open Primora (domain or IP, e.g. https://primora.example.com) [$DEFAULT_URL]: " PUBLIC_URL <&9 || true
      exec 9>&-
    fi
    PUBLIC_URL="${PUBLIC_URL:-$DEFAULT_URL}"
  fi

  # Normalize: default scheme http, strip trailing slash.
  case "$PUBLIC_URL" in
    http://*|https://*) ;;
    *) PUBLIC_URL="http://$PUBLIC_URL" ;;
  esac
  PUBLIC_URL="${PUBLIC_URL%/}"

  # Split host[:port]; URL paths aren't supported — nginx mounts auth at /auth.
  REST="${PUBLIC_URL#*://}"
  HOSTPORT="${REST%%/*}"
  [ "$REST" != "$HOSTPORT" ] && die "URL paths are not supported — use a domain or port instead: $PUBLIC_URL"
  if [[ "$HOSTPORT" == *:* ]]; then
    HOST="${HOSTPORT%%:*}"
    PORT="${HOSTPORT##*:}"
  else
    HOST="$HOSTPORT"; PORT=""
  fi
  [ -z "$HOST" ] && die "could not parse a host from: $PUBLIC_URL"
  if [ -n "$PORT" ]; then
    [[ "$PORT" =~ ^[0-9]+$ ]] || die "invalid port in: $PUBLIC_URL"
    NGINX_PORT="$PORT"
  fi

  info "Generating .env with random secrets"
  cp .env.example .env

  JWT_SECRET=$(openssl rand -base64 32)
  BETTER_AUTH_SECRET=$(openssl rand -base64 32)
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  DB_PASSWORD=$(openssl rand -hex 16)

  "${SED[@]}" "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$DB_PASSWORD|" .env
  "${SED[@]}" "s|postgres://primora:primora@|postgres://primora:$DB_PASSWORD@|" .env
  "${SED[@]}" "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
  "${SED[@]}" "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET|" .env
  "${SED[@]}" "s|^PRIMORA_ENCRYPTION_KEY=.*|PRIMORA_ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env
  "${SED[@]}" "s|^NGINX_PORT=.*|NGINX_PORT=$NGINX_PORT|" .env

  # Every public URL var (VITE_APP_URL, BETTER_AUTH_URL, AUTH_BASE_URL,
  # VITE_AUTH_BASE_URL, VITE_API_BASE_URL, BACKEND_PUBLIC_URL) is built on the
  # http://localhost prefix in .env.example — one rewrite covers them all.
  "${SED[@]}" "s|http://localhost|$PUBLIC_URL|g" .env

  # Cookie domains only apply to real DNS names — never IPs or localhost.
  if [ "$HOST" != "localhost" ] && ! [[ "$HOST" =~ ^[0-9.]+$ ]]; then
    "${SED[@]}" "s|^COOKIE_DOMAIN=.*|COOKIE_DOMAIN=$HOST|" .env
  fi
fi

# Compose v5 skips `pull` for services that declare build:, so fetch the
# prebuilt images directly. --no-build keeps `up` from rebuilding them.
GHCR_OWNER=$(echo "$REPO" | cut -d/ -f1 | tr '[:upper:]' '[:lower:]')
if docker pull "ghcr.io/$GHCR_OWNER/primora-backend:latest" \
  && docker pull "ghcr.io/$GHCR_OWNER/primora-auth:latest" \
  && docker pull "ghcr.io/$GHCR_OWNER/primora-frontend:latest"; then
  info "Starting prebuilt images"
  # The source tree isn't downloaded on this path — strip build: blocks so a
  # later `compose build`/`up --build` can't fail on missing apps/*/Dockerfile.
  "${SED[@]}" '/^[[:space:]]*build:/,/^[[:space:]]*dockerfile:/d' docker-compose.yml
  docker compose up -d --no-build
else
  # GHCR packages are private until first published release — build from source.
  info "Prebuilt images unavailable; building from source"
  curl -fsSL --connect-timeout 10 --max-time 120 --retry 3 --retry-delay 1 --retry-all-errors \
    "https://codeload.github.com/$REPO/tar.gz/refs/heads/$REF" | tar xz --strip-components=1
  docker compose up -d --build
fi

info "Primora is starting"
echo "  Dashboard:  $PUBLIC_URL"
echo "  Health:     $PUBLIC_URL/api/v1/health/liveness"
echo "  Logs:       cd $DIR && docker compose logs -f"
echo "  Stop:       cd $DIR && docker compose down"
if [[ "$PUBLIC_URL" == https://* ]]; then
  echo
  echo "  Primora listens on http port $NGINX_PORT — point your TLS proxy there."
fi
