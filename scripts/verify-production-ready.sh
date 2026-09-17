#!/bin/bash

# Primora Production Readiness Verification Script
# This script checks if all production-ready components are in place

set -e

echo "🔍 Verifying Primora Production Readiness..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((++PASSED))
    else
        echo -e "${RED}✗${NC} $2 (missing: $1)"
        ((++FAILED))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((++PASSED))
    else
        echo -e "${RED}✗${NC} $2 (missing: $1)"
        ((++FAILED))
    fi
}

echo "📦 Backend Components:"
check_file "apps/backend/internal/observability/metrics.go" "Metrics collection"
check_file "apps/backend/internal/middleware/cors.go" "CORS middleware"
check_file "apps/backend/internal/middleware/compression.go" "Compression middleware"
check_file "apps/backend/internal/middleware/metrics.go" "Metrics middleware"
check_file "apps/backend/internal/handlers/http_integration_test.go" "Integration tests"
echo ""

echo "🎨 Frontend Components:"
check_file "apps/frontend/vitest.config.ts" "Vitest configuration"
check_file "apps/frontend/src/lib/__tests__/setup.ts" "Test setup"
check_file "apps/frontend/src/lib/__tests__/api.test.ts" "API tests"
echo ""

echo "🔄 CI/CD:"
check_file ".github/workflows/ci.yml" "GitHub Actions workflow"
echo ""

echo "📚 Documentation:"
check_file "PRODUCTION_READINESS.md" "Production readiness checklist"
check_file "DEPLOYMENT_GUIDE.md" "Deployment guide"
check_file "ROADMAP.md" "Roadmap"
echo ""

echo "🛡️ Phase 6 hardening:"
check_file "apps/backend/db/migrations/00006_api_key_scopes.sql" "API key scopes migration"
check_file "apps/backend/db/migrations/00007_retention.sql" "Retention migration"
check_file "apps/backend/internal/services/retention.go" "Retention sweeper"
check_file "docker-compose.dev.yml" "Dev overlay (Mailpit isolation)"
check_file "scripts/smoke-e2e.sh" "E2E smoke script"
check_file "scripts/backup.sh" "Backup script"
check_file "scripts/restore.sh" "Restore script"
check_file "scripts/load-sanity.js" "k6 load sanity script"
echo ""

echo "🐳 Infrastructure:"
check_file "docker-compose.yml" "Docker Compose configuration"
check_file "apps/backend/Dockerfile" "Backend Dockerfile"
check_file "apps/auth/Dockerfile" "Auth Dockerfile"
check_file "apps/frontend/Dockerfile" "Frontend Dockerfile"
check_file "infra/nginx/default.conf" "Nginx configuration"
echo ""

echo "⚙️ Configuration:"
check_file ".env.example" "Environment template"
check_file "apps/backend/internal/config/config.go" "Backend config"
check_file "apps/auth/src/lib/env.ts" "Auth config"
echo ""

echo "🗄️ Database:"
check_file "apps/backend/db/migrations/00001_core_init.sql" "Database migrations"
check_dir "apps/backend/db/queries" "Database queries"
echo ""

echo "🔐 Security:"
check_file "apps/backend/internal/auth/jwt.go" "JWT verification"
check_file "apps/backend/internal/middleware/context.go" "Auth middleware"
echo ""

echo "📊 Results:"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All production-ready components are in place!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review PRODUCTION_READINESS.md for deployment checklist"
    echo "2. Choose deployment platform from DEPLOYMENT_GUIDE.md"
    echo "3. Configure environment variables"
    echo "4. Run: npm run check"
    echo "5. Deploy to staging first"
    echo "6. Deploy to production"
    exit 0
else
    echo -e "${RED}❌ Some components are missing. Please review the output above.${NC}"
    exit 1
fi
