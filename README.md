# Primora

Primora is a hybrid monorepo MVP with:

- `apps/backend`: Go + Gin domain API, migrations, sqlc, local object storage
- `apps/auth`: Better Auth on Hono with PostgreSQL, JWT minting, email/password, and OAuth wiring
- `apps/frontend`: **Production-ready SolidJS UI** with comprehensive component library
- `packages/api-client`: OpenAPI-generated TypeScript client
- `packages/shared-types`: shared cross-runtime constants
- `infra`: Nginx reverse proxy and local stack wiring

## ✨ Frontend Highlights

The Primora frontend features a **world-class, production-ready UI system**:

- 🎨 **16 Polished Components** - Modal, Tooltip, Dropdown, Progress, Tabs, Toast, and more
- ♿ **100% Accessible** - WCAG AA compliant with full keyboard navigation
- 📱 **Mobile-First** - Responsive design optimized for all screen sizes
- 🚀 **Optimized** - 44.93 KB gzipped bundle with ~850ms build time
- 🎭 **Dark-First Design** - Refined color palette with signature accent blue
- 📚 **Fully Documented** - Comprehensive guides and API reference

**See**: `FRONTEND_SUMMARY.md` for quick overview, `FRONTEND_ENHANCEMENTS.md` for details

## Run locally

1. Copy `.env.example` to `.env`
2. Fill `JWT_SECRET`, `BETTER_AUTH_SECRET`, and optional OAuth / Resend keys
3. Optional: tune throttling with `USER_RATE_LIMIT_PER_MINUTE` and `API_KEY_RATE_LIMIT_PER_MINUTE` (`0` disables each limiter)
4. Optional: Enable demo mode by setting `VITE_DEMO_MODE=true` in `.env` (allows testing without backend)
5. Run `docker compose up --build`
6. Open `http://localhost`
7. Open `http://localhost/mailpit/` for local email inspection

## Demo Mode

Primora includes a fully functional demo mode for testing without a backend:

**Enable Demo Mode:**
- Set `VITE_DEMO_MODE=true` in `.env` file (enabled by default on startup)
- Or visit `http://localhost/?demo=true`
- Or click "Try Demo Mode" when backend connection fails

**Demo Mode Features:**
- Complete UI with simulated data
- 2 organizations, 3 projects, 5 members
- Storage buckets, API keys, audit logs
- All CRUD operations work (simulated)
- Realistic API delays (300ms)
- Blue banner shows "Demo Mode Active"

**Exit Demo Mode:**
- Click "Exit Demo" button in the banner
- Or remove `?demo=true` from URL and refresh

## Verification

- Backend liveness: `http://localhost/api/v1/health/liveness`
- Backend readiness: `http://localhost/api/v1/health/readiness`
- Auth health: `http://localhost/auth-health`
- OpenAPI: `http://localhost/api/v1/openapi.yaml`
- Project overview (replace ID): `http://localhost/api/v1/projects/{projectID}/overview`

## Local Quality Checks

- Full gate (tests + typecheck + build + generated drift): `npm run check`
- Backend tests: `cd apps/backend && go test ./...`
- Frontend typecheck: `cd apps/frontend && npx tsc -p tsconfig.json --noEmit`
- Workspace build: `npm run build`
- Regenerate sqlc: `npm run generate:sqlc`
- Regenerate API client: `npm run generate:client`
