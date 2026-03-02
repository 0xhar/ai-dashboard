# AI FinOps Platform — Full Product & Implementation Plan

## Context

Organizations are spending $5K-$100K+/month across multiple AI providers (OpenAI, Anthropic, AWS Bedrock, Google Vertex, etc.) and through multiple tools (LiteLLM, Langfuse, Helicone, IDE integrations). Finance teams are manually pulling CSVs from 5+ vendor portals to answer "how much did each team spend on AI this month?" — there is no centralized dashboard for AI cost visibility, team-level chargeback, or budget governance.

This plan defines an **open-source AI FinOps platform** that solves this by polling provider billing APIs (no proxy required, zero code changes) and aggregator tool APIs (LiteLLM, etc.) to provide a single pane of glass for AI spend across all platforms, segmented by team.

**Target**: FinOps/Finance teams at mid-market companies (100-2000 employees)
**GTM**: Open-source core + paid tiers
**MVP scope**: Working product with 4 real integrations (OpenAI, Anthropic, AWS Bedrock, LiteLLM)

---

## 1. Product Vision & Positioning

**Category**: AI FinOps Platform
**One-liner**: "See all your AI spend in one place. By team. Across every provider."

**Key differentiators vs competitors**:

- **No proxy required** — unlike Helicone/Portkey/LiteLLM, we poll billing APIs. Zero code changes, zero latency impact, zero production risk.
- **Finance-first, not developer-first** — built for the person asking "why did AI spend jump 40%?", not for debugging prompts.
- **Aggregator integrations** — works WITH existing tools (LiteLLM, Langfuse, Helicone), not against them. If you already route through LiteLLM, connect it and get all your data.
- **Team chargeback** — map provider projects/workspaces to internal teams automatically. Budget alerts per team.

---

## 2. Target Market & Buyer

| Attribute        | Detail                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| **Company size** | 100-2000 employees (mid-market)                                         |
| **AI spend**     | $5K-$100K/month across 2+ providers                                     |
| **Buyer title**  | VP of Finance, Head of FinOps, Director of Cloud Ops, CFO (smaller cos) |
| **Industries**   | AI-native SaaS, digital agencies, FinTech, healthtech                   |
| **Why them**     | Pain is real, can't justify building internally, 2-4 week sales cycles  |

**Land-and-expand**: Start with FinOps buyer for cost visibility → Engineering VP for optimization → CISO for audit/compliance.

---

## 3. Connector Architecture (Provider + Aggregator)

Two types of connectors, same `ProviderAdapter` interface:

### Provider Connectors (Direct Billing APIs)

| Provider        | Auth                              | Usage API                                                                                     | Cost API                                                           | Team Attribution                                       |
| --------------- | --------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| **OpenAI**      | Admin API key (`sk-admin-...`)    | `/v1/organization/usage/completions` (1min/1hr/1day buckets, group by model/project/key/user) | `/v1/organization/costs` (daily only)                              | Via `project_id`                                       |
| **Anthropic**   | Admin API key (`sk-ant-admin...`) | `/v1/organizations/usage_report/messages` (1min/1hr/1day, group by workspace/model/key)       | `/v1/organizations/cost_report` (Priority Tier costs NOT included) | Via `workspace_id`                                     |
| **AWS Bedrock** | IAM credentials                   | CloudWatch `AWS/Bedrock` metrics (InputTokenCount, OutputTokenCount per model)                | Cost Explorer `GetCostAndUsage` (24h lag, daily)                   | Via Application Inference Profile cost allocation tags |

### Aggregator Connectors (Tool APIs)

| Tool              | Auth                            | Data Source                                               | Advantage                                                                                      |
| ----------------- | ------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **LiteLLM** (MVP) | DB connection string or API key | PostgreSQL `LiteLLM_SpendLogs` table or `/spend/logs` API | Per-request granularity, covers 100+ providers in one connector, team/key attribution built-in |

**Deduplication**: If a user connects both a direct provider AND an aggregator that tracks the same provider, records are tagged with their source. User chooses preferred source per provider to avoid double-counting.

### Adapter Interface

Every connector implements:

```
ProviderAdapter {
  testCredentials()  → validates API key / IAM / DB connection
  fetchUsage()       → async generator yielding NormalizedUsageRecord[]
  fetchCosts()       → async generator yielding NormalizedCostRecord[]
  listEntities()     → returns projects/workspaces/keys for team mapping
}
```

**Critical file**: `lib/providers/types.ts` — the interface contract
**Implementations**: `lib/providers/openai.ts`, `anthropic.ts`, `aws-bedrock.ts`, `litellm.ts`
**Registry**: `lib/providers/registry.ts` — factory function `getAdapter(providerType)`

---

## 4. Tech Stack

| Layer             | Choice                                                    | Why                                                                             |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Framework**     | Next.js 15 (App Router)                                   | Full-stack, server components, API routes, Docker-deployable, massive ecosystem |
| **UI**            | shadcn/ui + Tailwind CSS                                  | Copy-paste components (no lock-in for OSS), finance-ready tables/charts/dialogs |
| **Charts**        | Recharts                                                  | Lightweight, composable, tree-shakeable. Good for time-series + pie/bar         |
| **Data fetching** | TanStack Query                                            | Cache invalidation, background refetch, perfect for polling dashboards          |
| **ORM**           | Drizzle ORM                                               | SQL-first, type-safe, fast runtime, great for aggregation queries               |
| **Database**      | PostgreSQL 16                                             | BRIN indexes for time-series, partitioning for scale, JSON support              |
| **Job Queue**     | BullMQ + Redis 7                                          | Cron scheduling, retries, rate limiting, battle-tested for Node.js              |
| **Auth**          | NextAuth.js v5 (Auth.js)                                  | Email/password + Google OAuth, database sessions, Drizzle adapter               |
| **Encryption**    | AES-256-GCM (Node.js crypto)                              | Provider API keys encrypted at rest with per-org derived keys (HKDF)            |
| **Email**         | React Email + Resend (SaaS) / Nodemailer (self-hosted)    | Budget alert notifications                                                      |
| **Deployment**    | Docker Compose (4 services: app, worker, postgres, redis) | Required for open-source self-hosting                                           |

---

## 5. Database Schema (Key Tables)

All monetary values stored as **integer cents (USD)**. Timestamps UTC.

- **`organizations`** — tenant, plan tier (free/pro/enterprise), encryption key hash
- **`users`** — email, password_hash (nullable for OAuth), avatar
- **`org_memberships`** — user <> org, role (owner/admin/member/viewer)
- **`teams`** — org_id, name, monthly_budget_cents
- **`team_memberships`** — user <> team
- **`provider_connections`** — org_id, provider type, encrypted credentials, sync cursor, status
- **`team_provider_mappings`** — maps team <> provider entity (OpenAI project / Anthropic workspace / Bedrock tag / LiteLLM key)
- **`usage_records`** — BIGSERIAL, connection_id, bucket_start/end/width, model, tokens (input/output/cached), team_id (nullable, resolved by attribution worker). BRIN index on bucket_start. Composite unique constraint for idempotent upserts.
- **`cost_records`** — connection_id, bucket_date (daily), model, amount_cents, team_id. Unique constraint for upserts.
- **`budget_alerts`** — team_id (nullable = org-wide), threshold_cents, period, notify_emails, status
- **`sync_jobs`** — connection_id, sync_type, status, records_synced, error_message

**Critical file**: `lib/db/schema/` — Drizzle schema definitions

---

## 6. System Architecture

```
[Browser] → [Next.js App (API Routes + UI)] → [PostgreSQL]
                      ↓ enqueue                    ↑ read/write
                   [Redis] → [BullMQ Worker Process]
                                    ↓ polls
              [OpenAI] [Anthropic] [Bedrock] [LiteLLM]
```

### Sync Pipeline

1. **Scheduler** (BullMQ cron): Every 15min → enqueue `sync:usage` per active connection. Every 6hr → enqueue `sync:cost`.
2. **Sync Worker**: Load connection → decrypt credentials → determine time window from sync_cursor → call adapter.fetchUsage() → upsert into usage_records → update sync_cursor.
3. **Team Attributor** (post-sync): JOIN new records against team_provider_mappings → SET team_id.
4. **Budget Checker** (hourly cron): Aggregate current-period spend per team → compare thresholds → send email alerts.

### Credential Encryption

- Master key from env var `ENCRYPTION_MASTER_KEY`
- Per-org key derived via HKDF: `HKDF(master_key, salt=org_id, info="provider-credentials")`
- AES-256-GCM encrypt/decrypt with random IV per credential
- **Critical file**: `lib/crypto/encryption.ts`

---

## 7. MVP Features

### Core (all tiers)

- [x] Email/password + Google OAuth signup/login
- [x] Organization + team management
- [x] Add provider connections (OpenAI, Anthropic, Bedrock, LiteLLM) with credential validation
- [x] Automatic background sync (15min usage, 6hr costs)
- [x] Unified dashboard: total spend, spend by provider, spend by model, time-series charts
- [x] Team cost attribution: map provider projects/workspaces to teams
- [x] Per-team analytics: spend, budget utilization, model breakdown
- [x] Budget alerts with email notifications
- [x] Sync status monitoring (last sync, errors, history)
- [x] Docker Compose self-hosting

### Open-Source Limits (Free Tier)

- Up to 3 provider connections, 3 teams, 5 alerts
- 15-minute sync interval, 6-month data retention
- Email alerts only

### Pro ($99/mo per org)

- Unlimited connections/teams/alerts
- 5-minute sync, 24-month retention
- Webhook alerts (Slack, PagerDuty), CSV/PDF export

### Enterprise (custom pricing)

- SSO/SAML, RBAC with viewer role, audit log
- API access with API keys, anomaly detection
- Chargeback reports, on-prem deployment support, SLA

**Critical file**: `lib/features/gates.ts` — plan limits and feature checks

---

## 8. Implementation Timeline (7 Weeks)

### Week 1: Foundation

- Project scaffolding (Next.js, Drizzle, shadcn/ui, BullMQ, Docker Compose)
- Full database schema + initial migration
- NextAuth v5 setup (credentials + Google OAuth, signup flow)
- Dashboard shell (sidebar, header, placeholder pages)
- Provider connection CRUD with AES-256-GCM credential encryption + test endpoint

**Deliverable**: User can sign up, log in, navigate dashboard, add/test a provider connection.

### Week 2: Provider Sync Pipeline

- `ProviderAdapter` interface + adapter registry
- OpenAI adapter (fetchUsage, fetchCosts, listEntities) + unit tests
- Anthropic adapter + unit tests
- AWS Bedrock adapter (CloudWatch + Cost Explorer) + unit tests
- BullMQ worker process: sync-usage, sync-cost workers with upsert logic, scheduler

**Deliverable**: Adding a connection automatically syncs data every 15 minutes. Sync status visible in UI.

### Week 3: Dashboard & Analytics

- Dashboard service: SQL aggregation queries (total spend, by provider, by model, time-series)
- Overview page: spend summary cards, provider breakdown chart, time-series chart, top models table
- Period selector (7d/30d/90d/MTD), group-by toggle (provider/model/team)
- Connection detail page: sync history, error states, raw data table

**Deliverable**: Functional dashboard with real data visualization.

### Week 4: Teams & Cost Attribution

- Team CRUD (create/edit/delete, member management)
- Provider entity mapping UI (map OpenAI projects / Anthropic workspaces / Bedrock tags to teams)
- Team attribution worker (bulk UPDATE team_id on records matching mappings)
- Per-team analytics page (spend, budget utilization, model breakdown, time-series)
- Team list page (cards with spend, budget bar, top models)

**Deliverable**: Teams with provider mappings and per-team cost breakdowns.

### Week 5: LiteLLM Connector + Budget Alerts

- LiteLLM aggregator adapter (connect to LiteLLM PostgreSQL or API, fetch spend logs, normalize)
- LiteLLM entity listing (API keys, users) for team mapping
- Deduplication logic for overlapping provider + aggregator data
- Budget alert CRUD + UI (thresholds, email recipients)
- Budget check worker (hourly cron, send email via React Email)
- Alert trigger history

**Deliverable**: LiteLLM integration working. Budget alerts with email notifications.

### Week 6: Polish & Edge Cases

- Error handling: connection failure banners, empty states, loading skeletons
- Settings page: org name, member management (invite, remove, role change)
- Responsive design pass, dark mode
- Feature gating implementation (plan limits enforced server-side, upgrade CTAs in UI)

**Deliverable**: Polished, production-quality UI.

### Week 7: Self-Hosting, Testing & Launch Prep

- Docker: finalize multi-stage Dockerfile, test `docker compose up` from scratch
- Integration tests: full sync pipeline per provider with mocked responses
- Security: rate limiting on auth, input sanitization, encryption verification
- Demo seed script (realistic fake data for demos)
- README with screenshots, `docs/self-hosting.md`, `.env.example`
- GitHub repo setup, CI (lint + typecheck + test), tag v0.1.0

**Deliverable**: Shippable v0.1.0. Docker self-hosting works. Ready for launch.

---

## 9. Revenue Model

| Tier           | Price               | Target                                             |
| -------------- | ------------------- | -------------------------------------------------- |
| **Free (OSS)** | $0                  | Individuals, small teams. Acquisition + community. |
| **Pro**        | $99/mo per org      | Growing teams with 3+ AI providers.                |
| **Enterprise** | Custom ($1.5-5K/mo) | Mid-market with compliance needs. $18-60K ACV.     |

**Conservative revenue projections**:

- Months 1-3: $0 (building + launching OSS)
- Months 4-6: 15-25 Pro orgs = $1.5-2.5K MRR
- Months 7-12: 50-80 Pro + 2-3 Enterprise = $8-15K MRR
- Year 2: $30-50K MRR target ($360-600K ARR)

---

## 10. GTM Strategy

### Phase 1: Build Community (Months 1-3)

- Launch open-source on GitHub (Apache 2.0 or AGPL-3.0)
- Hacker News "Show HN" post
- FinOps Foundation community engagement
- Dev.to / Medium technical content ("How we track $50K/mo AI spend across 5 providers")
- Reddit r/finops, r/devops, r/ChatGPT

### Phase 2: Early Adopters (Months 3-6)

- Product Hunt launch
- Direct outreach to FinOps practitioners on LinkedIn
- Offer free Pro tier to first 20 companies for testimonials
- Build case studies from early adopters

### Phase 3: Scale (Months 6-12)

- Content marketing (AI cost benchmarks, industry reports)
- Integration partnerships (co-market with LiteLLM, Langfuse)
- FinOps Foundation partnership/certification
- Conference presence (FinOps X, KubeCon)

---

## 11. Risks & Mitigations

| Risk                                    | Impact                       | Mitigation                                                                                          |
| --------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| Provider APIs change/break              | Connector stops working      | Automated health checks, community maintenance, fast patch cycle                                    |
| Providers build this feature themselves | Reduces need for our product | Multi-provider is our moat — no single provider will aggregate competitors' data                    |
| Vantage/CloudZero adds deep AI tracking | Direct competition           | Move faster, stay open-source, build community moat. They're cloud-cost-first, we're AI-cost-first. |
| Mid-market too small to pay             | Low ACV                      | Validate with 10 customer interviews before investing in enterprise features                        |
| Anthropic Priority Tier costs excluded  | Incomplete data              | Display clear warning in UI. Monitor API updates. Reach out to Anthropic team.                      |
| AWS Bedrock 24h cost lag                | Stale data                   | Show "costs may be delayed up to 24h" badge. Use CloudWatch tokens for near-real-time estimates.    |

---

## 12. Project Directory Structure

```
ai-dashboard/
├── app/
│   ├── (auth)/login, signup
│   ├── (dashboard)/overview, teams, connections, alerts, settings
│   └── api/v1/ (org, teams, connections, dashboard, alerts, sync)
├── components/ (ui/, dashboard/, teams/, connections/, alerts/, layout/)
├── lib/
│   ├── db/ (schema/, migrations/, index.ts)
│   ├── auth/ (config.ts, middleware.ts)
│   ├── providers/ (types.ts, registry.ts, openai.ts, anthropic.ts, aws-bedrock.ts, litellm.ts)
│   ├── services/ (connections, teams, dashboard, alerts, sync)
│   ├── crypto/ (encryption.ts, key-derivation.ts)
│   ├── features/ (gates.ts)
│   └── email/ (send.ts, templates/)
├── worker/ (index.ts, scheduler.ts, queues.ts, workers/)
├── tests/ (unit/, integration/, fixtures/)
├── docker-compose.yml
├── Dockerfile (multi-stage: app + worker targets)
└── drizzle.config.ts
```

---

## 13. Verification & Testing

### Testing Strategy: Mocks First, Real APIs in Week 6

**No real provider credentials needed for weeks 1-5.** Development and testing use JSON fixtures, mock HTTP servers, and a demo seed script.

### Layer 1: Fixture-Based Unit Tests (Week 2 onward)

- JSON fixtures in `tests/fixtures/` copied from provider API documentation
- Tests each adapter's parsing, normalization, pagination, and edge cases
- Tests encryption round-trip, dashboard aggregation queries
- **No credentials required**

### Layer 2: Mock HTTP Integration Tests (Week 2 onward)

- `msw` (Mock Service Worker) handlers in `tests/mocks/` mimic each provider API
- Full pipeline tests: worker → mock API → upsert → attribution → dashboard query
- Runs against real PostgreSQL + Redis in Docker (`docker compose up postgres redis`)
- **No credentials required**

### Layer 3: Demo Seed Script (Week 3 onward)

- `pnpm run seed:demo` generates 90 days of realistic synthetic data
- 3 mock connections, 4 teams, realistic model mix, triggered/active alerts
- Used for UI development, demos, screenshots, and investor pitches
- **No credentials required**

### Layer 4: Real API Validation (Week 6)

- Set up test accounts: OpenAI ($5-10), Anthropic ($5-10), Bedrock ($2-5), LiteLLM (free Docker)
- Total cost: ~$15-25
- Validates real API response shapes match fixtures
- End-to-end: add real connection → verify data syncs → verify dashboard

### End-to-End Verification Checklist (Week 6-7)

1. `docker compose up` from clean state — all 4 services start
2. Sign up, create org, navigate dashboard shell
3. Add OpenAI connection with real admin key → data syncs within 15 min
4. Add Anthropic connection → data appears in unified dashboard
5. Create team, map OpenAI project to team → per-team breakdown works
6. Set budget alert → email fires when threshold exceeded
7. Add LiteLLM connection → aggregator data appears, no double-counting
8. Verify self-hosted Docker deployment matches SaaS behavior

### Pre-Launch Checklist

- [ ] All 4 connectors tested with real accounts
- [ ] Docker self-hosting works from README instructions alone
- [ ] Credential encryption verified (DB inspection shows only ciphertext)
- [ ] Rate limiting on auth endpoints verified
- [ ] Empty states, error states, loading states all handled
- [ ] Mobile responsive + dark mode
- [ ] README with screenshots
- [ ] Demo seed script produces realistic, convincing data

---

## 14. Competitive Landscape Summary

| Competitor            | Approach                      | Our Advantage                                               |
| --------------------- | ----------------------------- | ----------------------------------------------------------- |
| **Helicone** (YC W23) | Proxy, dev-focused, OSS       | We're no-proxy, finance-first. No code changes needed.      |
| **Portkey**           | AI Gateway proxy, 250+ models | We work WITH Portkey, not against it. No latency added.     |
| **LiteLLM**           | SDK + proxy, self-hosted      | We integrate LiteLLM as a data source. Complementary.       |
| **Langfuse**          | Async SDK, tracing-first      | We're cost-first, not observability-first. Different buyer. |
| **Vantage**           | API polling, cloud FinOps     | We're AI-native. They bolt AI onto cloud cost.              |
| **Datadog LLM Obs**   | SDK spans, expensive          | We're open-source. 10x cheaper. Purpose-built for cost.     |
| **Mavvrik**           | Broad IT FinOps, $6.2M seed   | We're focused. AI-only. Open-source community moat.         |

### Key Market Gaps We Exploit

1. **Team-level chargeback without a proxy** — no tool does this via billing APIs alone
2. **Aggregator integrations** — no tool pulls from LiteLLM/Langfuse/Helicone as data sources
3. **Finance-first UX** — all current tools are built for developers
4. **Open-source with enterprise path** — fills the gap between free self-hosted tools and expensive SaaS
