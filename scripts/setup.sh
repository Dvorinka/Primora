#!/bin/bash
set -e

# Primora Setup Script
# Simplified deployment for local and single-dev environments

echo "🚀 Starting Primora Platform Setup..."

# Check dependencies
if ! command -v docker &> /dev/null; then
    echo "❌ Error: docker is not installed."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: docker-compose is not installed."
    exit 1
fi

# Create .env from .env.example if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    
    # Generate secrets
    echo "🔐 Generating secure secrets..."
    JWT_SECRET=$(openssl rand -base64 32)
    BETTER_AUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    
    # Update .env with secrets
    # Use different sed approach for better compatibility
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/JWT_SECRET=change-me-super-long-jwt-secret/JWT_SECRET=$JWT_SECRET/g" .env
        sed -i '' "s/BETTER_AUTH_SECRET=change-me-super-long-better-auth-secret/BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET/g" .env
        sed -i '' "s/^PRIMORA_ENCRYPTION_KEY=.*/PRIMORA_ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    else
        sed -i "s/JWT_SECRET=change-me-super-long-jwt-secret/JWT_SECRET=$JWT_SECRET/g" .env
        sed -i "s/BETTER_AUTH_SECRET=change-me-super-long-better-auth-secret/BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET/g" .env
        sed -i "s/^PRIMORA_ENCRYPTION_KEY=.*/PRIMORA_ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    fi
    echo "✅ .env file created and secured."
else
    echo "ℹ️ .env file already exists. Skipping creation."
fi

# Ask for domain/host
read -p "🌐 Enter your domain or IP (default: localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

# Plain HTTP for localhost/IPs; domains are presumed to sit behind a TLS
# proxy (see DEPLOYMENT_GUIDE.md — Primora never terminates TLS itself).
if [[ "$DOMAIN" == "localhost" || "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    SCHEME="http"
else
    SCHEME="https"
fi
BASE_URL="$SCHEME://$DOMAIN"

rewrite_env() {
    # $1 = var name, $2 = new value — anchor to the full line so prior values
    # (ports, stale paths) are replaced regardless of what .env.example held.
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^$1=.*|$1=$2|" .env
    else
        sed -i "s|^$1=.*|$1=$2|" .env
    fi
}

rewrite_env AUTH_BASE_URL "$BASE_URL/auth"
rewrite_env BETTER_AUTH_URL "$BASE_URL/auth"
rewrite_env VITE_APP_URL "$BASE_URL"
rewrite_env VITE_AUTH_BASE_URL "$BASE_URL/auth"
rewrite_env VITE_API_BASE_URL "$BASE_URL/api/v1"
rewrite_env BACKEND_PUBLIC_URL "$BASE_URL/api/v1"
rewrite_env COOKIE_DOMAIN "$DOMAIN"

# Start services — the dev overlay adds mailpit for local email capture.
# Production deploys use the base file alone: docker compose up -d
echo "📦 Pulling images and starting services..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
else
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
fi

echo ""
echo "✨ Primora is now setting up in the background!"
echo "📡 Access your platform at: http://$DOMAIN"
echo "📧 Check emails (Mailpit) at: http://$DOMAIN/mailpit"
echo ""
echo "🛠️ To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
echo ""
echo "Enjoy your simplified development platform! 🚀"
