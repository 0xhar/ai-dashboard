# AI FinOps Platform — Phase-by-Phase Implementation Todos

> Every task from PLAN.md broken into actionable, checkable items.
> Phases 1-7 = Build (7 weeks). Phases 8-10 = Launch & Growth.

---

## Phase 0: Pre-Development Setup

**Goal**: Repository, tooling, and dev environment ready before writing any application code.

### 0.1 Git & Repository

- [ ] `git init` in `/home/harini/Documents/pocs/ai-dashboard`
- [ ] Create `.gitignore`:
  - `node_modules/`, `.next/`, `dist/`, `.env.local`, `.env`, `*.tsbuildinfo`
  - `drizzle/meta/`, `.DS_Store`, `coverage/`, `.turbo/`
- [ ] Create initial commit: `git add . && git commit -m "chore: initial project setup"`
- [ ] (Optional) Create GitHub repo and push

### 0.2 Package Versions (Pin These)

All dependencies pinned to specific versions to avoid breakage:

- [ ] `next` — `15.1.x` (latest stable App Router)
- [ ] `react` / `react-dom` — `19.x` (required by Next 15)
- [ ] `next-auth` — `5.0.0-beta.25` (latest v5 beta, check npm for current)
- [ ] `drizzle-orm` — `0.38.x`, `drizzle-kit` — `0.30.x`
- [ ] `bullmq` — `5.x`, `ioredis` — `5.x`
- [ ] `@tanstack/react-query` — `5.x`
- [ ] `recharts` — `2.15.x`
- [ ] `zod` — `3.x`
- [ ] `tailwindcss` — `4.x` (check shadcn/ui compatibility, fallback to 3.4.x)
- [ ] `@aws-sdk/*` packages — `3.x` (for Bedrock adapter in Phase 2)
- [ ] `vitest` — `3.x`, `msw` — `2.x`

### 0.3 Code Quality Tooling

- [ ] Configure ESLint (extends `next/core-web-vitals`, `next/typescript`):
  - [ ] Add rule: `no-console` as warn (use logger instead)
  - [ ] Add rule: `@typescript-eslint/no-unused-vars` as error
- [ ] Configure Prettier:
  - [ ] `.prettierrc`: `{ "singleQuote": true, "semi": true, "tabWidth": 2, "trailingComma": "es5" }`
  - [ ] `.prettierignore`: `node_modules`, `.next`, `drizzle/`
- [ ] Add VS Code settings (`.vscode/settings.json`):
  - [ ] Format on save, default formatter: Prettier
  - [ ] ESLint auto-fix on save

### 0.4 Package.json Scripts

- [ ] Define all scripts in `package.json`:
  ```
  "dev": "next dev"
  "build": "next build"
  "start": "next start"
  "worker:dev": "tsx watch worker/index.ts"
  "dev:all": "concurrently \"pnpm dev\" \"pnpm worker:dev\""
  "db:generate": "drizzle-kit generate"
  "db:migrate": "drizzle-kit migrate"
  "db:studio": "drizzle-kit studio"
  "db:push": "drizzle-kit push"
  "seed:demo": "tsx scripts/seed-demo.ts"
  "test": "vitest run"
  "test:watch": "vitest"
  "test:coverage": "vitest run --coverage"
  "lint": "next lint"
  "typecheck": "tsc --noEmit"
  "format": "prettier --write ."
  "format:check": "prettier --check ."
  ```
- [ ] Install `concurrently` and `tsx` as dev dependencies

### 0.5 Shared TypeScript Types

- [ ] Create `lib/types/index.ts` — shared types used across frontend + backend:
  - [ ] `ApiResponse<T>` — `{ data: T } | { error: string, code: string }`
  - [ ] `PaginatedResponse<T>` — `{ data: T[], total: number, page: number, pageSize: number }`
  - [ ] `DatePeriod` — `'7d' | '30d' | '90d' | 'mtd' | 'last_month'`
  - [ ] `Granularity` — `'daily' | 'weekly' | 'monthly'`
  - [ ] `GroupBy` — `'provider' | 'model' | 'team'`
  - [ ] `ProviderType` — `'openai' | 'anthropic' | 'aws_bedrock' | 'litellm'`
  - [ ] `OrgRole` — `'owner' | 'admin' | 'member' | 'viewer'`
  - [ ] `ConnectionStatus` — `'active' | 'error' | 'disabled'`
  - [ ] `AlertStatus` — `'active' | 'triggered' | 'resolved' | 'disabled'`

### 0.6 Standardized API Error Handling

- [ ] Create `lib/api/errors.ts`:
  - [ ] `ApiError` class extending Error with `statusCode` and `code` fields
  - [ ] Pre-defined errors: `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `RateLimitError`, `PlanLimitError`
- [ ] Create `lib/api/response.ts`:
  - [ ] `successResponse(data, status = 200)` — returns `Response.json({ data }, { status })`
  - [ ] `errorResponse(error)` — returns `Response.json({ error: message, code }, { status })`
  - [ ] `withErrorHandler(handler)` — wraps route handler with try/catch, returns standardized error response

### 0.7 Structured Logging

- [ ] Create `lib/logger.ts`:
  - [ ] Use `pino` or simple custom logger (not console.log)
  - [ ] Log levels: debug, info, warn, error
  - [ ] JSON format in production, pretty-print in dev
  - [ ] Contextual fields: `{ service: 'api' | 'worker', orgId?, connectionId? }`
  - [ ] Install `pino` + `pino-pretty` (dev)

### 0.8 Utility Functions

- [ ] Create `lib/utils.ts`:
  - [ ] `cn(...classes)` — Tailwind class merger (shadcn standard)
  - [ ] `formatCurrency(cents: number)` — `12345` → `"$123.45"`
  - [ ] `formatCurrencyCompact(cents: number)` — `1234500` → `"$12.3K"`
  - [ ] `formatTokens(count: number)` — `1500000` → `"1.5M"`
  - [ ] `formatNumber(n: number)` — `1234567` → `"1,234,567"`
  - [ ] `formatDate(date: Date, format?)` — consistent date formatting
  - [ ] `formatRelativeTime(date: Date)` — "5 minutes ago", "2 hours ago"
  - [ ] `slugify(text: string)` — "My Team Name" → "my-team-name"
  - [ ] `generateEncryptionKey()` — helper to generate ENCRYPTION_MASTER_KEY (for docs)

### 0.9 Tailwind Custom Theme

- [ ] Configure `tailwind.config.ts` (or CSS variables for v4):
  - [ ] Provider brand colors:
    - OpenAI: `#10A37F` (green)
    - Anthropic: `#D4A574` (tan/orange)
    - AWS: `#FF9900` (orange)
    - LiteLLM: `#4F46E5` (indigo)
  - [ ] Chart color palette (8 distinct colors for multi-series charts)
  - [ ] Dashboard-specific tokens: `--card-highlight`, `--spend-positive`, `--spend-negative`
  - [ ] Dark mode color overrides

### 0.10 Static Assets

- [ ] Create `public/providers/` directory
- [ ] Add provider logo SVGs:
  - [ ] `public/providers/openai.svg`
  - [ ] `public/providers/anthropic.svg`
  - [ ] `public/providers/aws-bedrock.svg`
  - [ ] `public/providers/litellm.svg`
- [ ] Add app logo placeholder: `public/logo.svg`

### 0.11 TanStack Query Hooks Structure

- [ ] Create `lib/hooks/` directory for frontend data hooks:
  - [ ] `lib/hooks/use-connections.ts` — CRUD hooks for connections
  - [ ] `lib/hooks/use-teams.ts` — CRUD hooks for teams
  - [ ] `lib/hooks/use-dashboard.ts` — dashboard data fetching (summary, timeseries, top-models)
  - [ ] `lib/hooks/use-alerts.ts` — CRUD hooks for alerts
  - [ ] `lib/hooks/use-org.ts` — org settings, members
  - [ ] Each hook file exports: `useQuery` for reads, `useMutation` for writes
  - [ ] All hooks call standardized fetch wrapper that handles auth errors
- [ ] Create `lib/api/client.ts`:
  - [ ] `apiFetch(url, options)` — wrapper around fetch that adds error handling, parses JSON, handles 401 redirect to login

### 0.12 Next.js Configuration

- [ ] Configure `next.config.ts`:
  - [ ] `output: 'standalone'` (for Docker)
  - [ ] Security headers:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `X-XSS-Protection: 1; mode=block`
  - [ ] Image domains (if any external avatars)
- [ ] Configure `middleware.ts` (Next.js edge middleware):
  - [ ] Protect all `/dashboard/*` routes — redirect to `/login` if no session
  - [ ] Redirect `/` to `/overview` if authenticated, `/login` if not

### 0.13 Database Connection Pooling

- [ ] Configure Drizzle connection in `lib/db/index.ts`:
  - [ ] Use `postgres` driver with connection pool settings:
    - `max: 10` for app process
    - `max: 5` for worker process
    - `idle_timeout: 20` seconds
  - [ ] Separate connection configs for app vs worker (via env var or runtime check)

### 0.14 Phase 0 Verification

- [ ] `git log` shows initial commit
- [ ] `pnpm install` succeeds with no errors
- [ ] `pnpm lint` runs (may have no files yet)
- [ ] `pnpm typecheck` runs
- [ ] `pnpm format:check` runs
- [ ] `.env.example` has all variables documented
- [ ] All shared types compile without errors
- [ ] Logger outputs JSON in production mode, pretty in dev
- [ ] Utility functions have correct output (quick manual test or unit test)

---

## Phase 1: Foundation (Week 1)

**Goal**: Runnable app with auth, database, and basic UI shell.
**Deliverable**: User can sign up, log in, navigate dashboard, add/test a provider connection.

### 1.1 Project Scaffolding

- [ ] Initialize Next.js 15 project with App Router (`pnpm create next-app --typescript --tailwind --app`)
- [ ] Install core dependencies (versions from Phase 0.2):
  - [ ] `drizzle-orm` + `drizzle-kit` + `postgres` (PostgreSQL driver)
  - [ ] `next-auth@beta` + `@auth/drizzle-adapter` (NextAuth v5)
  - [ ] `bullmq` + `ioredis` (job queue)
  - [ ] `zod` (validation)
  - [ ] `@tanstack/react-query` (data fetching)
  - [ ] `react-hook-form` + `@hookform/resolvers` (forms)
  - [ ] `recharts` (charts)
  - [ ] `bcryptjs` (password hashing)
  - [ ] `react-email` + `@react-email/components` (email templates)
  - [ ] `resend` (email sending — SaaS) + `nodemailer` (self-hosted fallback)
  - [ ] `pino` + `pino-pretty` (logging)
- [ ] Install dev dependencies: `@types/bcryptjs`, `vitest`, `msw`, `@faker-js/faker`, `concurrently`, `tsx`
- [ ] Initialize shadcn/ui (`pnpm dlx shadcn@latest init`)
- [ ] Add shadcn/ui components: button, card, table, dialog, input, label, select, tabs, badge, dropdown-menu, toast, skeleton, sheet, separator, avatar
- [ ] Copy `.env.example` to `.env.local`, fill in local dev values
- [ ] Configure `drizzle.config.ts` pointing to `lib/db/schema`
- [ ] Commit: `chore: install dependencies and configure tooling`

### 1.2 Docker Compose (Dev Environment)

- [ ] Create `docker-compose.yml` with 4 services:
  - [ ] `postgres` — PostgreSQL 16 Alpine, healthcheck, volume `pgdata`
  - [ ] `redis` — Redis 7 Alpine, volume `redisdata`
  - [ ] `app` — Next.js (build from Dockerfile, target: `app`), port 3000
  - [ ] `worker` — BullMQ worker (build from Dockerfile, target: `worker`)
- [ ] Create `docker-compose.dev.yml` override for local dev (mount volumes, hot reload)
- [ ] Verify `docker compose up postgres redis` starts and is accessible from host
- [ ] Create placeholder `Dockerfile` with multi-stage build (base → builder → app / worker)

### 1.3 Database Schema

- [ ] Create `lib/db/index.ts` — Drizzle client initialization with `DATABASE_URL`
- [ ] Create Drizzle schema files:
  - [ ] `lib/db/schema/organizations.ts` — id (UUID), name, slug (unique), plan (free/pro/enterprise), encryption_key_hash, created_at, updated_at
  - [ ] `lib/db/schema/users.ts` — id (UUID), email (unique), name, password_hash (nullable), avatar_url, email_verified, created_at, updated_at
  - [ ] `lib/db/schema/org-memberships.ts` — id, user_id (FK), org_id (FK), role (owner/admin/member/viewer), unique(user_id, org_id)
  - [ ] `lib/db/schema/teams.ts` — id, org_id (FK), name, slug, monthly_budget_cents (nullable), unique(org_id, slug)
  - [ ] `lib/db/schema/team-memberships.ts` — id, team_id (FK), user_id (FK), unique(team_id, user_id)
  - [ ] `lib/db/schema/provider-connections.ts` — id, org_id (FK), provider (enum: openai/anthropic/aws_bedrock/litellm), display_name, credentials_encrypted, credentials_iv, status (active/error/disabled), last_synced_at, last_error, sync_cursor (JSONB)
  - [ ] `lib/db/schema/team-provider-mappings.ts` — id, team_id (FK), connection_id (FK), provider_entity_type, provider_entity_id, provider_entity_name, unique(team_id, connection_id, provider_entity_id)
  - [ ] `lib/db/schema/usage-records.ts` — BIGSERIAL id, org_id, connection_id, provider (denormalized), bucket_start, bucket_end, bucket_width, model, provider_project_id, provider_workspace_id, provider_user_id, provider_api_key_id, service_tier, input_tokens, output_tokens, cached_input_tokens, total_requests, team_id (nullable), composite unique constraint, BRIN index on bucket_start, indexes on (org_id, bucket_start), (team_id, bucket_start)
  - [ ] `lib/db/schema/cost-records.ts` — BIGSERIAL id, org_id, connection_id, provider, bucket_date (DATE), model, provider_project_id, provider_workspace_id, cost_category, amount_cents (integer), currency, team_id (nullable), composite unique constraint, indexes on (org_id, bucket_date), (team_id, bucket_date)
  - [ ] `lib/db/schema/budget-alerts.ts` — id, org_id (FK), team_id (FK, nullable), threshold_cents, period (daily/weekly/monthly), notify_emails (text array), status (active/triggered/resolved/disabled), last_triggered_at
  - [ ] `lib/db/schema/sync-jobs.ts` — id, connection_id (FK), sync_type (usage/cost), status (pending/running/completed/failed), started_at, completed_at, records_synced, error_message, metadata (JSONB)
  - [ ] `lib/db/schema/index.ts` — re-export all schemas
- [ ] Run `pnpm drizzle-kit generate` to generate initial migration SQL
- [ ] Run `pnpm drizzle-kit migrate` against local PostgreSQL
- [ ] Verify schema with `pnpm drizzle-kit studio`

### 1.4 Authentication (NextAuth v5)

- [ ] Create `lib/auth/config.ts`:
  - [ ] Configure Drizzle adapter (`@auth/drizzle-adapter`)
  - [ ] Configure database session strategy (not JWT)
  - [ ] Add Credentials provider (email + password with bcrypt verify)
  - [ ] Add Google OAuth provider
  - [ ] Add session callback to attach org_id and role from org_memberships
- [ ] Create `app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- [ ] Create signup API route `app/api/auth/signup/route.ts`:
  - [ ] Validate input with Zod (email, password, name)
  - [ ] Hash password with bcrypt
  - [ ] Create user + organization + org_membership (role: owner) in a transaction
  - [ ] Return success / error
- [ ] Create `lib/auth/middleware.ts`:
  - [ ] `withAuth(handler, { requiredRole })` wrapper
  - [ ] Role hierarchy: viewer < member < admin < owner
  - [ ] Extract org_id from session for all data-scoped queries
- [ ] Create auth UI pages:
  - [ ] `app/(auth)/layout.tsx` — centered card layout, no sidebar
  - [ ] `app/(auth)/login/page.tsx` — email/password form + Google OAuth button
  - [ ] `app/(auth)/signup/page.tsx` — name, email, password, org name form
- [ ] Add NextAuth middleware in `middleware.ts` to protect dashboard routes
- [ ] Test: signup → login → session → logout flow works

### 1.5 Dashboard Shell (UI Layout)

- [ ] Create `app/(dashboard)/layout.tsx` — sidebar + header + main content area
- [ ] Create `components/layout/sidebar.tsx`:
  - [ ] Navigation links: Overview, Teams, Connections, Alerts, Settings
  - [ ] Provider icons (OpenAI, Anthropic, AWS, LiteLLM) in sidebar
  - [ ] Active link highlighting
  - [ ] Collapsible on mobile (Sheet component)
- [ ] Create `components/layout/header.tsx`:
  - [ ] Org name display
  - [ ] User avatar + dropdown (profile, sign out)
- [ ] Create `components/layout/org-switcher.tsx` — placeholder for multi-org (enterprise)
- [ ] Create placeholder pages (empty state with title):
  - [ ] `app/(dashboard)/page.tsx` — redirect to /overview
  - [ ] `app/(dashboard)/overview/page.tsx` — "Overview" placeholder
  - [ ] `app/(dashboard)/teams/page.tsx` — "Teams" placeholder
  - [ ] `app/(dashboard)/connections/page.tsx` — "Connections" placeholder
  - [ ] `app/(dashboard)/alerts/page.tsx` — "Alerts" placeholder
  - [ ] `app/(dashboard)/settings/page.tsx` — "Settings" placeholder
- [ ] Set up TanStack Query provider in `app/(dashboard)/layout.tsx`
- [ ] Verify navigation between all pages works

### 1.6 Provider Connection CRUD + Encryption

- [ ] Create `lib/crypto/key-derivation.ts`:
  - [ ] `deriveOrgKey(masterKey, orgId)` — HKDF with SHA-256, salt=orgId, info="provider-credentials"
- [ ] Create `lib/crypto/encryption.ts`:
  - [ ] `encrypt(plaintext, orgId)` — AES-256-GCM, random 16-byte IV, returns { ciphertext, iv }
  - [ ] `decrypt(ciphertext, iv, orgId)` — AES-256-GCM decrypt, returns plaintext
  - [ ] Both use `ENCRYPTION_MASTER_KEY` env var
- [ ] Create `lib/services/connections.service.ts`:
  - [ ] `createConnection(orgId, provider, displayName, credentials)` — encrypt + store
  - [ ] `listConnections(orgId)` — return all (without decrypted credentials)
  - [ ] `getConnection(orgId, connectionId)` — return single
  - [ ] `deleteConnection(orgId, connectionId)` — cascade delete
  - [ ] `testConnection(orgId, connectionId)` — decrypt credentials, call provider's test endpoint
  - [ ] `updateConnectionStatus(connectionId, status, error)` — update status/error fields
- [ ] Create API routes:
  - [ ] `app/api/v1/connections/route.ts` — GET (list), POST (create)
  - [ ] `app/api/v1/connections/[connectionId]/route.ts` — GET (detail), PATCH (update), DELETE
  - [ ] `app/api/v1/connections/[connectionId]/test/route.ts` — POST (test credentials)
- [ ] Create connection UI:
  - [ ] `app/(dashboard)/connections/page.tsx` — list connections as cards with status badge
  - [ ] `app/(dashboard)/connections/new/page.tsx` — add connection wizard
  - [ ] `components/connections/provider-selector.tsx` — choose provider type (OpenAI/Anthropic/Bedrock/LiteLLM)
  - [ ] `components/connections/credentials-form.tsx` — dynamic form per provider type:
    - OpenAI: Admin API key field
    - Anthropic: Admin API key field
    - AWS Bedrock: Access Key ID, Secret Access Key, Region, optional Role ARN
    - LiteLLM: Database URL or API endpoint + API key
  - [ ] `components/connections/connection-card.tsx` — display name, provider icon, status badge, last synced
  - [ ] `components/connections/sync-status-badge.tsx` — active (green), error (red), disabled (gray)
- [ ] Create `lib/redis.ts` — Redis connection singleton using ioredis
- [ ] Create `lib/constants.ts` — provider types enum, role hierarchy, sync intervals
- [ ] Create `lib/utils.ts` — cn() helper (shadcn), date formatting, currency formatting

### 1.7 Phase 1 Verification

- [ ] `docker compose up postgres redis` starts cleanly
- [ ] `pnpm dev` starts Next.js on localhost:3000
- [ ] Sign up with email/password creates user + org
- [ ] Login works and redirects to dashboard
- [ ] Sidebar navigation works between all pages
- [ ] Add a provider connection (any type) — credentials stored encrypted in DB
- [ ] Test connection endpoint returns success/failure
- [ ] Direct DB inspection confirms credentials are ciphertext, not plaintext
- [ ] Logout works

---

## Phase 2: Provider Sync Pipeline (Week 2)

**Goal**: Data flows from provider APIs into the database.
**Deliverable**: Adding a connection automatically syncs data every 15 minutes. Sync status visible in UI.

### 2.1 Provider Adapter Interface

- [ ] Create `lib/providers/types.ts`:
  - [ ] `ProviderType` enum: `'openai' | 'anthropic' | 'aws_bedrock' | 'litellm'`
  - [ ] `ProviderCredentials` type (union of per-provider credential shapes)
  - [ ] `NormalizedUsageRecord` type: org_id, connection_id, provider, bucket_start, bucket_end, bucket_width, model, provider_project_id, provider_workspace_id, provider_user_id, provider_api_key_id, service_tier, input_tokens, output_tokens, cached_input_tokens, total_requests
  - [ ] `NormalizedCostRecord` type: org_id, connection_id, provider, bucket_date, model, provider_project_id, provider_workspace_id, cost_category, amount_cents, currency
  - [ ] `ProviderEntity` type: id, name, type (project/workspace/cost_tag/api_key)
  - [ ] `ProviderAdapter` interface: testCredentials(), fetchUsage() (AsyncGenerator), fetchCosts() (AsyncGenerator), listEntities()
- [ ] Create `lib/providers/registry.ts`:
  - [ ] `getAdapter(providerType: ProviderType): ProviderAdapter` factory function
  - [ ] Import and register all adapter implementations

### 2.2 OpenAI Adapter

- [ ] Create `lib/providers/openai.ts` implementing `ProviderAdapter`:
  - [ ] `testCredentials()`: Call `GET /v1/organization/users` or similar with admin key, check for 200
  - [ ] `fetchUsage()`:
    - [ ] Call `GET /v1/organization/usage/completions` with params: start_time, end_time, bucket_width=1h, group_by=[model, project_id, user_id, api_key_id]
    - [ ] Handle pagination (cursor-based)
    - [ ] Map response fields: input_tokens, output_tokens, input_cached_tokens, num_model_requests → NormalizedUsageRecord
    - [ ] Yield batches via async generator
  - [ ] `fetchCosts()`:
    - [ ] Call `GET /v1/organization/costs` with start_time, bucket_width=1d, group_by=[project_id]
    - [ ] Convert dollar amounts to integer cents (multiply by 100, round)
    - [ ] Handle pagination
    - [ ] Yield batches via async generator
  - [ ] `listEntities()`:
    - [ ] Call OpenAI Admin API to list projects
    - [ ] Return as ProviderEntity[] with type='project'
  - [ ] Rate limiting: respect 100 req/min on admin endpoints (use p-throttle or manual delay)
- [ ] Create `tests/fixtures/openai-usage-response.json` — sample API response from docs
- [ ] Create `tests/fixtures/openai-costs-response.json`
- [ ] Create `tests/unit/providers/openai.test.ts`:
  - [ ] Test response parsing and normalization
  - [ ] Test pagination handling
  - [ ] Test dollar-to-cents conversion
  - [ ] Test empty response handling

### 2.3 Anthropic Adapter

- [ ] Create `lib/providers/anthropic.ts` implementing `ProviderAdapter`:
  - [ ] `testCredentials()`: Call Anthropic Admin API with admin key, check for 200
  - [ ] `fetchUsage()`:
    - [ ] Call `GET /v1/organizations/usage_report/messages` with starting_at, ending_at, bucket_width=1h, group_by=[model, workspace_id, api_key_id]
    - [ ] Handle pagination (next_page token)
    - [ ] Map: uncached_input_tokens, output_tokens, cache_read_input_tokens → NormalizedUsageRecord
    - [ ] Yield batches
  - [ ] `fetchCosts()`:
    - [ ] Call `GET /v1/organizations/cost_report` with time range, group_by=[workspace_id, description]
    - [ ] Parse cents-as-decimal-string: `Math.round(parseFloat(amount))` → integer cents
    - [ ] Add code comment documenting this unusual format
    - [ ] Yield batches
  - [ ] `listEntities()`:
    - [ ] Call Anthropic Admin API to list workspaces
    - [ ] Return as ProviderEntity[] with type='workspace'
  - [ ] Rate limiting: ~60 req/min
  - [ ] Display warning: Priority Tier costs NOT included in cost report
- [ ] Create `tests/fixtures/anthropic-usage-response.json`
- [ ] Create `tests/fixtures/anthropic-cost-response.json`
- [ ] Create `tests/unit/providers/anthropic.test.ts`:
  - [ ] Test response parsing and normalization
  - [ ] Test cents-as-decimal-string parsing
  - [ ] Test cache token mapping
  - [ ] Test empty response handling

### 2.4 AWS Bedrock Adapter

- [ ] Create `lib/providers/aws-bedrock.ts` implementing `ProviderAdapter`:
  - [ ] `testCredentials()`: Call `sts:GetCallerIdentity` with IAM credentials, check success
  - [ ] `fetchUsage()`:
    - [ ] Use AWS SDK `CloudWatchClient.getMetricData()`:
      - Namespace: `AWS/Bedrock`
      - Metrics: `InputTokenCount`, `OutputTokenCount`
      - Dimension: `ModelId`
      - Period: 3600 (1 hour)
    - [ ] Group by model, normalize into NormalizedUsageRecord
    - [ ] Handle pagination (NextToken)
    - [ ] Yield batches
  - [ ] `fetchCosts()`:
    - [ ] Use AWS SDK `CostExplorerClient.getCostAndUsage()`:
      - Service filter: `Amazon Bedrock`
      - Granularity: `DAILY`
      - GroupBy: `USAGE_TYPE`
      - Note: always call against us-east-1
    - [ ] Account for 24h lag: never request current or previous day
    - [ ] Parse UsageType to extract model name and token direction
    - [ ] Convert dollar amounts to integer cents
    - [ ] Yield batches
  - [ ] `listEntities()`:
    - [ ] Call `listInferenceProfiles()` to enumerate Application Inference Profiles
    - [ ] Return with cost allocation tags as entity identifiers
    - [ ] Fallback: list available model IDs if no profiles exist
  - [ ] Support optional `AWS_ROLE_ARN` for cross-account assume-role via STS
- [ ] Install AWS SDK deps: `@aws-sdk/client-cloudwatch`, `@aws-sdk/client-cost-explorer`, `@aws-sdk/client-sts`, `@aws-sdk/client-bedrock`
- [ ] Create `tests/fixtures/cloudwatch-metrics-response.json`
- [ ] Create `tests/fixtures/cost-explorer-response.json`
- [ ] Create `tests/unit/providers/aws-bedrock.test.ts`:
  - [ ] Test CloudWatch metric parsing
  - [ ] Test Cost Explorer response parsing
  - [ ] Test UsageType → model name extraction
  - [ ] Test 24h lag guard

### 2.5 BullMQ Worker Process

- [ ] Create `worker/index.ts` — entry point:
  - [ ] Connect to Redis and PostgreSQL
  - [ ] Register all workers
  - [ ] Call scheduler to register repeatable jobs
  - [ ] Handle graceful shutdown (SIGTERM/SIGINT)
- [ ] Create `worker/queues.ts` — queue definitions:
  - [ ] `sync:usage` queue — 3 retries, exponential backoff (30s base), keep 7 days
  - [ ] `sync:cost` queue — 3 retries, exponential backoff (60s base), keep 7 days
  - [ ] `budget:check` queue
  - [ ] `team:attribute` queue
- [ ] Create `worker/scheduler.ts`:
  - [ ] Register repeatable job: `sync:usage` every 15 minutes
  - [ ] Register repeatable job: `sync:cost` every 6 hours
  - [ ] Register repeatable job: `budget:check` every 1 hour
  - [ ] Each scheduler job fans out: query all active connections → enqueue individual sync jobs
- [ ] Create `worker/workers/sync-usage.worker.ts`:
  - [ ] Receive job with `{ connectionId }`
  - [ ] Load provider_connection from DB
  - [ ] Decrypt credentials using org's derived key
  - [ ] Create sync_job record (status: running)
  - [ ] Determine time window: start = sync_cursor.last_usage_sync || (now - 24h), end = now - 5min
  - [ ] Get adapter via registry, call `fetchUsage()`
  - [ ] For each batch: `INSERT INTO usage_records ... ON CONFLICT DO UPDATE`
  - [ ] Increment records_synced counter
  - [ ] Update sync_cursor on provider_connection
  - [ ] Enqueue `team:attribute` job for this connection
  - [ ] Update sync_job (status: completed)
  - [ ] On error: update sync_job (status: failed), update connection status if auth error (401/403)
- [ ] Create `worker/workers/sync-cost.worker.ts`:
  - [ ] Same pattern as sync-usage but for cost_records
  - [ ] Uses fetchCosts() instead of fetchUsage()
  - [ ] Upsert into cost_records table
- [ ] Create `worker/workers/team-attribute.worker.ts`:
  - [ ] Receive job with `{ connectionId }`
  - [ ] Query team_provider_mappings for this connection
  - [ ] Bulk UPDATE usage_records SET team_id WHERE matching provider entity IDs AND team_id IS NULL
  - [ ] Bulk UPDATE cost_records SET team_id WHERE matching provider entity IDs AND team_id IS NULL
- [ ] Create `worker/workers/connection-test.worker.ts`:
  - [ ] Async credential validation (called from API)
  - [ ] Update connection status based on result
- [ ] Add `worker:dev` script to `package.json` (tsx watch worker/index.ts)
- [ ] Add sync trigger API: `app/api/v1/connections/[connectionId]/sync/route.ts` — POST to enqueue immediate sync

### 2.6 Sync Status UI

- [ ] Create `app/(dashboard)/connections/[connectionId]/page.tsx` — connection detail page:
  - [ ] Connection info (name, provider, status, last synced)
  - [ ] "Sync Now" button (calls POST /sync)
  - [ ] Sync job history table (status, started_at, completed_at, records_synced, error)
- [ ] Add `app/api/v1/sync/jobs/route.ts` — GET list recent sync jobs filtered by connectionId
- [ ] Update connection list page to show last_synced_at and sync status per connection

### 2.7 Phase 2 Verification

- [ ] All unit tests pass for OpenAI, Anthropic, and Bedrock adapters
- [ ] Worker process starts and connects to Redis
- [ ] Adding a connection enqueues sync jobs
- [ ] Sync worker processes jobs (tested against mock server or fixtures)
- [ ] Usage and cost records appear in database after sync
- [ ] Sync job history is visible on connection detail page
- [ ] "Sync Now" button triggers immediate sync
- [ ] Connection status updates to 'error' on auth failure

---

## Phase 3: Dashboard & Analytics (Week 3)

**Goal**: Core dashboard with real data visualization.
**Deliverable**: Functional dashboard showing real spend data with charts, breakdowns, and drill-down tables.

### 3.1 Demo Seed Script

- [ ] Create `scripts/seed-demo.ts`:
  - [ ] Generate 1 organization, 2 users
  - [ ] Generate 3 provider connections (OpenAI, Anthropic, Bedrock) with fake encrypted credentials
  - [ ] Generate 4 teams (Engineering, Marketing, Data Science, Product)
  - [ ] Generate team_provider_mappings for each team
  - [ ] Generate 90 days of usage_records:
    - Realistic model mix: gpt-4o, gpt-4o-mini, claude-sonnet-4, claude-haiku, amazon.titan
    - Daily variation with weekday/weekend patterns
    - Team-attributed records
  - [ ] Generate 90 days of cost_records:
    - Dollar amounts derived from token counts \* model pricing
    - Realistic distribution across teams
  - [ ] Generate budget_alerts (some active, some triggered)
  - [ ] Generate sync_jobs (completed, with timestamps)
- [ ] Add `seed:demo` script to `package.json`
- [ ] Run seed and verify data looks realistic in drizzle-studio

### 3.2 Dashboard Service (SQL Aggregation)

- [ ] Create `lib/services/dashboard.service.ts`:
  - [ ] `getSummary(orgId, period)`:
    - Total spend (sum of cost_records.amount_cents for period)
    - Spend by provider (grouped)
    - Spend by model (grouped, top 10)
    - Spend by team (grouped)
    - Delta vs prior period (percentage change)
  - [ ] `getTimeseries(orgId, period, granularity, groupBy)`:
    - Time-bucketed spend data (daily/weekly/monthly)
    - Grouped by provider, model, or team
    - Returns array of series with name + data points [{date, amount}]
  - [ ] `getTopModels(orgId, period, limit)`:
    - Models ranked by cost
    - Include: model name, provider, total cost, total tokens (input + output), request count
    - Sortable columns
  - [ ] `getTeamAnalytics(orgId, teamId, period)`:
    - Team total spend
    - Budget and budget utilization percentage
    - Spend by model (within team)
    - Time-series for team
  - [ ] Optimize queries with proper index usage (verify with EXPLAIN ANALYZE)
  - [ ] Handle period options: 7d, 30d, 90d, MTD (month-to-date), last_month

### 3.3 Dashboard API Routes

- [ ] Create `app/api/v1/dashboard/summary/route.ts` — GET with ?period param
- [ ] Create `app/api/v1/dashboard/timeseries/route.ts` — GET with ?period, ?granularity, ?groupBy
- [ ] Create `app/api/v1/dashboard/top-models/route.ts` — GET with ?period, ?limit
- [ ] Add Zod validation for all query parameters
- [ ] All routes scoped by org_id from session

### 3.4 TanStack Query Hooks (Dashboard)

- [ ] Create `lib/api/client.ts`:
  - [ ] `apiFetch<T>(url, options?)` — typed fetch wrapper
  - [ ] Handles: JSON parsing, 401 → redirect to login, error response → throw ApiError
  - [ ] Adds `Content-Type: application/json` header
- [ ] Create `lib/hooks/use-dashboard.ts`:
  - [ ] `useDashboardSummary(period)` — calls `/api/v1/dashboard/summary`
  - [ ] `useDashboardTimeseries(period, granularity, groupBy)` — calls `/api/v1/dashboard/timeseries`
  - [ ] `useTopModels(period, limit)` — calls `/api/v1/dashboard/top-models`
  - [ ] All use `useQuery` with appropriate `staleTime` (30s) and `refetchInterval` (60s)
- [ ] Create `lib/hooks/use-connections.ts`:
  - [ ] `useConnections()` — list all connections
  - [ ] `useConnection(id)` — single connection detail
  - [ ] `useCreateConnection()` — `useMutation` + invalidate list
  - [ ] `useDeleteConnection()` — `useMutation` + invalidate list
  - [ ] `useTestConnection(id)` — `useMutation`
  - [ ] `useTriggerSync(id)` — `useMutation`
  - [ ] `useSyncJobs(connectionId)` — sync history

### 3.5 Overview Page UI

- [ ] Create `components/dashboard/spend-summary-cards.tsx`:
  - [ ] Total spend card (large number, formatted as $XX,XXX.XX)
  - [ ] Delta vs prior period (green/red percentage badge)
  - [ ] Spend by provider mini-cards (with provider icons)
  - [ ] Current month projection (based on daily average)
- [ ] Create `components/dashboard/spend-by-provider-chart.tsx`:
  - [ ] Pie chart or horizontal bar chart
  - [ ] Color-coded by provider
  - [ ] Hover tooltip with exact amounts
- [ ] Create `components/dashboard/spend-by-model-chart.tsx`:
  - [ ] Horizontal bar chart, sorted by cost descending
  - [ ] Show top 5-8 models, group rest as "Other"
- [ ] Create `components/dashboard/spend-timeseries-chart.tsx`:
  - [ ] Area chart or stacked bar chart
  - [ ] X-axis: dates, Y-axis: dollar amount
  - [ ] Grouped by provider, model, or team (toggle)
  - [ ] Tooltip showing exact values per date
- [ ] Create `components/dashboard/top-models-table.tsx`:
  - [ ] Sortable columns: Model, Provider, Cost, Input Tokens, Output Tokens, Requests
  - [ ] Formatted numbers (tokens with K/M suffixes, dollars with commas)
  - [ ] Pagination for >10 models
- [ ] Create period selector component (7d / 30d / 90d / MTD dropdown)
- [ ] Create group-by toggle component (Provider / Model / Team)
- [ ] Wire `app/(dashboard)/overview/page.tsx`:
  - [ ] Fetch data via TanStack Query hooks
  - [ ] Loading skeletons while data fetches
  - [ ] Layout: summary cards at top, charts in grid, table below
  - [ ] Period selector and group-by toggle in header area

### 3.5 Connection Detail Page Enhancement

- [ ] Update `app/(dashboard)/connections/[connectionId]/page.tsx`:
  - [ ] Show connection-specific usage/cost data in a data table
  - [ ] Filters: model, date range
  - [ ] Pagination
  - [ ] Error state display with last_error message
  - [ ] "Re-enter Credentials" button for error state

### 3.6 Phase 3 Verification

- [ ] Run seed script: `pnpm seed:demo`
- [ ] Overview page loads with summary cards showing realistic data
- [ ] Provider breakdown chart renders correctly
- [ ] Time-series chart shows 30-day trend with grouping toggle
- [ ] Top models table sorts correctly by each column
- [ ] Period selector switches between 7d/30d/90d/MTD
- [ ] Loading skeletons appear while data fetches
- [ ] Connection detail shows per-connection data table

---

## Phase 4: Teams & Cost Attribution (Week 4)

**Goal**: Team management with provider entity mapping and per-team analytics.
**Deliverable**: Teams with provider mappings and per-team cost breakdowns.

### 4.1 Team CRUD

- [ ] Create `lib/services/teams.service.ts`:
  - [ ] `createTeam(orgId, name, slug)` — validate unique slug within org
  - [ ] `listTeams(orgId)` — return all teams with member count
  - [ ] `getTeam(orgId, teamId)` — return team with members and mappings
  - [ ] `updateTeam(orgId, teamId, { name, monthlyBudgetCents })` — partial update
  - [ ] `deleteTeam(orgId, teamId)` — cascade delete memberships and mappings
  - [ ] `addTeamMember(teamId, userId)` — add user to team
  - [ ] `removeTeamMember(teamId, userId)` — remove user from team
- [ ] Create API routes:
  - [ ] `app/api/v1/teams/route.ts` — GET (list), POST (create)
  - [ ] `app/api/v1/teams/[teamId]/route.ts` — GET (detail), PATCH (update), DELETE
  - [ ] `app/api/v1/teams/[teamId]/members/route.ts` — POST (add member)
  - [ ] `app/api/v1/teams/[teamId]/members/[userId]/route.ts` — DELETE (remove member)

### 4.2 Provider Entity Mapping

- [ ] Create provider entity listing endpoint:
  - [ ] `app/api/v1/connections/[connectionId]/entities/route.ts` — GET
  - [ ] Calls adapter.listEntities() — returns projects (OpenAI), workspaces (Anthropic), inference profiles (Bedrock)
  - [ ] Cache results for 5 minutes (avoid repeated API calls)
- [ ] Create mapping API routes:
  - [ ] `app/api/v1/teams/[teamId]/mappings/route.ts` — GET (list), POST (create mapping)
  - [ ] `app/api/v1/teams/[teamId]/mappings/[mappingId]/route.ts` — DELETE (remove mapping)
- [ ] Create `components/teams/team-mapping-dialog.tsx`:
  - [ ] Select connection from dropdown
  - [ ] Load entities for selected connection
  - [ ] Multi-select entities to map to this team
  - [ ] Show already-mapped entities as checked
  - [ ] Save creates/deletes team_provider_mappings
- [ ] On mapping change: enqueue `team:attribute` job to re-attribute existing records

### 4.3 Team Attribution Worker Enhancement

- [ ] Update `worker/workers/team-attribute.worker.ts`:
  - [ ] Support `{ connectionId }` mode (after sync — attribute new records)
  - [ ] Support `{ teamId }` mode (after mapping change — re-attribute all records for team)
  - [ ] Support `{ orgId }` mode (full re-attribution for org — fallback)
  - [ ] Bulk UPDATE with JOINs for efficiency
  - [ ] Log records_attributed count

### 4.4 Team Analytics API

- [ ] Create `app/api/v1/teams/[teamId]/analytics/route.ts` — GET with ?period:
  - [ ] Total spend for team in period
  - [ ] Budget and budget utilization percentage
  - [ ] Spend by model (within team)
  - [ ] Time-series for team (daily spend)
  - [ ] Top API keys / users within team (if data available)

### 4.5 TanStack Query Hooks (Teams)

- [ ] Create `lib/hooks/use-teams.ts`:
  - [ ] `useTeams()` — list all teams
  - [ ] `useTeam(teamId)` — single team with members + mappings
  - [ ] `useCreateTeam()` — `useMutation` + invalidate list
  - [ ] `useUpdateTeam(teamId)` — `useMutation`
  - [ ] `useDeleteTeam(teamId)` — `useMutation` + invalidate list
  - [ ] `useAddTeamMember(teamId)` — `useMutation`
  - [ ] `useRemoveTeamMember(teamId)` — `useMutation`
  - [ ] `useTeamAnalytics(teamId, period)` — calls `/api/v1/teams/:teamId/analytics`
  - [ ] `useTeamMappings(teamId)` — list provider mappings
  - [ ] `useCreateMapping(teamId)` — `useMutation`
  - [ ] `useDeleteMapping(teamId, mappingId)` — `useMutation`
- [ ] Create `lib/hooks/use-entities.ts`:
  - [ ] `useConnectionEntities(connectionId)` — list provider entities for mapping dialog

### 4.6 Teams UI Pages

- [ ] Create `app/(dashboard)/teams/page.tsx` — team list:
  - [ ] `components/teams/team-card.tsx`:
    - Team name, member count
    - Current month spend (large number)
    - Budget utilization bar (green < 80%, yellow 80-100%, red > 100%)
    - Top 3 models used
    - "View Details" link
  - [ ] "Create Team" button → dialog with name and optional budget
  - [ ] Sort teams by spend (highest first)
- [ ] Create `app/(dashboard)/teams/[teamId]/page.tsx` — team detail:
  - [ ] Team info header (name, member count, budget)
  - [ ] "Edit Team" button (name, budget)
  - [ ] "Manage Mappings" button → team-mapping-dialog
  - [ ] `components/teams/team-analytics.tsx`:
    - Spend summary card with budget utilization
    - Spend by model bar chart
    - Time-series chart (daily spend for this team)
  - [ ] Members list with remove button
  - [ ] Provider mappings list (which projects/workspaces are mapped)
- [ ] Create `app/(dashboard)/teams/[teamId]/mappings/page.tsx` — dedicated mapping management

### 4.6 Phase 4 Verification

- [ ] Create a team via UI
- [ ] Add members to team
- [ ] Map an OpenAI project and Anthropic workspace to the team
- [ ] Verify team attribution worker runs and sets team_id on matching records
- [ ] Team analytics page shows correct spend for mapped entities only
- [ ] Budget utilization bar reflects budget vs actual spend
- [ ] Team list page shows all teams ranked by spend
- [ ] Changing a mapping re-triggers attribution and updates team analytics

---

## Phase 5: LiteLLM Connector + Budget Alerts (Week 5)

**Goal**: LiteLLM aggregator integration and budget alerting system.
**Deliverable**: LiteLLM integration working. Budget alerts with email notifications.

### 5.1 LiteLLM Aggregator Adapter

- [ ] Create `lib/providers/litellm.ts` implementing `ProviderAdapter`:
  - [ ] `testCredentials()`:
    - If DB connection string: test PostgreSQL connection
    - If API endpoint: call `/health` or `/spend/logs?limit=1`
  - [ ] `fetchUsage()`:
    - **DB mode**: Query `LiteLLM_SpendLogs` table directly:
      - SELECT model, api_key, user, SUM(prompt_tokens), SUM(completion_tokens), COUNT(\*), date bucket
      - Group by model, api_key, hour
    - **API mode**: Call `GET /spend/logs` with start_date, end_date params
    - Normalize to NormalizedUsageRecord
    - Yield batches
  - [ ] `fetchCosts()`:
    - **DB mode**: Query `LiteLLM_SpendLogs` for `spend` column (already in dollars)
      - GROUP BY model, api_key, DATE(startTime)
    - **API mode**: Call `/spend/tags` or aggregate from `/spend/logs`
    - Convert dollars to integer cents
    - Yield batches
  - [ ] `listEntities()`:
    - List distinct API keys and users from spend logs
    - Return as ProviderEntity[] with type='api_key' or type='user'
- [ ] Update provider_type enum to include 'litellm'
- [ ] Update credentials form for LiteLLM:
  - [ ] Connection type toggle: "Database" vs "API"
  - [ ] Database: PostgreSQL connection string field
  - [ ] API: Endpoint URL + API Key fields
- [ ] Create `tests/fixtures/litellm-spend-logs.json`
- [ ] Create `tests/unit/providers/litellm.test.ts`:
  - [ ] Test DB query result parsing
  - [ ] Test API response parsing
  - [ ] Test dollar-to-cents conversion
  - [ ] Test entity listing

### 5.2 Deduplication Logic

- [ ] Add `source` column to `usage_records` and `cost_records`:
  - [ ] Update Drizzle schema: add `source VARCHAR(20) DEFAULT 'provider'` to both tables
  - [ ] Values: 'provider' (direct API) or 'aggregator' (LiteLLM/Langfuse/etc.)
  - [ ] Run `pnpm db:generate` to create migration
  - [ ] Run `pnpm db:migrate` to apply migration
  - [ ] Update all existing sync workers to set source='provider' on insert
  - [ ] LiteLLM adapter sets source='aggregator' on insert
- [ ] Create `lib/services/deduplication.service.ts`:
  - [ ] When querying for dashboard data, if overlapping sources exist:
    - Check org-level preference (stored in org settings): prefer provider or aggregator per provider type
    - Default: prefer aggregator data (richer per-request detail)
    - Filter out duplicate records from the non-preferred source
  - [ ] Add `source_preference` JSONB column to organizations table (or separate settings table)
- [ ] Add deduplication settings UI in Settings page:
  - [ ] Per-provider dropdown: "Prefer data from: [Direct API] / [LiteLLM]"
  - [ ] Show only when both sources exist for same provider

### 5.3 Budget Alert CRUD

- [ ] Create `lib/services/alerts.service.ts`:
  - [ ] `createAlert(orgId, { teamId?, thresholdCents, period, notifyEmails })` — validate against plan limits
  - [ ] `listAlerts(orgId)` — return all with current spend vs threshold
  - [ ] `getAlert(orgId, alertId)` — detail with trigger history
  - [ ] `updateAlert(orgId, alertId, updates)` — update threshold/emails/status
  - [ ] `deleteAlert(orgId, alertId)`
  - [ ] `evaluateAlert(alertId)` — check current spend vs threshold, return triggered/not
- [ ] Create API routes:
  - [ ] `app/api/v1/alerts/route.ts` — GET (list), POST (create)
  - [ ] `app/api/v1/alerts/[alertId]/route.ts` — GET (detail), PATCH (update), DELETE
  - [ ] `app/api/v1/alerts/[alertId]/history/route.ts` — GET trigger history

### 5.4 Budget Check Worker

- [ ] Update `worker/workers/budget-check.worker.ts`:
  - [ ] Query all active budget_alerts
  - [ ] For each alert:
    - Calculate current-period spend (aggregate cost_records for team or org)
    - Compare to threshold_cents
    - If exceeded AND alert.status != 'triggered':
      - Send email notification
      - Update alert status to 'triggered'
      - Record in trigger history
    - If below threshold AND alert.status == 'triggered':
      - Update alert status to 'resolved' (auto-resolve at period boundary)
  - [ ] Runs hourly via BullMQ cron

### 5.5 Email Notifications

- [ ] Create `lib/email/send.ts`:
  - [ ] `sendEmail({ to, subject, html })` — abstraction layer
  - [ ] If `RESEND_API_KEY` set: use Resend
  - [ ] Else if `SMTP_HOST` set: use Nodemailer
  - [ ] Else: log to console (dev fallback)
- [ ] Create `lib/email/templates/budget-alert.tsx`:
  - [ ] React Email template
  - [ ] Content: team name, budget, current spend, percentage, period
  - [ ] Call to action: "View in Dashboard" link
- [ ] Create `lib/email/templates/invite.tsx`:
  - [ ] Team invite email template (for later use)

### 5.6 TanStack Query Hooks (Alerts)

- [ ] Create `lib/hooks/use-alerts.ts`:
  - [ ] `useAlerts()` — list all alerts with current spend vs threshold
  - [ ] `useAlert(alertId)` — single alert detail
  - [ ] `useCreateAlert()` — `useMutation` + invalidate list
  - [ ] `useUpdateAlert(alertId)` — `useMutation`
  - [ ] `useDeleteAlert(alertId)` — `useMutation` + invalidate list
  - [ ] `useAlertHistory(alertId)` — trigger history

### 5.7 Alerts UI

- [ ] Create `app/(dashboard)/alerts/page.tsx`:
  - [ ] `components/alerts/alert-list.tsx`:
    - Table: Team/Org, Threshold, Current Spend, Status (badge), Period, Actions
    - Status badges: Active (blue), Triggered (red), Resolved (green), Disabled (gray)
    - Edit and Delete buttons per alert
  - [ ] "Create Alert" button → dialog
- [ ] Create `components/alerts/alert-form.tsx`:
  - [ ] Scope: Org-wide or specific team (dropdown)
  - [ ] Threshold amount (dollar input, stored as cents)
  - [ ] Period: Daily / Weekly / Monthly
  - [ ] Notification emails (multi-input, comma-separated)
  - [ ] Validation with Zod

### 5.8 Phase 5 Verification

- [ ] Add LiteLLM connection (using mock data or local LiteLLM Docker instance)
- [ ] Verify LiteLLM data appears in dashboard alongside provider data
- [ ] Verify deduplication: if both OpenAI direct + LiteLLM connected, no double-counting
- [ ] Create a budget alert for a team
- [ ] Verify budget check worker evaluates alerts hourly
- [ ] Verify email sends when threshold exceeded (check console in dev mode)
- [ ] Alert status changes to "triggered" after threshold breach
- [ ] Alert history shows trigger events

---

## Phase 6: Polish & Edge Cases (Week 6)

**Goal**: Production-quality UX with proper error handling, settings, and feature gating.
**Deliverable**: Polished UI ready for real users.

### 6.1 Error Handling & Empty States

- [ ] Create empty state components:
  - [ ] No connections yet → "Connect your first AI provider" with CTA
  - [ ] No teams yet → "Create your first team" with CTA
  - [ ] No data yet (connection added but not synced) → "Data syncing... check back in 15 minutes"
  - [ ] No alerts yet → "Set up budget alerts to control spend"
- [ ] Create error state components:
  - [ ] Connection error banner (top of dashboard): "OpenAI connection failed. Re-enter credentials."
  - [ ] Sync error inline on connection detail page
  - [ ] API error toast notifications
  - [ ] Network error fallback (TanStack Query error boundary)
- [ ] Create loading states:
  - [ ] Skeleton components for: summary cards, charts, tables, team cards
  - [ ] Loading spinner for form submissions
  - [ ] Optimistic updates for CRUD operations (TanStack Query mutations)
- [ ] Create credential re-entry flow:
  - [ ] "Update Credentials" button on connection card when status = 'error'
  - [ ] Opens credential form pre-filled with provider type, clears encrypted creds on save

### 6.2 TanStack Query Hooks (Org & Settings)

- [ ] Create `lib/hooks/use-org.ts`:
  - [ ] `useOrg()` — current org details
  - [ ] `useUpdateOrg()` — `useMutation` (name change)
  - [ ] `useOrgMembers()` — list members
  - [ ] `useInviteMember()` — `useMutation`
  - [ ] `useUpdateMemberRole(userId)` — `useMutation`
  - [ ] `useRemoveMember(userId)` — `useMutation`

### 6.3 Settings Page

- [ ] Create `app/(dashboard)/settings/page.tsx`:
  - [ ] Org name edit (inline or dialog)
  - [ ] Org plan display (free/pro/enterprise)
  - [ ] Deduplication source preferences (from Phase 5)
  - [ ] Danger zone: Delete organization (with confirmation)
- [ ] Create `app/(dashboard)/settings/members/page.tsx`:
  - [ ] Member list table: name, email, role, joined date
  - [ ] Role change dropdown (admin only): owner/admin/member/viewer
  - [ ] Remove member button (admin only, can't remove self if owner)
  - [ ] Invite member form: email + role → sends invite email
- [ ] Create API routes:
  - [ ] `app/api/v1/org/route.ts` — GET (org detail), PATCH (update name)
  - [ ] `app/api/v1/org/members/route.ts` — GET (list), POST (invite)
  - [ ] `app/api/v1/org/members/[userId]/route.ts` — PATCH (role), DELETE (remove)

### 6.4 Responsive Design

- [ ] Sidebar: collapsible on mobile using Sheet (slide-over panel)
- [ ] Dashboard overview: stack cards vertically on mobile, charts full-width
- [ ] Tables: horizontal scroll on mobile
- [ ] Forms/dialogs: full-screen on mobile
- [ ] Test at breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (wide)

### 6.5 Dark Mode

- [ ] Configure Tailwind dark mode (class strategy)
- [ ] Add theme toggle in header (light/dark/system)
- [ ] Store preference in localStorage
- [ ] Verify all components render correctly in dark mode:
  - [ ] Charts (Recharts supports custom colors)
  - [ ] Cards, tables, forms
  - [ ] Sidebar and header
  - [ ] Status badges and alerts

### 6.6 Feature Gating

- [ ] Create `lib/features/gates.ts`:
  - [ ] PLAN_LIMITS config (free/pro/enterprise) with: maxConnections, maxTeams, maxAlerts, syncIntervalMinutes, retentionMonths, webhookAlerts, csvExport, sso, auditLog, apiKeys
  - [ ] `checkFeature(orgId, feature)` — returns allowed boolean or limit number
  - [ ] `checkLimit(orgId, resource, currentCount)` — returns allowed boolean
- [ ] Server-side enforcement:
  - [ ] Connection creation: check maxConnections limit
  - [ ] Team creation: check maxTeams limit
  - [ ] Alert creation: check maxAlerts limit
  - [ ] Return 403 with upgrade message when limit hit
- [ ] Client-side UI:
  - [ ] Show current usage vs limit (e.g., "2/3 connections used")
  - [ ] Disable "Add" buttons when at limit
  - [ ] Show upgrade CTA with plan comparison when limit hit
  - [ ] Gray out pro/enterprise features with lock icon

### 6.7 Phase 6 Verification

- [ ] All empty states display correctly when no data exists
- [ ] Connection error state shows retry/re-enter credentials flow
- [ ] Loading skeletons appear on initial page load
- [ ] Settings page: can change org name, manage members, change roles
- [ ] UI is usable on mobile (375px width)
- [ ] Dark mode toggles correctly, all components readable
- [ ] Feature limits enforced: can't create 4th connection on free plan
- [ ] Upgrade CTA appears when limits hit

---

## Phase 7: Self-Hosting, Testing & Launch Prep (Week 7)

**Goal**: Production-ready for both self-hosted and SaaS deployment.
**Deliverable**: Shippable v0.1.0. Docker self-hosting works. Ready for launch.

### 7.1 Docker Production Build

- [ ] Finalize `Dockerfile` (multi-stage):
  - [ ] Base stage: Node 22 Alpine, install deps with pnpm
  - [ ] Builder stage: copy source, run `pnpm build`
  - [ ] App target: copy standalone output + static + public
  - [ ] Worker target: copy compiled worker + lib + node_modules
- [ ] Finalize `docker-compose.yml` (production):
  - [ ] All 4 services with proper env vars
  - [ ] Health checks on all services
  - [ ] Volume mounts for PostgreSQL and Redis data
  - [ ] Restart policies
- [ ] Test from scratch:
  - [ ] `git clone` + `docker compose up` — verify everything starts
  - [ ] Run migrations automatically on app start (or document manual step)
  - [ ] Verify data persists across container restarts

### 7.2 Integration Tests

- [ ] Set up test infrastructure:
  - [ ] `docker-compose.test.yml` for test PostgreSQL + Redis
  - [ ] Vitest config with test database setup/teardown
  - [ ] MSW handlers for all provider APIs
- [ ] Write integration tests:
  - [ ] `tests/integration/api/connections.test.ts`:
    - Create connection → test credentials → verify in DB
    - Delete connection → cascade cleanup
  - [ ] `tests/integration/workers/sync-usage.test.ts`:
    - Full pipeline: connection → sync job → mock API → usage_records in DB
    - Test for each provider type
  - [ ] `tests/integration/api/dashboard.test.ts`:
    - Seed data → query summary endpoint → verify aggregation correctness
    - Test period filtering
    - Test groupBy options
  - [ ] `tests/integration/workers/budget-check.test.ts`:
    - Seed data + alert → run budget check → verify alert triggered
  - [ ] `tests/unit/crypto/encryption.test.ts`:
    - Encrypt → decrypt round-trip
    - Different org IDs produce different ciphertext
    - Tampered ciphertext fails decryption

### 7.3 Security Hardening

- [ ] Rate limiting on auth endpoints:
  - [ ] Login: 5 attempts per IP per 15 minutes
  - [ ] Signup: 3 per IP per hour
  - [ ] Use Redis-based rate limiter
- [ ] Input sanitization:
  - [ ] Zod validation on all API inputs (already done per-route, verify completeness)
  - [ ] No raw SQL — verify all queries use Drizzle parameterization
  - [ ] Connection string validation (prevent SSRF in LiteLLM DB mode)
- [ ] Encryption verification:
  - [ ] Inspect database directly: all credentials_encrypted values are base64 ciphertext
  - [ ] Verify ENCRYPTION_MASTER_KEY rotation strategy (document, don't implement yet)
- [ ] CSRF: verify NextAuth handles this via session tokens
- [ ] Security headers: Content-Security-Policy, X-Frame-Options, etc. in next.config.ts
- [ ] Dependency audit: `pnpm audit`

### 7.4 Demo Seed Script (Finalize)

- [ ] Update `scripts/seed-demo.ts` to generate convincing data:
  - [ ] 90 days of data with realistic patterns
  - [ ] Weekday vs weekend variation
  - [ ] Gradual spend increase over time (realistic growth)
  - [ ] A cost spike in week 6 (for demo storytelling)
  - [ ] One triggered budget alert
  - [ ] At least one connection in error state
- [ ] Verify dashboard looks compelling with seed data (screenshot-worthy)

### 7.5 Documentation & Repo Setup

- [ ] Create `docs/self-hosting.md`:
  - [ ] Prerequisites (Docker, Docker Compose)
  - [ ] Step-by-step setup guide
  - [ ] Environment variable reference (every var explained)
  - [ ] How to generate ENCRYPTION_MASTER_KEY
  - [ ] How to set up Google OAuth (optional)
  - [ ] How to configure email (Resend or SMTP)
  - [ ] Upgrading guide
  - [ ] Troubleshooting common issues
- [ ] Create `docs/adding-a-provider.md`:
  - [ ] How the ProviderAdapter interface works
  - [ ] Step-by-step guide to contributing a new connector
  - [ ] Testing requirements
- [ ] Update `.env.example` with all variables + comments
- [ ] Create comprehensive README.md:
  - [ ] Product description and screenshot
  - [ ] Quick start (docker compose up)
  - [ ] Feature list
  - [ ] Architecture diagram (text-based)
  - [ ] Supported providers
  - [ ] Contributing guide
  - [ ] License
- [ ] Take screenshots of dashboard with seed data for README
- [ ] Set up GitHub repository:
  - [ ] `.github/workflows/ci.yml`: lint, typecheck, unit tests, integration tests
  - [ ] `.github/ISSUE_TEMPLATE/` (bug report, feature request)
  - [ ] `.github/PULL_REQUEST_TEMPLATE.md`
  - [ ] `CONTRIBUTING.md`
  - [ ] `LICENSE` (choose AGPL-3.0 or BSL-1.1)
- [ ] Tag `v0.1.0` release

### 7.6 Pre-Launch Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] `docker compose up` from clean clone works
- [ ] All 4 connectors work with mock data
- [ ] Credential encryption verified (DB shows only ciphertext)
- [ ] Rate limiting on auth endpoints works
- [ ] All empty states, error states, loading states work
- [ ] Mobile responsive at 375px
- [ ] Dark mode works
- [ ] Feature gating enforced on free tier
- [ ] Demo seed script produces compelling dashboard
- [ ] README complete with screenshots
- [ ] Self-hosting docs complete
- [ ] CI pipeline green
- [ ] No `pnpm audit` critical vulnerabilities
- [ ] Performance: dashboard loads in <2s with 90 days of data

---

## Phase 8: Real API Validation (Week 8 — Optional)

**Goal**: Validate against real provider APIs.
**Cost**: ~$15-25 total.

### 8.1 Set Up Test Accounts

- [ ] OpenAI: Create org, generate Admin API key, make ~$5 of API calls across 2 projects
- [ ] Anthropic: Create org, generate Admin API key, make a few calls across 2 workspaces
- [ ] AWS Bedrock: Create AWS account (free tier), enable Bedrock in us-east-1, make a few model calls
- [ ] LiteLLM: `docker run litellm` locally, route test calls through it

### 8.2 End-to-End Validation

- [ ] Add real OpenAI connection → verify usage data syncs within 15 min
- [ ] Add real Anthropic connection → verify cost data appears in dashboard
- [ ] Add real Bedrock connection → verify CloudWatch metrics + Cost Explorer data
- [ ] Add LiteLLM connection → verify spend logs imported
- [ ] Create team, map real provider project → verify per-team breakdown
- [ ] Set budget alert → verify email fires
- [ ] Verify deduplication works with real overlapping data
- [ ] Compare our numbers to provider dashboards (accuracy check)

### 8.3 Fix Discrepancies

- [ ] Document any API response shape differences from fixtures
- [ ] Update adapters if real responses differ from docs
- [ ] Update fixtures to match real data
- [ ] Re-run unit tests with corrected fixtures

---

## Phase 9: GTM — Build Community (Months 1-3 post-launch)

**Goal**: Open-source launch, initial community building, first users.

### 9.1 Launch Prep

- [ ] Choose open-source license (AGPL-3.0 recommended for copyleft protection)
- [ ] Set up landing page (can be GitHub README or a simple site)
- [ ] Write launch blog post: "Why we built an open-source AI FinOps platform"
- [ ] Prepare Hacker News "Show HN" post (concise, problem-focused, link to repo)
- [ ] Prepare Product Hunt launch assets (logo, screenshots, tagline)
- [ ] Record a 2-minute demo video

### 9.2 Distribution

- [ ] Publish to GitHub (public repo)
- [ ] Submit to Hacker News (Show HN)
- [ ] Post on Reddit: r/finops, r/devops, r/selfhosted, r/ChatGPT, r/LocalLLaMA
- [ ] Post on Dev.to / Hashnode / Medium:
  - [ ] "How to track your AI spend across OpenAI, Anthropic, and AWS Bedrock"
  - [ ] "We built an open-source alternative to Vantage for AI costs"
- [ ] Share in FinOps Foundation Slack/community
- [ ] Twitter/X thread about the problem and solution
- [ ] LinkedIn posts targeting FinOps practitioners

### 9.3 Community Building

- [ ] Set up GitHub Discussions for community Q&A
- [ ] Create Discord or Slack community for users
- [ ] Respond to all GitHub issues within 24 hours
- [ ] Write "Adding a Provider" contributor guide
- [ ] Identify and reach out to potential community contributors
- [ ] Add "Contributors Welcome" badges and good-first-issue labels

---

## Phase 10: GTM — Early Adopters & Revenue (Months 3-6)

**Goal**: First paying customers, testimonials, case studies.

### 10.1 Early Adopter Program

- [ ] Offer free Pro tier to first 20 companies for 3 months
- [ ] Require: 30-minute onboarding call + written testimonial at end
- [ ] Direct outreach to 50 FinOps practitioners on LinkedIn
- [ ] Attend FinOps meetups (virtual or local)
- [ ] Partner with LiteLLM / Langfuse for co-marketing

### 10.2 Monetization Setup

- [ ] Integrate Stripe for Pro tier billing ($99/mo per org)
- [ ] Implement license key system for self-hosted Pro (or honor system initially)
- [ ] Set up customer onboarding flow (guided setup wizard)
- [ ] Create pricing page on landing site

### 10.3 Product Iteration

- [ ] Collect feedback from early adopters (what's missing, what's confusing)
- [ ] Prioritize top 3 feature requests
- [ ] Add Langfuse aggregator connector (v0.2)
- [ ] Add Helicone aggregator connector (v0.3)
- [ ] Add Google Vertex AI / Azure OpenAI provider connectors
- [ ] CSV/PDF export (Pro feature)
- [ ] Webhook alerts to Slack (Pro feature)

### 10.4 Content & Thought Leadership

- [ ] Publish "State of AI Spend" report (anonymized benchmarks from users)
- [ ] Write case studies from early adopters
- [ ] Create comparison pages: "vs Helicone", "vs Vantage", "vs building internally"
- [ ] Submit talks to FinOps X, KubeCon, AI conferences

---

## Summary: Phase Timeline

| Phase  | Week | Focus            | Key Deliverable                                |
| ------ | ---- | ---------------- | ---------------------------------------------- |
| **0**  | 0    | Pre-Dev Setup    | Git, tooling, types, utils, theme, logging     |
| **1**  | 1    | Foundation       | Auth + DB + UI shell + connections             |
| **2**  | 2    | Sync Pipeline    | 3 provider adapters + BullMQ workers           |
| **3**  | 3    | Dashboard        | Charts + analytics + seed data                 |
| **4**  | 4    | Teams            | Team CRUD + entity mapping + attribution       |
| **5**  | 5    | LiteLLM + Alerts | 4th connector + budget alerts + email          |
| **6**  | 6    | Polish           | Error handling + settings + dark mode + gating |
| **7**  | 7    | Launch Prep      | Docker + tests + security + docs + v0.1.0      |
| **8**  | 8    | Validation       | Real API testing (~$15-25)                     |
| **9**  | M1-3 | Community        | Open-source launch + distribution              |
| **10** | M3-6 | Revenue          | Early adopters + Stripe + iteration            |
