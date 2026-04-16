# Project Coding Standards

## Stack
- **Django 5** + DRF + SimpleJWT + django-axes — `core_service/` (port 8000), auth + transactional order writes
- **FastAPI** + SQLModel + asyncpg — `fast_api_services/` (port 8001), all reads (products, cart, reviews, wishlist, checkout)
- **PostgreSQL 15** — primary database (shared by both services)
- **Redis** — stock gate (Lua atomic reservation), rate limiting
- **Elasticsearch 8.11** — product full-text search & autocomplete
- **React 18** + Vite + Material UI + Zustand + Axios — `frontend/` (port 3000), Nginx reverse proxy
- **docker-compose** — `deployment/docker-compose.yaml` orchestrates all services
- **k6** — load & performance tests (`k6/`)

## Testing
- Write tests before code (TDD); for bugs: failing test first, then fix
- Test hierarchy: unit > integration > e2e (use lowest level that captures behavior)
- Run tests before every commit

### FastAPI (fast_api_services/tests/)
- Framework: `pytest` + `pytest-asyncio` + `httpx.AsyncClient`
- Mock Redis with `fakeredis[aioredis]`; mock DB with `AsyncMock` or test DB
- Run: `pytest fast_api_services/tests/`

### Django (core_service/)
- Framework: `pytest-django`
- Unit tests: no real DB — use `@pytest.mark.django_db` only for integration tests
- Place test files adjacent to source: `core_service/orders/tests/test_services.py`

### React (frontend/)
- Framework: Vitest + React Testing Library
- Run: `npm run test` inside `frontend/`

## Code Quality
- Review across five axes: correctness, readability, architecture, security, performance
- Python: `ruff check`, `mypy` for type checking
- TypeScript: `tsc --noEmit`, ESLint
- No secrets in code or version control — use `.env` files (never committed)

## Architecture Patterns

### Ecommerce request flow
```
Client → Nginx (frontend/:3000)
         ├─ /api/auth/*  → Django core_service/:8000  (auth, JWT issue)
         ├─ /api/orders/ → Django core_service/:8000  (transactional order write)
         └─ /api/*       → FastAPI fast_api_services/:8001
                           ├─ GET /products  → Elasticsearch full-text search
                           ├─ POST /cart/*   → PostgreSQL (async SQLModel)
                           ├─ POST /orders/checkout
                           │    ├─ reserve_stock() Lua → Redis stock gate
                           │    │    0=out-of-stock, -1=cache miss→DB fallback
                           │    └─ create_order_safe() → Django via sync_to_async
                           │         (optimistic locking, retry ×3 on version conflict)
                           └─ GET /reviews, /wishlist → PostgreSQL
```

### Auth
- Django issues JWT: `POST /api/auth/login/` → `accessToken` (short-lived) + `refreshToken`
- FastAPI validates JWT: shared `SECRET_KEY` env var, `HS256`, extracts `user_id` from `sub` claim
- `accessToken` kept **in memory only** (no XSS risk); `refreshToken` persisted to localStorage
- On app mount, existing `refreshToken` → call `refreshAccessToken()` → restore session
- Brute-force protection: django-axes + Nginx `auth` zone (5 req/min per IP)

### Redis keys (stock gate)
- `stock:{product_id}` — atomic stock counter (warmed on startup via `warm_all_products()`)
- Lua script: `reserve_stock(product_id, qty)` → 1 (reserved), 0 (out of stock), -1 (cache miss)
- `release_stock(product_id, qty)` — rollback on checkout failure

### Frontend state
- Zustand (`authStore`) persisted to localStorage: `refreshToken`; `accessToken` in memory only
- `cartStore` — cart ID and item count
- Axios (`api/client.js`) — auto-attach Bearer token, silent token refresh on 401
- Material UI components throughout; React Router v6 for routing

## Implementation
- Build in small, verifiable increments: implement → test → verify → commit
- Never mix formatting changes with behavior changes
- Stock reservation must use the Lua atomic pattern (never race-prone DB check-then-decrement)
- Django handles all writes that need transactions; FastAPI handles all reads and checkout flow

## Boundaries
- **Always:** Run tests before commits, validate user input at system boundaries
- **Ask first:** Database schema changes (`makemigrations`), new `pip`/`npm` dependencies
- **Never:** Commit secrets, remove failing tests, skip verification

## Skills
Load the relevant skill before starting work in these areas:

| Task | Skill |
|------|-------|
| Writing tests, fixing bugs, TDD | `.github/skills/test-driven-development/SKILL.md` |
| Security review, auth, input handling, secrets | `.github/skills/security-and-hardening/SKILL.md` |
| Code review, PR quality gate | `.github/skills/code-review-and-quality/SKILL.md` |
| Performance, load testing, profiling | `.github/skills/performance-optimization/SKILL.md` |
| Multi-file features, incremental changes | `.github/skills/incremental-implementation/SKILL.md` |
