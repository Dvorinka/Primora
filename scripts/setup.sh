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
    
    # Update .env with secrets
    # Use different sed approach for better compatibility
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/JWT_SECRET=change-me-super-long-jwt-secret/JWT_SECRET=$JWT_SECRET/g" .env
        sed -i '' "s/BETTER_AUTH_SECRET=change-me-super-long-better-auth-secret/BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET/g" .env
    else
        sed -i "s/JWT_SECRET=change-me-super-long-jwt-secret/JWT_SECRET=$JWT_SECRET/g" .env
        sed -i "s/BETTER_AUTH_SECRET=change-me-super-long-better-auth-secret/BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET/g" .env
    fi
    echo "✅ .env file created and secured."
else
    echo "ℹ️ .env file already exists. Skipping creation."
fi

# Ask for domain/host
read -p "🌐 Enter your domain or IP (default: localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/COOKIE_DOMAIN=localhost/COOKIE_DOMAIN=$DOMAIN/g" .env
    sed -i '' "s/BETTER_AUTH_URL=http:\/\/localhost/BETTER_AUTH_URL=http:\/\/$DOMAIN/g" .env
    sed -i '' "s/VITE_APP_URL=http:\/\/localhost/VITE_APP_URL=http:\/\/$DOMAIN/g" .env
else
    sed -i "s/COOKIE_DOMAIN=localhost/COOKIE_DOMAIN=$DOMAIN/g" .env
    sed -i "s/BETTER_AUTH_URL=http:\/\/localhost/BETTER_AUTH_URL=http:\/\/$DOMAIN/g" .env
    sed -i "s/VITE_APP_URL=http:\/\/localhost/VITE_APP_URL=http:\/\/$DOMAIN/g" .env
fi

# Start services
echo "📦 Pulling images and starting services..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
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
