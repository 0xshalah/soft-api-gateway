# Soft Analytics API Gateway

## Product Overview

**The Pitch:** A modern, visually intuitive API Gateway MVP that transforms complex routing and traffic data into approachable, digestible insights. It replaces intimidating technical dashboards with a soft, engaging interface that prioritizes visual workflows and at-a-glance health metrics.

**For:** Backend developers and API product managers who need to monitor traffic, manage endpoints, and issue access keys without wrestling with clunky, hyper-technical AWS-style consoles.

**Device:** desktop

**Design Direction:** Soft, modern analytics interface featuring exaggerated border radii, pill-shaped elements, subtle diffuse shadows, and stark, bright accent colors for instant status recognition.

**Inspired by:** Vercel Dashboard, Stripe Sigma.

### Product Goals & Success Metrics (OKRs)
- **Objective 1:** Deliver an API Gateway interface that drastically reduces debugging time and cognitive load.
  - **Key Result 1:** Achieve a 50% reduction in "time-to-first-log" (the time it takes a user to locate a specific failed request payload) compared to legacy tools.
  - **Key Result 2:** Attract 1,000 active gateways deployed within the first 3 months of launch.
- **Objective 2:** Ensure enterprise-grade reliability beneath the soft UI.
  - **Key Result 1:** Maintain a system uptime SLA of 99.99%.
  - **Key Result 2:** Gateway adds no more than 50ms of latency overhead at the 95th percentile.

### User Personas
- **Alex (The Backend Developer):** Pragmatic and time-constrained. Alex wants to deploy API routes, configure retry logic, and debug 500 errors quickly without writing custom log parsers. Focuses heavily on the Live Request Logs and Endpoint configuration.
- **Sam (The API Product Manager):** Focused on usage trends, client onboarding, and health. Sam needs to understand top-level metrics, generate secure API keys for new partners, and ensure SLAs are met. Uses the Dashboard and Access Keys screens primarily.

### Out of Scope for MVP
- API monetization and billing integration (e.g., Stripe metering).
- Complex multi-region gateway routing (sticking to single-region MVP).
- Advanced transformation policies (e.g., XML to JSON mapping).
- Mobile application support (desktop only for MVP).

### MoSCoW Prioritization
- **Must Have:** Core REST proxying, live traffic analytics, basic rate limiting, API key generation/revocation, dashboard health metrics.
- **Should Have:** Support for GraphQL proxying, retry policy configuration, scoping for API keys.
- **Could Have:** Automated key rotation, historical data exports (CSV), team member roles.
- **Won't Have (MVP):** Billing engine, custom domain SSL provisioning, mobile app.

---

## Technical & System Requirements

### Technical Architecture
- **Gateway Engine:** Split backend architecture. High-performance proxy built in Go Fiber (Data Plane) to ensure ultra-low latency, alongside a NestJS backend for the Control Plane.
- **Data Store:** Primary relational database (PostgreSQL) for configuration data, Redis Cluster utilizing a Token Bucket algorithm with Redlock for real-time rate limiting (with a fallback to a local in-memory limiter), and ClickHouse for high-volume traffic log storage and analytical queries.
- **Real-Time Engine:** WebSockets integrated into the UI layer to push live event feeds and sparkline updates instantly, utilizing an exponential backoff reconnection strategy (1s, 2s, 4s, 8s max) with a 30s heartbeat and a buffer for the last 100 messages.
- **Protocol Support:** Full support for REST endpoints and basic GraphQL proxying (pass-through).
- **Gateway Observability:** Prometheus metrics and OpenTelemetry tracing integrated into the architecture for internal health monitoring and distributed request tracing. Includes standard health check endpoints (`/health` for Liveness probe, `/ready` for Readiness probe, and `/metrics` for Prometheus endpoint) to meet the 99.99% uptime SLA.
- **Deployment Architecture:** Strict deployment separation between the Control Plane (deployed in standard cloud regions) and the Data Plane (deployed at the edge or on dedicated high-performance clusters).
- **Error Handling:** Enforces 5s timeouts (returning 504 Gateway Timeout), utilizes the `sony/gobreaker` circuit breaker for failing upstreams (thresholds: 5 failures within 30s opens the circuit, 30s timeout before half-open, 3 successes closes it), and implements a Redis Stream Dead Letter Queue (DLQ) to capture failed analytical logs. Retry policies only execute for 5xx errors and timeouts, strictly excluding POST requests (non-idempotent) unless an `idempotency-key` header is present.

### Data Models
- **Endpoint:** `id` (UUID), `name` (String), `path` (String), `target_url` (String), `method` (Enum: GET, POST, etc.), `created_at` (Timestamp).
- **Route Rule:** `id` (UUID), `endpoint_id` (UUID FK), `rate_limit_rpm` (Integer), `retry_count` (Integer), `backoff_multiplier` (Float).
- **Key:** `id` (UUID), `name` (String), `prefix` (String, first 12 chars of environment + key ID prefix, stored as a separate indexed column for fast lookup), `hash` (String, SHA-256), `scopes` (Array[String]), `status` (Enum: Active, Revoked), `last_used` (Timestamp), `created_by` (UUID FK → users.id).
- **Traffic Log:** `id` (UUID), `timestamp` (Timestamp), `endpoint_id` (UUID FK), `status_code` (Integer), `latency_ms` (Integer), `payload_preview` (JSON).

### Database Indexes & Constraints

**PostgreSQL Indexes:**
```sql
CREATE INDEX idx_endpoints_path_method ON endpoints(path, method);
CREATE INDEX idx_keys_prefix ON keys(prefix);
CREATE INDEX idx_keys_status ON keys(status);
CREATE INDEX idx_traffic_log_timestamp ON traffic_log(timestamp DESC);
CREATE INDEX idx_traffic_log_endpoint_id ON traffic_log(endpoint_id, timestamp DESC);
CREATE INDEX idx_route_rules_endpoint_id ON route_rules(endpoint_id);
```

**Foreign Key Cascade Rules:**
```sql
ALTER TABLE route_rules 
  ADD CONSTRAINT fk_route_rules_endpoint 
  FOREIGN KEY (endpoint_id) 
  REFERENCES endpoints(id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

ALTER TABLE traffic_log 
  ADD CONSTRAINT fk_traffic_log_endpoint 
  FOREIGN KEY (endpoint_id) 
  REFERENCES endpoints(id) 
  ON DELETE SET NULL;

ALTER TABLE keys 
  ADD CONSTRAINT fk_keys_creator 
  FOREIGN KEY (created_by) 
  REFERENCES users(id) 
  ON DELETE SET NULL;
```

**ClickHouse TTL Policies:**
```sql
-- Raw logs: 7 days retention
ALTER TABLE traffic_log MODIFY TTL timestamp + INTERVAL 7 DAY;

-- Aggregated metrics: 90 days retention
ALTER TABLE traffic_metrics_hourly MODIFY TTL timestamp + INTERVAL 90 DAY;
```

**Unique Constraints:**
```sql
ALTER TABLE endpoints ADD UNIQUE INDEX idx_unique_path_method (path, method);
ALTER TABLE keys ADD UNIQUE INDEX idx_unique_key_hash (hash);
```

### Non-Functional Requirements
- **Latency Overhead:** Maximum of 50ms added latency (p95) for request pass-through.
- **Scalability:** System must seamlessly handle up to 10,000 Requests Per Second (RPS) per gateway instance.
- **SLA:** 99.99% uptime for the data plane (the gateway routing requests), 99.9% for the control plane (the UI dashboard).

### Latency Budget Breakdown

To guarantee <50ms total overhead at p95, each component must adhere to:

| Component | Budget | Implementation |
|-----------|--------|----------------|
| API Key Verification | <5ms | Redis prefix lookup + hash comparison |
| Rate Limit Check | <3ms | Token bucket in Redis (single GET + SET) |
| Scope Validation | <2ms | In-memory scope array lookup |
| Routing Decision | <1ms | Pre-computed route table (RwLock) |
| Request Logging (async) | <2ms | Redis Stream push (non-blocking) |
| Network (internal) | <5ms | Same-region VPC peering |
| **Subtotal** | **<18ms** | |
| **Buffer** | **<32ms** | Reserved for upstream latency variance |
| **Total** | **<50ms** | p95 guarantee |

**Circuit Breaker Triggers:**
- If key verification >10ms → Log warning, fallback to local cache
- If rate limit check >5ms → Switch to in-memory limiter (degraded mode)
- If total overhead >40ms consistently → Alert on-call engineer

### Security & Compliance
- **Control Plane Authentication:** Powered by Clerk or Supabase Auth, supporting secure login and basic workspace/team isolation.
- **Inter-Plane Security:** Communication between the Control Plane and Data Plane is secured using short-lived JWTs and strict CORS policies.
- **API Key Verification:** Keys are verified via a prefix lookup in the Redis cache, falling back to the DB to compare the one-way SHA-256 hash. Validated requests are logged asynchronously to ClickHouse.
- **Key Storage:** API keys are generated cryptographically, displayed once, and stored exclusively as one-way SHA-256 hashes.
- **Access Control:** Role-Based Access Control (RBAC) enforced at the API key level via configurable "Scopes" (e.g., `read:users`, `write:orders`). The gateway enforces scope at the routing layer (pre-routing) to fail-fast on unauthorized requests.
- **Key Rotation:** Support for manual key revocation and creation of temporary rolling keys to ensure zero-downtime credential updates.
- **Compliance & Retention:** Logging strictly structured to meet SOC2 standards. To ensure cost awareness, ClickHouse enforces a data retention policy using native TTLs and Materialized Views (7 days for raw request logs and 90 days for aggregated metrics).

### API Contract Boundaries

**Control Plane API (NestJS) — Port 3000**
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/endpoints` | Create endpoint | JWT (Clerk) |
| GET | `/api/endpoints` | List all endpoints | JWT |
| GET | `/api/endpoints/:id` | Get endpoint detail | JWT |
| PUT | `/api/endpoints/:id` | Update endpoint | JWT |
| DELETE | `/api/endpoints/:id` | Delete endpoint | JWT |
| POST | `/api/keys` | Generate API key | JWT |
| GET | `/api/keys` | List all keys | JWT |
| DELETE | `/api/keys/:id` | Revoke key | JWT |
| GET | `/api/metrics/global` | Global traffic metrics | JWT |
| GET | `/api/metrics/endpoints/:id` | Endpoint-specific metrics | JWT |

**Data Plane API (Go Fiber) — Port 8080**
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| ALL | `/proxy/*` | Proxy all user requests | API Key (SHA-256) |
| GET | `/health` | Liveness probe | None |
| GET | `/ready` | Readiness probe | None |
| GET | `/metrics` | Prometheus metrics | Internal JWT |

**WebSocket Protocol (Control Plane → Frontend)**
```json
// Subscription: Client → Server
{
  "type": "subscribe",
  "channel": "logs:endpoint_{endpointId}"
}

// Push: Server → Client
{
  "type": "log:entry",
  "data": {
    "id": "uuid",
    "timestamp": "2024-01-01T00:00:00Z",
    "endpoint_id": "uuid",
    "status_code": 200,
    "latency_ms": 42,
    "method": "GET",
    "path": "/api/users",
    "payload_preview": {"key": "value"}
  }
}

// Heartbeat: Server → Client (every 30s)
{
  "type": "heartbeat",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Inter-Plane Communication (Control Plane ↔ Data Plane)**
```json
// Control Plane → Data Plane: Config Sync
POST https://data-plane.internal/api/config/sync
Headers: 
  Authorization: Bearer {short-lived-JWT}
  X-Plane-Type: control
Body:
{
  "endpoints": [...],
  "route_rules": [...],
  "api_keys": [...]
}

// Data Plane → Control Plane: Analytics Batch
POST https://control-plane.internal/api/analytics/batch
Headers:
  Authorization: Bearer {short-lived-JWT}
  X-Plane-Type: data
Body:
{
  "logs": [...],
  "metrics": {...}
}
```

### Assumptions, Dependencies & Risks
- **Assumptions:** Users will primarily deploy standard REST/JSON APIs. 
- **Dependencies:** Relies heavily on Redis clustering for distributed rate limiting; UI relies on WebSockets for the "live" feel.
- **Risks & Mitigations:** 
  - *Risk:* Gateway latency becomes a bottleneck for users.
  - *Mitigation:* Push analytics processing to background worker queues asynchronously to never block the main proxy request thread.

---

## Screens

- **Dashboard:** High-level traffic analytics, latency metrics, and global API health status.
- **Endpoint Management:** Visual grid of all configured API routes with live traffic sparklines.
- **Endpoint Detail:** Deep dive into a specific route's request logs, error rates, and routing rules.
- **Access Keys:** Credential management interface for generating, revoking, and tracking client API keys.

---

## Key Flows

**Monitoring API Health:** Identify and investigate failing endpoints.

1. User is on **Dashboard** -> sees bright red error spike on the main traffic chart.
2. User clicks **"Top Failing Endpoints" widget** -> navigates to **Endpoint Detail** for the specific failing route.
3. User views live request logs to identify the `500 Internal Server Error` payload.

**Provisioning a New Client:** Generating a secure access token.

1. User is on **Access Keys** -> sees a list of active clients.
2. User clicks **"Generate New Key" button** -> opens a soft modal.
3. Modal displays the newly generated token `sk_live_...` with a prominent "Copy to Clipboard" action.

**End-to-End Integration Testing Strategy:** Verifying gateway request tracking.

1. User generates a new API key via the **Access Keys** flow.
2. User authenticates an external API request (e.g., cURL, Postman) against the gateway proxy using the new key.
3. User navigates to **Endpoint Detail** and successfully observes the specific test request payload surface in the live WebSocket log stream.

---

<details>
<summary>Design System</summary>

## Color Palette

- **Primary:** `#8B5CF6` - Buttons, active states, primary chart lines
- **Background:** `#F8FAFC` - Main application canvas
- **Surface:** `#FFFFFF` - Cards, modals, dropdowns
- **Text:** `#0F172A` - Primary headings and body text
- **Muted:** `#64748B` - Secondary text, table headers, soft borders
- **Success Accent:** `#10B981` - 200 OK statuses, active indicators
- **Warning Accent:** `#F59E0B` - Rate limit warnings, 4xx errors
- **Error Accent:** `#F43F5E` - 5xx errors, critical alerts

## Typography

- **Headings:** `Outfit`, 600, 24-32px
- **Body:** `Plus Jakarta Sans`, 400, 15px
- **Small text:** `Plus Jakarta Sans`, 500, 13px
- **Buttons:** `Outfit`, 500, 14px

**Style notes:** Extensive use of `border-radius: 16px` for cards, `border-radius: 9999px` for buttons and tags. Shadows are large, diffuse, and slightly tinted with the primary color to feel "soft" rather than harsh (e.g., `box-shadow: 0 20px 40px -15px rgba(139, 92, 246, 0.1)`). 

## Design Tokens

```css
:root {
  --color-primary: #8B5CF6;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #0F172A;
  --color-muted: #64748B;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #F43F5E;
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --radius-card: 20px;
  --radius-pill: 99px;
  --shadow-soft: 0 10px 30px -10px rgba(15, 23, 42, 0.05);
  --shadow-glow: 0 10px 25px -5px rgba(139, 92, 246, 0.25);
}
```

</details>

---

<details>
<summary>Screen Specifications</summary>

### Dashboard

**Purpose:** Aggregate view of API performance, traffic volume, and system health.

**Functional Requirements:**
- Global traffic chart must aggregate metrics across all routes dynamically (last 24h default, configurable to 7d, 30d).
- System aggregates global latency (average and p95).
- Table displaying "Top Endpoints" (columns: Path, Volume, Avg Latency).
- Table displaying "Recent Errors" (columns: Time, Path, Status Code).

**Layout:** 280px left sidebar, fixed. Main content area: Top stats row (3 cards), central large traffic chart, bottom row split into 2 tables (Top Endpoints, Recent Errors).

**Key Elements:**
- **Global Traffic Chart:** Large smooth-curve area chart, `#8B5CF6` gradient fill, custom tooltip on hover showing precise RPS (Requests Per Second).
- **Health Stat Cards:** White surface, 20px radius, soft shadow. Displays exact latency (e.g., `42ms`), uptime (`99.9%`), and total requests (`1.2M`).
- **Live Event Feed:** Right-aligned sidebar showing real-time 4xx/5xx errors as small pill-shaped toasts streaming upwards.

**States:**
- **Empty:** "No traffic yet. Send a request to your gateway to see analytics." illustration (soft geometric shapes).
- **Loading:** Pulsing skeletal frames with a `#F8FAFC` to `#F1F5F9` gradient.
- **Error:** Red-tinted card replacing the chart: "Unable to load analytics data. Retry."

**Components:**
- **Sidebar Nav Item:** 40px height, 12px radius, transparent background. Active state: `#F5F3FF` background, `#8B5CF6` text.

**Interactions:**
- **Hover Chart:** Vertical crosshair appears, soft tooltip fades in `200ms ease`.
- **Click Stat Card:** Highlights the specific metric on the main chart area.

**Responsive:**
- **Desktop:** Sidebar visible, 3-column stats, 2-column bottom layout.
- **Tablet:** Collapsed sidebar (icons only), stats wrap to 2x2.
- **Mobile:** Not supported (Desktop MVP).

### Endpoint Management

**Purpose:** High-level list and configuration of all API routes.

**Functional Requirements:**
- Grid dynamically populated from the Endpoint data model.
- Search functionality filters routes locally by `path` string.
- Support creation of REST endpoints and GraphQL proxies.
- Visual sparkline must render the last 24 hours of traffic using sampled data.

**Layout:** Standard sidebar. Main area: Header with "Add Endpoint" button, followed by a masonry or standard CSS Grid of "Endpoint Cards" (3 per row).

**Key Elements:**
- **Search & Filter Bar:** 48px height, pill shape, subtle inner shadow. Contains fuzzy search for route paths.
- **Endpoint Card:** 240px height. Shows HTTP method pill (`GET`, `POST`), route path (`/api/v1/users`), 24-hour sparkline chart, and status indicator (green dot).
- **Add Endpoint Button:** Floating action style or top-right header, `#8B5CF6` background, pill shape, white text.

**States:**
- **Empty:** Grid replaced by a large, friendly dropzone: "Create your first API route".
- **Loading:** 6 skeleton cards.
- **Error:** Inline banner above grid, `#F43F5E` text.

**Components:**
- **Method Pill:** 24px height, 8px radius. `GET` (`#10B981` text, `#D1FAE5` bg), `POST` (`#3B82F6` text, `#DBEAFE` bg).

**Interactions:**
- **Hover Card:** Elevates slightly (`transform: translateY(-2px)`), shadow increases to `--shadow-glow`.
- **Click Card:** Routes to Endpoint Detail screen.

**Responsive:**
- **Desktop:** 3 columns.
- **Tablet:** 2 columns.
- **Mobile:** Not supported.

### Endpoint Detail

**Purpose:** Granular configuration and analytics for a single specific route.

**Functional Requirements:**
- **Target Routing:** Editable field to update the upstream `target_url`.
- **Rate Limit Policies:** Editable slider and numeric input for Requests Per Minute/Second. Updates the `Route Rule` data model.
- **Retry Policies:** Editable settings for "Max Retries" (1-5) and "Backoff Multiplier" (exponential backoff configuration).
- **Live Logs:** WebSocket subscription pushing log entries (Status, Method, Path, Latency, Payload Preview) in real-time. Action to copy JSON payload.

**Layout:** Header with breadcrumbs. Main content: Left column (Configuration Form), Right column (Live Request Logs & Route-specific Metrics).

**Key Elements:**
- **Target URL Input:** Large text field, 48px height, no border, grey background `#F1F5F9`, focused state adds 2px `#8B5CF6` ring.
- **Rate Limit Sliders:** Custom slider track (`#E2E8F0`), primary colored thumb. Adjusts requests/minute.
- **Live Log Terminal:** Dark surface (`#0F172A`), monospace font (`JetBrains Mono`, 13px), color-coded HTTP status codes.

**States:**
- **Empty Logs:** "Awaiting requests..." pulsing text in the terminal.
- **Loading:** Standard skeleton loaders for metrics.
- **Error:** Save button turns red, shakes via CSS animation if validation fails.

**Components:**
- **Save Changes Button:** 44px height, primary color, bottom right of the configuration card.

**Interactions:**
- **Hover Log Entry:** Highlights row, reveals "Copy Payload" icon.
- **Click Save:** Button shows a loading spinner, changes to a green checkmark on success.

**Responsive:**
- **Desktop:** 2-column split (60% config / 40% logs).
- **Tablet:** Stacks vertically (config on top, logs below).
- **Mobile:** Not supported.

### Access Keys

**Purpose:** Issue and manage client authentication tokens.

**Functional Requirements:**
- **Key Generation:** Collect Key Name, Environment, and select permission Scopes. Generates cryptographic key, displaying full token once.
- **Data Table:** Render list of keys. Columns: Name, Key Prefix (e.g., `sk_live_1234...`), Scopes, Created Date, Last Used, Actions (Revoke).
- **Revocation:** Action to instantly invalidate a key, updating `status` to Revoked in the database.

**Layout:** Simple list view layout. Header with CTA. Main area: Full-width data table.

**Key Elements:**
- **Key Table:** Columns for Name, Key Prefix, Created Date, Last Used, and Actions. Soft borders between rows, no vertical lines.
- **Generate Key Modal:** 400px wide, centered. Input for "Key Name", dropdown for "Environment" (Test/Live), and multiselect for "Scopes".
- **Key Reveal Banner:** Appears only once after generation. Yellow warning text: "Copy this key now. You won't be able to see it again."

**States:**
- **Empty:** "No keys generated." text center-aligned in table body.
- **Loading:** Table rows replaced with pulsing grey bars.
- **Error:** Toast notification top right.

**Components:**
- **Status Tag:** `Active` (green), `Revoked` (red), `Expired` (grey). 24px height, pill shape.

**Interactions:**
- **Click Generate:** Opens soft modal with backdrop blur (`backdrop-filter: blur(4px)`).
- **Click Revoke:** Opens destructive confirmation modal (Red primary button).

**Responsive:**
- **Desktop:** Full table visible.
- **Tablet:** Hides "Last Used" column.
- **Mobile:** Not supported.

</details>

---

<details>
<summary>Build Guide</summary>

**Stack:**
- **Frontend:** React, Next.js App Router, Tailwind CSS v3, shadcn/ui, Recharts
- **State Management:** Zustand, TanStack Query
- **Backend:** Go Fiber (Data Plane) and NestJS (Control Plane)
- **Architecture:** Monorepo managed with Turborepo or Nx
- **API Contract:** Control plane documented with OpenAPI 3.1 (via Swagger or tRPC)

**Build Order:**
1. **Dashboard** - Establishes the core layout (sidebar), background colors, and the primary charting aesthetic which is the heart of "Soft Analytics".
2. **Endpoint Management** - Introduces the card grid layout and smaller visual components (method pills, sparklines).
3. **Endpoint Detail** - Focuses on form inputs, sliders, and the dark-mode terminal component for logs.
4. **Access Keys** - Completes the UI set with tables, modals, and standardized tag elements.

</details>