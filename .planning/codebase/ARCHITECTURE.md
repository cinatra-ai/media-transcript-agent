<!-- refreshed: 2026-06-09 -->
# Architecture

**Analysis Date:** 2026-06-09

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     Caller / Dispatcher                      │
│          (provides mediaUrl + optional title/kind)           │
└────────────────────────────┬────────────────────────────────┘
                             │ start_conversation(inputs=...)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   StartNode — "Inputs"                       │
│         `cinatra/oas.json` ($referenced_components.start)    │
│  required: mediaUrl | hidden: title, description, kind       │
└────────────────────────────┬────────────────────────────────┘
                             │ DataFlowEdges (4 fields)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│          ApiNode — "Transcribe via /api/llm-bridge"          │
│         `cinatra/oas.json` ($referenced_components.          │
│                           call_bridge)                       │
│  POST {{CINATRA_BASE_URL}}/api/llm-bridge                    │
│  • Jinja user prompt  →  Gemini 2.5 Flash (media_input cap) │
│  • YouTube URL → text path via adapter.generate              │
│  • Other URL  → fetch+upload via adapter.generateFromMediaFile│
└────────────────────────────┬────────────────────────────────┘
                             │ text → transcript
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              EndNode — "End"                                 │
│         `cinatra/oas.json` ($referenced_components.end)      │
│  outputs: transcript (string), kind (string)                 │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| StartNode (`start`) | Accepts flow inputs; enforces `mediaUrl` as required; passes `title`, `description`, `kind` with `""` defaults | `cinatra/oas.json` |
| ApiNode (`call_bridge`) | Constructs Jinja prompt, POSTs to `/api/llm-bridge`, declares Gemini provider + model + `media_input` capability | `cinatra/oas.json` |
| EndNode (`end`) | Collects `transcript` (from bridge text output) and `kind` (pass-through from start) | `cinatra/oas.json` |
| Skill definition | Supplies the LLM system instructions: verbatim output rules, speaker labels, `[unclear]` fallback, no metadata commentary | `skills/transcribe-media/SKILL.md` |
| CI gate | Self-contained Node.js script; validates `cinatra/oas.json` against banned retired-CRM primitives for `agent` kind; validates BPMN shape for `workflow` kind | `extension-kind-gate.mjs` |

## Pattern Overview

**Overall:** Cinatra declarative agent flow (single-node LLM call)

**Key Characteristics:**
- The entire agent is described as a JSON flow spec (`cinatra/oas.json`) with no runtime TypeScript source — it is a content-only extension.
- A single `ApiNode` delegates all LLM and media-ingest logic to the platform's `/api/llm-bridge` endpoint; the agent itself carries no fetch or transcription code.
- Provider selection (Gemini 2.5 Flash, `media_input` capability required) is declared in both the OAS metadata and the `cinatra_llm` block injected into the ApiNode at compile time by the platform's `oas-compiler`.
- YouTube URLs are routed differently from other media URLs inside the bridge (`adapter.generate` vs `adapter.generateFromMediaFile`) — the agent does not handle this branching.
- Transcription behaviour is governed entirely by `skills/transcribe-media/SKILL.md`, which the bridge resolves via `agent_id`.

## Layers

**Flow Definition Layer:**
- Purpose: Declares the agent's nodes, control-flow edges, data-flow edges, and I/O schema.
- Location: `cinatra/oas.json`
- Contains: StartNode, ApiNode, EndNode component definitions; Jinja prompt template; `cinatra_llm` provider block.
- Depends on: Cinatra platform (`/api/llm-bridge`, `{{CINATRA_BASE_URL}}`).
- Used by: Cinatra marketplace runtime at deploy/invoke time.

**Skill / Prompt Layer:**
- Purpose: Provides system-level LLM instructions that shape the transcript output format.
- Location: `skills/transcribe-media/SKILL.md`
- Contains: Output rules (speaker labels, segment breaks, verbatim requirement, `[unclear]` fallback, no metadata commentary, optional `[note]:` channel).
- Depends on: Nothing (plain Markdown consumed by the bridge).
- Used by: `/api/llm-bridge` when `agent_id: "media-transcript-agent"` is received.

**CI Gate Layer:**
- Purpose: Zero-dependency pre-publish sanity checks for extracted extension repos.
- Location: `extension-kind-gate.mjs`
- Contains: `validateAgent` (OAS banned-primitive scan), `validateWorkflow` (BPMN shape), `runGate` dispatcher, `parseArgs`, `main`.
- Depends on: Node.js built-ins only (`fs`, `path`).
- Used by: `.github/workflows/ci.yml` (`kind-gates` job, step "Agent OAS validation gate").

## Data Flow

### Primary Request Path

1. Caller invokes flow with `mediaUrl` (required) plus optional `title`, `description`, `kind` — StartNode (`cinatra/oas.json` `start` component)
2. Four DataFlowEdges carry `mediaUrl`, `title`, `description`, `kind` into ApiNode inputs (`cinatra/oas.json` `data_flow_connections`)
3. ApiNode renders Jinja `user` prompt: `"Transcribe the media at {{ mediaUrl }}. ..."` and POSTs to `{{CINATRA_BASE_URL}}/api/llm-bridge` with `agent_id`, `media`, and `cinatra_llm` block (`cinatra/oas.json` `call_bridge` component)
4. Bridge routes ingest: YouTube watch URL → `adapter.generate` (URL as text); other URLs → `adapter.generateFromMediaFile` (fetch + upload)
5. Bridge applies skill instructions from `skills/transcribe-media/SKILL.md` via `agent_id` resolution
6. Gemini 2.5 Flash (`media_input` capability) produces verbatim transcript text
7. Bridge returns `{ text: "..." }` to ApiNode output
8. DataFlowEdge `call_bridge_text_to_end_transcript` maps `text` → EndNode `transcript` input (`cinatra/oas.json`)
9. `kind` is also passed directly from StartNode to EndNode via `start_kind_to_end_kind` edge
10. Flow outputs `{ transcript: string, kind: string }` to caller

### CI Validation Path

1. GitHub Actions `ci.yml` triggers on push/PR to `main`
2. `build` job classifies repo: detects first-party `@cinatra-ai/*` peer deps → skips standalone install/typecheck/test (source mirror); no first-party deps → runs full pipeline
3. `kind-gates` job (needs: build) runs `node extension-kind-gate.mjs --package-root .` (`extension-kind-gate.mjs` `main`)
4. Gate reads `package.json`, detects `cinatra.kind: "agent"`, calls `validateAgent`
5. `validateAgent` parses `cinatra/oas.json` and walks all LLM-visible string fields (`system`, `user`, `description`) for banned retired-CRM primitives and typehints
6. Exit 0 (pass) or exit 1 with violation list

**State Management:**
- No runtime state — the flow is stateless. Each invocation is a single HTTP round-trip to `/api/llm-bridge`. No session or conversation history is maintained.

## Key Abstractions

**Cinatra Flow (`component_type: "Flow"`):**
- Purpose: Declarative directed graph of typed nodes connected by control-flow and data-flow edges. The OAS JSON is the compiled artefact consumed by the Cinatra runtime.
- Examples: `cinatra/oas.json`
- Pattern: StartNode → (one or more processing nodes) → EndNode; inputs/outputs typed as `string`.

**ApiNode:**
- Purpose: A node that performs an HTTP POST. Its `data` field is a Jinja template rendered at invocation time.
- Examples: `cinatra/oas.json` `call_bridge` component
- Pattern: Inputs declared; Jinja `{{ variable }}` interpolation in `data`; single `text` output.

**Skill (SKILL.md):**
- Purpose: Markdown file that encodes LLM system instructions for a named skill. Resolved at runtime by the bridge from `agent_id`.
- Examples: `skills/transcribe-media/SKILL.md`
- Pattern: Free-form Markdown with numbered output rules; no code.

**Extension Kind Gate:**
- Purpose: A self-contained, zero-dependency Node.js ESM module that validates extension correctness without needing the Cinatra registry.
- Examples: `extension-kind-gate.mjs`
- Pattern: Pure functions (`validateAgent`, `validateWorkflow`, `runGate`) invokable in tests; `main()` entry point guarded by `invokedDirectly` check.

## Entry Points

**Flow Invocation:**
- Location: `cinatra/oas.json` (`start_node.$component_ref: "start"`)
- Triggers: Cinatra runtime `start_conversation(inputs={mediaUrl: "...", ...})`
- Responsibilities: Validates required input `mediaUrl`, provides `""` defaults for optional inputs.

**CI Gate:**
- Location: `extension-kind-gate.mjs` (`main` function, line 365)
- Triggers: `node extension-kind-gate.mjs --package-root .` from `.github/workflows/ci.yml`
- Responsibilities: Parse `--package-root` arg, dispatch to kind-specific validator, print result, exit with code 0 or 1.

## Architectural Constraints

- **No runtime TypeScript source:** This is a content-only extension. `tsconfig.json` targets a `src/` directory that does not exist; CI skips typecheck because it detects no tracked `.ts` files.
- **Platform coupling:** All LLM calls, media ingest, and skill resolution are delegated to `{{CINATRA_BASE_URL}}/api/llm-bridge`. The agent cannot run standalone outside the Cinatra platform.
- **Provider lock-in:** `preferredProvider: "gemini"` and `preferredModel: "gemini-2.5-flash"` are hard-coded in both `cinatra/oas.json` metadata and the ApiNode `cinatra_llm` block. The `capabilityRequired: "media_input"` constraint further restricts provider selection.
- **Single-node flow:** The flow has exactly one processing node (`call_bridge`). Branching (YouTube vs other URLs) lives entirely inside the bridge, not in the flow graph.
- **Jinja templating:** The `user` prompt uses Jinja2 syntax (`{{ variable }}`, `{% if %}`-style conditional via `{{ ' Text: ' + x if x else '' }}`). This is rendered server-side by the Cinatra bridge.
- **Default-empty optional inputs:** `title`, `description`, `kind` default to `""` so the strict `start_conversation` dispatcher can pass all StartNode inputs explicitly without error. The bridge normalizes empty string to `undefined` for enum fields.

## Anti-Patterns

### Inline workflow definition

**What happens:** `package.json.cinatra.workflow` is not present (correctly absent).
**Why it's wrong:** Inline workflow definitions are forbidden by the platform; a `cinatra/workflow.bpmn` sidecar is required for workflow kinds. The gate enforces this for `workflow` kind.
**Do this instead:** Place the flow definition in `cinatra/oas.json` (agent kind) or `cinatra/workflow.bpmn` (workflow kind), never inline in `package.json`.

### First-party deps in dependencies/devDependencies

**What happens:** The CI gate explicitly checks for `@cinatra-ai/*` or `@cinatra/*` packages leaking into `dependencies`, `devDependencies`, or `optionalDependencies`.
**Why it's wrong:** First-party packages are not published to a registry; they are only available inside the Cinatra monorepo workspace. A leaked direct dep would make the standalone repo un-installable.
**Do this instead:** Declare first-party packages only as `peerDependencies` with `peerDependenciesMeta.<pkg>.optional: true`.

## Error Handling

**Strategy:** Output-level fallback (no exception propagation in flow nodes).

**Patterns:**
- Unintelligible audio: LLM is instructed to output `[unclear]` inline or `[unclear: entire audio is unintelligible]` for fully unintelligible input (`skills/transcribe-media/SKILL.md`, rule 4).
- CI gate errors: Collected as `string[]` and printed to stderr; process exits with code 1 (`extension-kind-gate.mjs` `main`).
- OAS parse failure: `validateAgent` catches JSON parse errors and returns them as error strings rather than throwing (`extension-kind-gate.mjs` line 139-144).

## Cross-Cutting Concerns

**Logging:** CI gate uses `console.log` (pass) and `console.error` (failures) only; no logging in the flow itself.
**Validation:** Banned-primitive scan in `extension-kind-gate.mjs`; schema validation deferred to Cinatra marketplace at publish time.
**Authentication:** Not handled in this repo. The bridge at `{{CINATRA_BASE_URL}}/api/llm-bridge` owns auth. The `.npmrc` file is present (existence noted; contents not read).

---

*Architecture analysis: 2026-06-09*
