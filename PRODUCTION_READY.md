# Primora Production Ready Upgrade

The Primora Platform has been enhanced to be a fully working, production-ready alternative to Appwrite/Supabase, optimized for single developers and smaller teams.

## 🚀 Key Enhancements

### 1. Expanded Authentication
- **Added Discord Provider**: Configure `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`.
- **Added Microsoft Provider**: Configure `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT_ID`.
- **Better-Auth Integration**: Robust social login flow on the frontend with native icons.

### 2. "Collections" - JSON Document Store
- **New Feature**: A simplified database layer for storing dynamic JSON documents.
- **Backend implementation**: New `core.collections` and `core.documents` tables in PostgreSQL with GIN indexing for fast JSONB search.
- **API Endpoints**: Full CRUD for Collections and Documents in the Go backend.
- **Frontend UI**: A new `Collections` page for managing data, creating schemas, and editing documents in a JSON editor.

### 3. Production Infrastructure
- **Multi-stage Dockerfiles**: Optimized builds for both Backend (Go) and Frontend (Vite/Nginx).
- **Security-First Compose**: Pinned images, health checks, and secure reverse proxy setup.
- **Nginx Reverse Proxy**: Single entry point for Frontend, API, and Auth services with SPA routing support.

### 4. Simplified Deployment
- **One-Click Setup**: New `scripts/setup.sh` script to automate everything.
  - Generates `.env` from template.
  - Automatically generates secure JWT and Auth secrets.
  - Configures domains and starts the Docker stack.

## 🛠️ Getting Started in Production

1. Run the setup script:
   ```bash
   ./scripts/setup.sh
   ```
2. Follow the prompts to set your domain (default `localhost`).
3. Access your dashboard and start building!

## 📦 What's Inside?

- **Frontend**: SolidJS + Tailwind (Nginx)
- **Backend**: Go (Gin + pgx)
- **Auth**: Node.js (Better-Auth + Hono)
- **Database**: PostgreSQL 17
- **Cache**: DragonflyDB (Redis compatible)
- **Email**: Mailpit (Dev/Local)
- **Proxy**: Nginx
