# File: plan.md
## Execution Roadmap

- [x] **Phase 1: Project Scaffolding & Infrastructure**
  - [x] Initialize Turborepo & standard monorepo structure.
  - [x] Setup `docker-compose.yml` for Postgres, Redis, and ClickHouse.
  - [x] Create `CONSTITUTION.md` and Level 1-5 Truth documents.

- [x] **Phase 2: Data Store & Control Plane (NestJS)**
  - [x] Implement Prisma schema & base models.
  - [x] Build `EndpointsModule` and `KeysModule` logic (CRUD + SHA-256 Hashing).
  - [x] Return plaintext secret keys only once on creation (One-time Reveal).

- [x] **Phase 3: Data Plane (Go Fiber)**
  - [x] Implement high-performance proxy engine with `sony/gobreaker` circuit breaking.
  - [x] Build `validator.go` for ultra-fast Redis prefix lookup & SHA-256 validation.
  - [x] Implement non-blocking Redis Stream logger (`goroutine` fire-and-forget).

- [x] **Phase 4: Frontend (Next.js) — UI Composition**
  - [x] Initialize "Soft Analytics" Design System (Tailwind v4 `@theme` tokens).
  - [x] Build Root Layout (Flexbox `h-screen`) + 280px Sidebar (lucide-react icons).
  - [x] Build Dashboard Overview with 3-col StatCard grid + Chart placeholder.
  - [x] Build Endpoints Management page (`/endpoints`) with filter bar & EndpointCard.
  - [x] Build Access Keys page (`/keys`) with KeyTable + GenerateModal (amber one-time reveal).
  - [x] Build Endpoint Detail page (`/endpoints/[id]`) with 60/40 split layout.
  - [x] Build `ConfigForm` (Target URL, HTTP Method pills, Rate Limit slider).

- [x] **Phase 5: Real-time Integration (WebSocket)**
  - [x] Build `RedisService` with isolated subscriber/publisher connection pools.
  - [x] Build `LogsGateway` (socket.io `/logs` namespace) with:
    - [x] Per-endpoint room subscriptions (`subscribe:endpoint` / `unsubscribe:endpoint`).
    - [x] Redis Stream XREAD poller (`traffic_logs_stream`).
    - [x] Server-side throttled batch flush (250ms interval).
    - [x] 30s Heartbeat with memory-safe subscription pruning.
  - [x] Build `useLogs` React hook (subscribe lifecycle, RTT latency, 200-log buffer).
  - [x] Upgrade `LiveLogTerminal` to consume real WebSocket stream.

- [/] **Phase 6: Hardening & Production Readiness**
  - [x] Patch `KeysService` → `syncKeyToRedis()` after Prisma write (with non-fatal error handling).
  - [x] Patch `KeysService` → `purgeKeyFromRedis()` on key revocation.
  - [x] Create `packages/db/prisma/seed.ts` with Users, Endpoints, Keys, and Redis HSET guidance.
  - [ ] Run `npx prisma db push` from `packages/db` (requires PostgreSQL running).
  - [ ] Run `npm run seed` from `packages/db` (requires PostgreSQL running).
  - [ ] Run `go mod tidy` from `apps/data-plane`.
  - [ ] E2E test: Create Key → Proxy Request → Verify Log in Terminal.