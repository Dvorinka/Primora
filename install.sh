#!/usr/bin/env bash
# Primora one-line installer.
#
#   curl -fsSL https://raw.githubusercontent.com/Dvorinka/Primora/master/install.sh | bash
#
# Installs into ./primora (override with PRIMORA_DIR). Non-interactive:
#   DOMAIN=example.com NGINX_PORT=8080 bash install.sh
#
# Pulls prebuilt GHCR images when available; otherwise downloads the source
# tarball and builds locally. Either way the result is the same compose stack.

set -euo pipefail

REPO="Dvorinka/Primora"
REF="${PRIMORA_REF:-master}"
DIR="${PRIMORA_DIR:-primora}"
DOMAIN="${DOMAIN:-localhost}"
NGINX_PORT="${NGINX_PORT:-80}"

info() { echo "==> $*"; }
die()  { echo "ERROR: $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker is not installed"
docker compose version >/dev/null 2>&1 || die "docker compose plugin is not installed"
command -v curl >/dev/null 2>&1 || die "curl is not installed"

mkdir -p "$DIR/infra/nginx"
cd "$DIR"

# The compose stack needs exactly these three files from the repo.
info "Fetching compose files ($REF)"
for f in docker-compose.yml .env.example infra/nginx/default.conf; do
  curl -fsSL "https://raw.githubusercontent.com/$REPO/$REF/$f" -o "$f"
done

if [ ! -f .env ]; then
  info "Generating .env with random secrets"
  cp .env.example .env

  JWT_SECRET=$(openssl rand -base64 32)
  BETTER_AUTH_SECRET=$(openssl rand -base64 32)
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  DB_PASSWORD=$(openssl rand -hex 16)

  # '|' delimiter: base64 output can contain '/', '+', '='.
  SED=(sed -i)
  [[ "$OSTYPE" == darwin* ]] && SED=(sed -i '')

  "${SED[@]}" "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$DB_PASSWORD|" .env
  "${SED[@]}" "s|postgres://primora:primora@|postgres://primora:$DB_PASSWORD@|" .env
  "${SED[@]}" "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
  "${SED[@]}" "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET|" .env
  "${SED[@]}" "s|^PRIMORA_ENCRYPTION_KEY=.*|PRIMORA_ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env
  "${SED[@]}" "s|^NGINX_PORT=.*|NGINX_PORT=$NGINX_PORT|" .env

  if [ "$DOMAIN" != "localhost" ]; then
    "${SED[@]}" "s|http://localhost|http://$DOMAIN|g" .env
    "${SED[@]}" "s|^COOKIE_DOMAIN=.*|COOKIE_DOMAIN=$DOMAIN|" .env
  fi
else
  info "Existing .env kept"
fi

# Compose v5 skips `pull` for services that declare build:, so fetch the
# prebuilt images directly. --no-build keeps `up` from rebuilding them.
GHCR_OWNER=$(echo "$REPO" | cut -d/ -f1 | tr '[:upper:]' '[:lower:]')
if docker pull "ghcr.io/$GHCR_OWNER/primora-backend:latest" \
  && docker pull "ghcr.io/$GHCR_OWNER/primora-auth:latest" \
  && docker pull "ghcr.io/$GHCR_OWNER/primora-frontend:latest"; then
  info "Starting prebuilt images"
  docker compose up -d --no-build
else
  # GHCR packages are private until first published release — build from source.
  info "Prebuilt images unavailable; building from source"
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$REF" | tar xz --strip-components=1
  docker compose up -d --build
fi

DISPLAY_URL="http://$DOMAIN"
[ "$NGINX_PORT" != "80" ] && DISPLAY_URL="$DISPLAY_URL:$NGINX_PORT"

info "Primora is starting"
echo "  Dashboard:  $DISPLAY_URL"
echo "  Health:     $DISPLAY_URL/api/v1/health/liveness"
echo "  Logs:       cd $DIR && docker compose logs -f"
echo "  Stop:       cd $DIR && docker compose down"
