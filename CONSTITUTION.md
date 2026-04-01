# File: CONSTITUTION.md
# LEVEL 1 TRUTH: THE SUPREME SYSTEM LAW

## 1. Core Philosophy
- **Spec-Driven Development (SDD):** No functional code shall be written, modified, or deleted unless explicitly mapped and approved in `spec.md` or `plan.md`.
- **Zero Drift:** The current state of the repository must exactly mirror the documentation. If documentation lags, code execution halts.
- **Fail-Fast & Observable:** All systems must fail loudly internally (logs, metrics) but fail gracefully externally (500/504 with standardized JSON errors).

## 2. Immutable Tech Stack
Any deviation from this stack requires explicit user approval and a constitution amendment.
- **Monorepo:** Turborepo, pnpm/npm workspaces.
- **Data Plane (Proxy Engine):** Go + Fiber + `sony/gobreaker`. Must run on Port 8080.
- **Control Plane (API & Config):** TypeScript + NestJS. Must run on Port 3000.
- **Frontend (Dashboard):** Next.js App Router + Tailwind CSS v3 + shadcn/ui + Zustand.
- **Databases:** - PostgreSQL (Source of Truth for Config via Prisma).
  - Redis (Token Bucket Rate Limiting, High-Speed Key Prefix Cache).
  - ClickHouse (Immutable Telemetry & Traffic Logs).

## 3. Strict Architectural Boundaries (Split Plane)
- **Data Plane Autonomy:** The Go Fiber Data Plane MUST NOT query PostgreSQL directly. It relies exclusively on Redis for routing rules, rate limits, and key validation.
- **Async Logging Only:** The Data Plane MUST NOT block the proxy response to write logs. All logs must be fire-and-forget to a Redis Stream, batched into ClickHouse by a background consumer.
- **Performance Absolute:** The Data Plane has a strict latency budget. Total added overhead must not exceed 50ms at p95. If rate-limiting or auth takes >15ms, the circuit breaker must intervene.

## 4. Cyber Security & Hardening Standards
- **Zero Trust Inter-plane Communication:** All traffic between the Control Plane and Data Plane must be authenticated via short-lived internal JWTs and restricted to internal virtual networks.
- **Cryptographic Key Storage:** API Keys must never be stored in plaintext. They must be stored as SHA-256 hashes. Only the prefix (first 12-15 chars) is stored in plaintext for high-speed Redis lookup collision mitigation.
- **Idempotency & Retry Locks:** Retry policies at the gateway level must strictly ignore non-idempotent methods (POST, PATCH) unless a valid `Idempotency-Key` header is present.
- **No Secret Bleeding:** No environment variables, credentials, or API keys shall be hardcoded or committed. All configurations must flow through `.env` files dynamically injected at runtime.