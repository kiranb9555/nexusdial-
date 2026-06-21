# NexusDial

Multi-tenant virtual phone number SaaS backend with an AI-powered contact
intelligence layer. Node.js 20+ / TypeScript (strict), Express, PostgreSQL +
Prisma, Redis, BullMQ, Socket.io, Winston, Jest.

> Module 1 (Backend API) is implemented end-to-end. The React Native client is
> not built here; see [Mobile / JWT storage](#mobile--jwt-storage) for the
> security expectation it must follow.

## Quick start

```bash
# 1. Install
npm install

# 2. Start Postgres + Redis
docker compose up -d

# 3. Configure env
cp .env.example .env
# Generate strong JWT secrets, e.g.:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Migrate + seed the number pool
npm run prisma:deploy        # or: npx prisma migrate dev
npm run db:seed

# 5. Run (server runs the intelligence worker in-process by default)
npm run dev                  # ts-node-dev
# or
npm run build && npm start

# Run the worker as a separate process instead:
npm run worker
```

Health check: `GET http://localhost:3000/health`

## Architecture

```
src/
  config/env.ts            # Zod-validated environment loader
  lib/                     # logger, prisma, redis, socket.io, errors, validation
  middleware/              # validateToken, Zod validate, Redis rate limiting, error handler
  queue/                   # BullMQ queue + dedicated connection
  workers/                 # intelligence worker (BullMQ consumer)
  services/ai/             # extractor interface (OpenAI | mock) + Zod schema + processor
  services/transcript.ts   # simulated STT (hardcoded Hinglish voicemails)
  modules/
    auth/                  # OTP send/verify/refresh, JWT
    numbers/               # virtual number provisioning from pool
    simulate/              # call simulation endpoint
    contacts/              # contacts CRUD + timeline + soft delete
    analytics/             # MSME dashboard summary
```

## API

All protected routes require `Authorization: Bearer <accessToken>` and are rate
limited to **200 req / 15 min / tenant**. Every tenant-scoped query filters by
`tenantId = req.tenant.id`.

### Auth (OTP only — no passwords)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/send-otp` | `{ mobile }`. 6-digit OTP, 5-min TTL in Redis, logged (simulated SMS). Max **3 / 10 min / mobile**. Returns `devOtp` outside production. |
| POST | `/api/auth/verify-otp` | `{ mobile, otp, businessName? }`. Returns access (15m) + refresh (30d) tokens. First verify provisions the tenant. |
| POST | `/api/auth/refresh` | `{ refreshToken }`. Rotates refresh token (old one revoked), returns new access token. |

### Virtual numbers
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/numbers` | List tenant numbers. |
| POST | `/api/numbers` | `{ label? }`. Claims an unassigned `NumberPool` row atomically. Logs a structured WARNING ("Slack alert") when the pool drops below 5. |
| PATCH | `/api/numbers/:id` | `{ label?, isActive? }`. |

### Call simulation
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/simulate/call` | `{ virtualNumberId, callerMobile, direction, durationSec, hasVoicemail }`. Creates a `CallRecord` (`ANSWERED`, or `MISSED` when `durationSec=0`). If `hasVoicemail`, enqueues a BullMQ job. Emits `call_event` to the tenant's Socket.io room. |

### Contacts
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/contacts` | Paginated; filters: `tag`, `minCallCount`, `firstSeenFrom`, `firstSeenTo`. |
| GET | `/api/contacts/:id` | Detail + last 5 call records. |
| PATCH | `/api/contacts/:id` | `{ name?, addTags?, removeTags? }`. |
| GET | `/api/contacts/:id/timeline` | All call records, chronological. |
| DELETE | `/api/contacts/:id` | Soft delete (`isDeleted`, retained 30 days). |

### Analytics
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/analytics/summary` | `totalCallsToday`, `missedCallsToday`, `newContactsThisWeek`, `topCallers` (top 5 by callCount), `sentimentBreakdown`. Tenant-scoped. |

## AI Contact Intelligence pipeline

When a voicemail job runs in the BullMQ worker:

1. **Transcription (simulated):** a transcript is chosen from hardcoded
   Hindi/English scripts (`services/transcript.ts`). No real STT API.
2. **AI extraction:** `services/ai/ai.service.ts` calls OpenAI (`gpt-3.5-turbo`)
   to extract `{ name, intent (≤20 words), sentiment, callbackRequested }`. The
   model output is validated with **Zod** before use. With `AI_PROVIDER=mock`
   (default) or no API key, a deterministic offline extractor is used so the
   pipeline runs without cost.
3. **Contact intelligence:** the caller is looked up by `callerMobile + tenantId`;
   created if absent (with extracted name), else `callCount` incremented; the
   extracted intent is added as a tag if new.
4. **Persist:** `IntelligenceJob` → `DONE` with `transcript` + `extractedData` +
   `processingMs`; `CallRecord.aiSummary` set to a one-line summary.
5. **Notify:** emits `intelligence_ready` to the tenant's Socket.io room.

**Fault tolerance:** the raw transcript is saved **before** the AI call, so it is
never lost. On AI failure the job is marked `FAILED` (with `lastError`) and
retried up to `INTELLIGENCE_MAX_ATTEMPTS` (default 3 = initial + 2 retries).
Failed jobs are **not** auto-removed (`removeOnFail: false`) so they remain
inspectable.

### callCount: exactly-once
`callCount` is incremented exactly once per call. Calls **without** a voicemail
increment at ingestion (no worker runs); calls **with** a voicemail increment in
the worker's contact-intelligence step. See `incrementOrCreateContact`.

## Security & conventions

- **Tenant isolation:** every query on `CallRecord`, `Contact`, `VirtualNumber`,
  `WalletTx`, `IntelligenceJob` filters by `tenantId`. Cross-tenant access
  returns `404`.
- **Zod validation:** every POST/PATCH body (and query/params) has a schema;
  unknown fields are stripped before reaching controllers.
- **Rate limiting:** `express-rate-limit` backed by Redis — 3 OTP / 10 min /
  mobile and 200 req / 15 min / tenant.
- **Error codes:** consistent shape `{ error: { code, message, details? } }` with
  machine-readable codes (`ND_4001`, `ND_4029`, …). No stack traces in responses.
- **No secrets in code:** all keys in `.env` (git-ignored); `.env.example`
  committed with empty values.
- **Strict TypeScript:** `strict` on, no `any`, no `ts-ignore`, ESLint enforces
  `no-console` (Winston JSON logging only).
- **Input sanitation:** phone-number format validation and length limits on all
  text fields; Prisma parameterises all queries.

## Mobile / JWT storage

The React Native app must store JWTs with **`react-native-keychain`**, never
`AsyncStorage`. This backend issues short-lived access tokens (15m) and
rotating refresh tokens (30d) to support that flow.

## Testing

```bash
npm test          # Jest: unit + integration (needs docker compose services up)
npm run lint
npm run typecheck
```

Integration tests run against a dedicated `nexusdial_test` database (auto-created
from the dockerised Postgres) and Redis DB index 1. Coverage includes the OTP
flow, OTP rate limiting, number provisioning, call simulation, contacts CRUD,
analytics, tenant isolation, and the AI pipeline (success + failure paths).

## Environment variables

See [`.env.example`](./.env.example). Key ones: `DATABASE_URL`, `REDIS_URL`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AI_PROVIDER` (`openai`|`mock`),
`OPENAI_API_KEY`, `INTELLIGENCE_MAX_ATTEMPTS`.
