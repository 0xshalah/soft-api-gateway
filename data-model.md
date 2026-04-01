# File: data-model.md
## Multi-Database Schemas

### 1. PostgreSQL (Primary Configuration Store)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE endpoints (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  path VARCHAR NOT NULL,
  target_url VARCHAR NOT NULL,
  method VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(path, method)
);

CREATE TABLE route_rules (
  id UUID PRIMARY KEY,
  endpoint_id UUID REFERENCES endpoints(id) ON DELETE CASCADE,
  rate_limit_rpm INT DEFAULT 60,
  retry_count INT DEFAULT 0,
  backoff_multiplier FLOAT DEFAULT 1.0
);

CREATE TABLE keys (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  prefix VARCHAR(15) NOT NULL, -- e.g., 'sk_live_1234'
  hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256
  scopes TEXT[], 
  status VARCHAR(20) DEFAULT 'Active',
  last_used TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

2. Redis (High-Speed Cache & Rate Limiting)
Rate Limit (Token Bucket): rate_limit:{endpoint_id}:{client_ip_or_key} -> Tracks remaining requests per minute.

Key Verification Lookup: key_prefix:{prefix} -> Returns { hash: string, scopes: string[], endpoint_id: string }.

3. ClickHouse (Telemetry & Analytics)

CREATE TABLE traffic_log (
  id UUID,
  timestamp DateTime,
  endpoint_id UUID,
  status_code UInt16,
  latency_ms UInt32,
  method String,
  path String,
  payload_preview String
) ENGINE = MergeTree()
ORDER BY (endpoint_id, timestamp)
TTL timestamp + INTERVAL 7 DAY;