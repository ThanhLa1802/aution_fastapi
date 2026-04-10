# Ecommerce Platform

A full-stack ecommerce system built with a polyglot microservice architecture: Django handles authentication and transactional order writes, FastAPI handles all read/query workloads, React serves the SPA, and Nginx sits in front as the reverse proxy and first-line rate limiter.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Key Features](#key-features)
  - [Authentication](#authentication)
  - [Product Search (Elasticsearch)](#product-search-elasticsearch)
  - [Flash Sale Concurrency (Redis Stock Gate)](#flash-sale-concurrency-redis-stock-gate)
  - [Rate Limiting](#rate-limiting)
- [Performance Testing (K6)](#performance-testing-k6)
- [Django Management Commands](#django-management-commands)
- [Data Models](#data-models)

---

## Architecture Overview

```
Browser
  │
  ▼
┌─────────────────────────────────────────────────┐
│  Nginx  :3000                                   │
│  • Serves React SPA (static files)              │
│  • Rate limit zones (auth/checkout/api)         │
│  • Reverse proxy to Django and FastAPI          │
└────────────┬──────────────────┬─────────────────┘
             │                  │
     /api/auth/*          /api/v1/*
             │                  │
             ▼                  ▼
    ┌──────────────┐   ┌──────────────────┐
    │  Django :8000│   │  FastAPI  :8001  │
    │              │   │                  │
    │  • Auth      │   │  • Products      │
    │  • JWT issue │   │  • Cart          │
    │  • Atomic    │   │  • Wishlist      │
    │    order     │   │  • Reviews       │
    │    writes    │   │  • Orders (read) │
    │  • django-   │   │  • Checkout      │
    │    axes      │   │    (calls Django)│
    └──────┬───────┘   └────────┬─────────┘
           │                    │
           └──────────┬─────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌─────────┐ ┌───────────────┐
    │PostgreSQL│ │  Redis  │ │Elasticsearch  │
    │    :5432 │ │  :6379  │ │   :9200       │
    │          │ │         │ │               │
    │ Primary  │ │• Cache  │ │• Full-text    │
    │ database │ │• Stock  │ │  product      │
    │          │ │  gate   │ │  search       │
    │          │ │• Rate   │ │• Autocomplete │
    │          │ │  limit  │ │               │
    └──────────┘ └─────────┘ └───────────────┘
```

### Why Two Backend Services?

| Concern | Django | FastAPI |
|---------|--------|---------|
| Authentication | ✅ JWT issue via SimpleJWT | reads token only |
| Transactional order writes | ✅ `transaction.atomic` + optimistic locking | delegates to Django |
| Brute-force protection | ✅ django-axes | — |
| Async read queries | — | ✅ SQLAlchemy async + asyncpg |
| Elasticsearch integration | management commands only | ✅ full async client |
| Redis stock gate | — | ✅ Lua atomic scripts |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Material UI, Vite, Zustand, React Router |
| Auth service | Django 4.2, Django REST Framework, SimpleJWT, django-axes |
| API service | FastAPI, SQLAlchemy (async), asyncpg, Pydantic v2 |
| Database | PostgreSQL 15 |
| Cache / Stock gate | Redis (redis-py async) |
| Search | Elasticsearch 8.11.0 (`elasticsearch[asyncio]`, `aiohttp`) |
| Reverse proxy | Nginx |
| Containerisation | Docker, Docker Compose |
| Performance testing | K6 |

---

## Project Structure

```
auction_project/
├── core_service/          # Django — auth + transactional writes
│   ├── core/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── users/             # Custom User model, register/login/me views
│   ├── orders/            # Product, Order, Cart models; optimistic locking service
│   │   ├── models.py
│   │   ├── services.py    # create_order_safe() with retry loop
│   │   └── management/commands/
│   │       ├── seed_tech_data.py
│   │       └── index_products.py   # manual ES sync
│   └── requirements.txt
│
├── fast_api_services/     # FastAPI — queries, search, cart, checkout gateway
│   ├── main.py            # app factory, startup (ES sync + Redis warm), middleware
│   ├── database.py        # async SQLAlchemy engine + ES client
│   ├── models.py          # SQLModel table definitions
│   ├── dependencies.py    # get_db, get_redis, get_current_user
│   ├── django_setup.py    # bootstraps Django ORM for sync_to_async calls
│   ├── middleware/
│   │   └── rate_limit.py  # per-user JWT-aware rate limiting
│   ├── routers/           # products, cart, wishlist, reviews, orders
│   ├── repos/             # data access layer (ES-first with PG fallback)
│   ├── schemas/           # Pydantic request/response models
│   └── services/
│       ├── indexing_service.py   # Elasticsearch CRUD
│       ├── stock_cache.py        # Redis Lua stock gate
│       ├── product_service.py
│       ├── cart_service.py
│       ├── order_service.py
│       └── review_service.py
│
├── frontend/              # React SPA
│   ├── src/
│   │   ├── api/           # axios client + per-domain API modules
│   │   ├── components/    # Navbar, ProductCard, ProtectedRoute
│   │   ├── pages/         # Home, ProductDetail, Cart, Checkout, Orders…
│   │   └── store/         # Zustand stores (auth, cart)
│   └── nginx.conf         # SPA serving + proxying + rate limit rules
│
├── deployment/
│   └── docker-compose.yaml
│
└── k6/                    # Performance tests
    ├── helpers.js
    ├── smoke.js
    ├── load.js
    ├── flash_sale.js
    └── soak.js
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24
- Docker Compose v2

### 1. Clone and configure

```bash
git clone <repo-url>
cd auction_project
cp .env.example .env   # edit SECRET_KEY and DB credentials
```

### 2. Start all services

```bash
cd deployment
docker-compose up -d --build
```

Services come up in dependency order:
1. `db` (PostgreSQL) → health checked before others start
2. `redis`, `elasticsearch` → started in parallel with db
3. `django` → runs migrations then starts
4. `fastapi` → waits for db, redis, elasticsearch
5. `frontend` (Nginx) → waits for django and fastapi

### 3. Seed sample data

```bash
docker-compose exec django python manage.py seed_tech_data
```

### 4. Access the app

| URL | Service |
|-----|---------|
| http://localhost:3000 | React SPA |
| http://localhost:3000/api/auth/ | Django auth endpoints |
| http://localhost:3000/api/v1/ | FastAPI endpoints |
| http://localhost:8001/docs | FastAPI Swagger UI (direct) |
| http://localhost:8001/redoc | FastAPI ReDoc (direct) |
| http://localhost:9200 | Elasticsearch (direct) |

### 5. Create a superuser (optional)

```bash
docker-compose exec django python manage.py createsuperuser
# Django admin: http://localhost:8000/admin/
```

---

## Environment Variables

Create a `.env` file in the project root (next to `deployment/`):

```env
# Database
DB_NAME=ecommerce
DB_USER=postgres
DB_PASSWORD=yourpassword

# Security — MUST change in production
SECRET_KEY=your-secret-key-at-least-50-chars

# Optional
ACCESS_TOKEN_EXPIRE_MINUTES=60
DEBUG=False
ALLOWED_HOSTS=localhost,yourdomain.com
```

> **Note:** `SECRET_KEY` is shared between Django (signs JWTs) and FastAPI (`jwt.decode`). They must match.

---

## API Reference

### Auth (Django — `/api/auth/`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/register/` | Create account | No |
| `POST` | `/api/auth/login/` | Get JWT tokens | No |
| `POST` | `/api/auth/token/refresh/` | Refresh access token | No |
| `GET` | `/api/auth/me/` | Current user profile | Bearer |

**Login response:**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```

### Products (FastAPI — `/api/v1/`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/products` | List / search products | Bearer |
| `GET` | `/api/v1/products/autocomplete?q=` | Autocomplete suggestions | Bearer |
| `GET` | `/api/v1/products/categories` | All categories | Bearer |
| `GET` | `/api/v1/products/{id}` | Product detail | Bearer |
| `POST` | `/api/v1/admin/products` | Create product | Admin |
| `PATCH` | `/api/v1/admin/products/{id}` | Update product | Admin |
| `DELETE` | `/api/v1/admin/products/{id}` | Delete product | Admin |
| `POST` | `/api/v1/admin/products/reindex` | Re-sync all products to ES | Admin |

**Product list query params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Full-text search (Elasticsearch) |
| `category_id` | int | Filter by category |
| `min_price` | float | Price range lower bound |
| `max_price` | float | Price range upper bound |
| `page` | int | Page number (default 1) |
| `limit` | int | Page size (default 20) |

### Cart (FastAPI — `/api/v1/cart`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/cart` | Get cart |
| `POST` | `/api/v1/cart/add` | Add item |
| `PATCH` | `/api/v1/cart/item/{id}` | Update quantity |
| `DELETE` | `/api/v1/cart/item/{id}` | Remove item |
| `DELETE` | `/api/v1/cart` | Clear cart |

### Orders (FastAPI — `/api/v1/orders`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/orders/checkout` | Checkout (converts cart to order) |
| `GET` | `/api/v1/orders` | My orders |
| `GET` | `/api/v1/orders/{id}` | Order detail |
| `PATCH` | `/api/v1/orders/{id}/cancel` | Cancel order |

**Checkout flow:**
```
POST /api/v1/orders/checkout
  → Redis Lua stock gate (atomic decrby all items)
      → 0  (out of stock)  → 429 Too Many Requests
      → -1 (cache miss)    → fall through to DB
      → 1  (reserved)      → Django sync_to_async create_order_safe()
                                → optimistic lock retry loop
                                → 201 Created  |  release Redis on failure
```

### Reviews (FastAPI)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/products/{id}/reviews` | Get reviews |
| `POST` | `/api/v1/products/{id}/reviews` | Add review |
| `DELETE` | `/api/v1/reviews/{id}` | Delete own review |

### Wishlist (FastAPI — `/api/v1/wishlist`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/wishlist` | Get wishlist |
| `POST` | `/api/v1/wishlist/{product_id}` | Add to wishlist |
| `DELETE` | `/api/v1/wishlist/{product_id}` | Remove from wishlist |

---

## Key Features

### Authentication

- JWT-based: `access` token (short-lived, configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`) + `refresh` token (7 days)
- Django SimpleJWT issues tokens signed with `SECRET_KEY` using **HS256**
- FastAPI decodes the same token without a network call
- Token subject (`sub`) is the numeric user ID — consistent between both services
- **django-axes** locks accounts after 5 consecutive failed login attempts (1-hour cooldown); tracks both IP and username

### Product Search (Elasticsearch)

Products are indexed in Elasticsearch on create/update/delete. On startup, FastAPI auto-syncs the database if the index is empty.

**Search** (`GET /api/v1/products?search=iphone`) uses multi-match across `name` and `description` with a **PostgreSQL ILIKE fallback** if Elasticsearch is unreachable.

**Autocomplete** (`GET /api/v1/products/autocomplete?q=iph`) uses `match_phrase_prefix` on `name` — typically < 50 ms.

Manual reindex:
```bash
# Via Django management command
docker-compose exec django python manage.py index_products --rebuild

# Via admin API endpoint
curl -X POST http://localhost:8001/api/v1/admin/products/reindex?rebuild=true \
  -H "Authorization: Bearer <admin-token>"
```

### Flash Sale Concurrency (Redis Stock Gate)

A **Lua script** runs atomically on Redis before any checkout hits the database. For a flash sale with 100 units at 100k RPS:

```
~100     requests  →  Redis says "reserved" → PostgreSQL write
~99,900  requests  →  Redis says "out of stock" → 429 in microseconds
```

The Lua script checks and decrements all cart items in **one round-trip**. Partial reservations are auto-rolled back if any item is out of stock.

Django uses **optimistic locking** (`version` field) as the second safety layer:

```sql
UPDATE orders_product
SET stock = stock - qty, version = version + 1
WHERE id = ? AND version = <snapshot> AND stock >= qty
```

Zero rows updated = concurrent conflict → retry (up to 3 times).

**Redis stock cache warm-up** happens automatically on FastAPI startup, and via:
```bash
curl -X POST http://localhost:8001/api/v1/admin/stock/warm \
  -H "Authorization: Bearer <admin-token>"
```

### Rate Limiting

Three layers, from outermost to innermost:

#### Layer 1 — Nginx (IP-based)

| Zone | Limit | Burst | Applies to |
|------|-------|-------|------------|
| `auth` | 5 req/min | 3 | `/api/auth/` |
| `checkout` | 10 req/min | 2 | `/api/v1/orders/checkout` |
| `api` | 120 req/min | 20 | `/api/v1/` |

Returns `429 Too Many Requests`.

#### Layer 2 — FastAPI Middleware (per authenticated user)

| Path | Limit | Window |
|------|-------|--------|
| `/orders/checkout` | 5 requests | 60 s |
| `/api/v1/` | 120 requests | 60 s |

Extracts user ID from JWT Bearer token; falls back to `X-Forwarded-For` IP. Redis errors never block traffic.

#### Layer 3 — django-axes (brute-force login)

- Lock after 5 failed login attempts
- 1-hour cooldown
- Tracks IP address + username simultaneously
- Resets failure count on successful login

---

## Performance Testing (K6)

### Install K6

```powershell
# Windows
winget install k6

# macOS
brew install k6
```

### Test Scripts

| Script | Scenario | VUs | Duration |
|--------|----------|-----|---------|
| `k6/smoke.js` | Sanity check all endpoints | 1 | 30 s |
| `k6/load.js` | Realistic mixed traffic | up to 50 | 7 min |
| `k6/flash_sale.js` | 200 req/s on sold-out product | 200–300 | 50 s |
| `k6/soak.js` | Memory / leak detection | 20 | 30 min |

### Run Order

```bash
# 1. Always start with smoke
k6 run k6/smoke.js

# 2. Normal load test
k6 run k6/load.js

# 3. Flash sale — requires a product with known limited stock
#    Seed a product with stock=10, note its ID, then:
k6 run -e PRODUCT_ID=1 -e STOCK=10 k6/flash_sale.js

# 4. Soak test (run overnight)
k6 run -e DURATION=2h -e VUS=30 k6/soak.js
```

### Flash Sale Summary Output

```
========== Flash Sale Summary ==========
Orders placed  : 10  (expected ≤ 10)
Oversell?      : ✅ NO
p95 checkout   : 142 ms
Error rate     : 0.00 %
=========================================
```

If `Orders placed > STOCK`, the stock gate has a bug.

### Performance Thresholds

| Test | Metric | Target |
|------|--------|--------|
| All | Error rate | < 1% |
| Browse | p95 latency | < 1 s |
| Search | p95 latency | < 1 s |
| Checkout | p95 latency | < 3 s |
| Flash sale | p95 checkout | < 3 s |
| Soak | p95 (sustained) | < 2 s |

---

## Django Management Commands

```bash
# Seed tech products, categories, users for development
docker-compose exec django python manage.py seed_tech_data

# Index / re-sync products to Elasticsearch
docker-compose exec django python manage.py index_products          # incremental
docker-compose exec django python manage.py index_products --rebuild # delete + recreate
docker-compose exec django python manage.py index_products --recent 24  # last 24 hours

# Standard Django
docker-compose exec django python manage.py migrate
docker-compose exec django python manage.py createsuperuser
docker-compose exec django python manage.py shell
```

---

## Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| id | int | PK |
| username | varchar | unique |
| email | varchar | unique |
| phone | varchar | optional |
| avatar | image | optional |
| is_verified | bool | |

### Product
| Field | Type | Notes |
|-------|------|-------|
| id | int | PK |
| name | varchar | ES indexed |
| description | text | ES indexed |
| price | decimal(10,2) | |
| stock | int | decremented atomically |
| version | int | optimistic locking counter |
| status | smallint | 1=active, 0=inactive |
| category | FK | → Category |
| image | image | |

### Order
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | public-facing |
| user | FK | → User |
| status | smallint | pending/confirmed/shipped/delivered/cancelled |
| total_price | decimal | |
| created_at | datetime | |

### OrderItem
| Field | Type |
|-------|------|
| order | FK → Order |
| product | FK → Product |
| quantity | int |
| price | decimal (snapshot at purchase) |

### Cart / CartItem
Per-user persistent cart. CartItems reference live product prices; snapshot occurs at checkout.
