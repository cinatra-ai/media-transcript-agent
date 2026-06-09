# External Integrations

**Analysis Date:** 2026-06-09

## APIs & External Services

**LLM Bridge (Cinatra Platform):**
- Service: Cinatra `/api/llm-bridge` — internal platform route that abstracts LLM provider routing
  - SDK/Client: HTTP POST via Cinatra `ApiNode` (declared in `cinatra/oas.json`, node id `call_bridge`)
  - Auth: Platform-managed (no explicit auth token in agent payload)
  - Endpoint template: `{{CINATRA_BASE_URL}}/api/llm-bridge`
  - Payload fields: `user` (prompt string), `agent_id`, `media.url`, `media.kind`, `cinatra_llm` block

**Google Gemini:**
- Service: Gemini 2.5 Flash — preferred LLM for media transcription
  - Routing: Declared via `cinatra_llm.preferredProvider: "gemini"` and `preferredModel: "gemini-2.5-flash"` in `cinatra/oas.json`
  - Capability required: `media_input` (enables native video/audio understanding)
  - Access: Indirect — the Cinatra bridge selects and calls Gemini; this agent never calls the Gemini API directly
  - Auth: Platform-managed

**YouTube:**
- Service: YouTube video URLs accepted as `mediaUrl` input
  - Ingest method: YouTube watch URLs passed as text to `adapter.generate` inside the bridge (documented in `skills/transcribe-media/SKILL.md`)
  - No YouTube Data API key required by this agent — native LLM media handling is used

## Data Storage

**Databases:**
- Not applicable — this is a stateless transcription flow with no persistence layer

**File Storage:**
- Non-YouTube media URLs: Fetched and uploaded by the bridge via `adapter.generateFromMediaFile` (documented in `skills/transcribe-media/SKILL.md`); storage is bridge-side, not managed by this agent

**Caching:**
- Not detected

## Authentication & Identity

**Auth Provider:**
- Platform-managed — the Cinatra platform handles all authentication for both the `/api/llm-bridge` call and downstream LLM access. No auth configuration is present in this agent package.

## Monitoring & Observability

**Error Tracking:**
- Not detected — no error tracking SDK or configuration present

**Logs:**
- Not detected — the CI gate (`extension-kind-gate.mjs`) logs to stdout/stderr; no application-level logging configured

## CI/CD & Deployment

**Hosting:**
- Cinatra Agent Platform marketplace (published as `@cinatra-ai/media-transcript-agent`)

**CI Pipeline:**
- `extension-kind-gate.mjs` — zero-dependency Node.js script run in standalone CI
  - Validates `cinatra/oas.json` parses correctly
  - Checks for retired/banned CRM primitives in LLM-visible prompt strings
  - Exit code 0 = pass, 1 = violations
  - Usage: `node extension-kind-gate.mjs --package-root .`
- `.github/` directory present — GitHub Actions workflows exist (contents not explored further)

## Environment Configuration

**Required env vars / runtime variables:**
- `CINATRA_BASE_URL` — injected by the Cinatra platform at runtime; used to construct the `/api/llm-bridge` URL in `cinatra/oas.json`

**Secrets location:**
- `.npmrc` present — likely contains scoped registry token for `@cinatra-ai` packages (contents not read)

## Webhooks & Callbacks

**Incoming:**
- Not applicable — this agent is invoked synchronously by the Cinatra platform dispatcher

**Outgoing:**
- Single outbound call: `POST {{CINATRA_BASE_URL}}/api/llm-bridge` (declared in `cinatra/oas.json` ApiNode `call_bridge`)

## Agent Flow Data Contract

**Inputs** (defined in `cinatra/oas.json` StartNode):
- `mediaUrl` (string, required) — audio/video URL or YouTube watch URL
- `title` (string, default `""`, hidden) — optional context for the LLM prompt
- `description` (string, default `""`, hidden) — optional context for the LLM prompt
- `kind` (string, default `""`, hidden) — media kind hint; bridge normalizes empty string to `undefined` for Zod enum validation

**Outputs** (defined in `cinatra/oas.json` EndNode):
- `transcript` (string) — verbatim transcript with `[Speaker N]:` labels
- `kind` (string) — passed through from input

---

*Integration audit: 2026-06-09*
