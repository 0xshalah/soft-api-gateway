# File: spec.md
## System Architecture & Network Topology

### 1. Monorepo Structure (Turborepo)
- `apps/web`: Next.js App Router (Frontend Dashboard).
- `apps/control-plane`: NestJS (Port 3000, Configuration & Metrics API).
- `apps/data-plane`: Go Fiber (Port 8080, High-throughput Proxy Engine).
- `packages/db`: Shared Prisma schema (PostgreSQL) and ClickHouse client config.
- `packages/types`: Shared TypeScript interfaces and Zod validation schemas.

### 2. Network Boundaries & Security
- **Frontend ↔ Control Plane:** Secured via Clerk/Supabase Auth JWT. WebSockets established on `/ws` with 30s heartbeat.
- **Client ↔ Data Plane:** Secured via SHA-256 hashed API Keys injected in the `Authorization: Bearer` header.
- **Control Plane ↔ Data Plane (Internal):** Secured via short-lived internal JWTs and strictly bounded via Docker network/VPC peering. 

### 3. Asynchronous Log Workflow
1. Request hits `apps/data-plane`.
2. Auth & Rate Limit validated via Redis (< 8ms).
3. Request proxied to target URL.
4. On response, `data-plane` pushes a non-blocking log payload to a Redis Stream (`traffic_logs_stream`).
5. A background worker (or `control-plane` consumer) batches these streams every 1 second and bulk-inserts them into ClickHouse to prevent write-bottlenecks.