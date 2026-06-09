# Codebase Structure

**Analysis Date:** 2026-06-09

## Directory Layout

```
media-transcript-agent/
├── cinatra/                # Cinatra platform artefacts
│   └── oas.json            # Compiled agent flow spec (StartNode → ApiNode → EndNode)
├── skills/                 # Skill definitions (LLM system instructions)
│   └── transcribe-media/
│       └── SKILL.md        # Transcription output rules for the LLM
├── .github/
│   └── workflows/
│       ├── ci.yml          # Standalone CI: build + kind-gates jobs
│       └── release.yml     # Release workflow
├── extension-kind-gate.mjs # Zero-dependency CI validation gate (ESM)
├── package.json            # Package manifest + cinatra metadata block
├── tsconfig.json           # TypeScript config (targets absent src/ — content-only repo)
├── .npmrc                  # npm registry config (existence noted; contents not read)
├── LICENSE                 # Apache-2.0
└── README.md               # Usage documentation
```

## Directory Purposes

**`cinatra/`:**
- Purpose: Holds all Cinatra platform-consumed artefacts for this extension.
- Contains: `oas.json` — the compiled agent flow specification in Cinatra's OAS JSON format (agentspec v26.1.0).
- Key files: `cinatra/oas.json`

**`skills/transcribe-media/`:**
- Purpose: Contains the skill definition that the `/api/llm-bridge` resolves when `agent_id: "media-transcript-agent"` is received.
- Contains: `SKILL.md` — Markdown file with numbered output rules governing verbatim transcription, speaker labels, `[unclear]` fallback, and the optional `[note]:` channel.
- Key files: `skills/transcribe-media/SKILL.md`

**`.github/workflows/`:**
- Purpose: GitHub Actions CI/CD configuration for the extracted extension repo.
- Contains: `ci.yml` (two-job pipeline: `build` + `kind-gates`), `release.yml`.
- Key files: `.github/workflows/ci.yml`

## Key File Locations

**Entry Points:**
- `cinatra/oas.json`: Flow entry point — `start_node.$component_ref: "start"` is the StartNode that the Cinatra runtime invokes.
- `extension-kind-gate.mjs`: CLI entry point for CI validation — `main()` function, invoked as `node extension-kind-gate.mjs --package-root .`.

**Configuration:**
- `package.json`: NPM package manifest; `cinatra` block declares `kind: "agent"`, `packageType: "agent"`, `riskLevel: "low"`, `hasApprovalGates: true`, `toolAccess: []`.
- `tsconfig.json`: TypeScript compiler config — strict mode, ESNext modules, targets `src/` (which does not exist; CI skips typecheck for this content-only repo).
- `.npmrc`: Registry configuration (not read).

**Core Logic:**
- `cinatra/oas.json`: Entire agent flow definition — nodes, edges, Jinja prompt template, provider/model selection.
- `skills/transcribe-media/SKILL.md`: LLM output instructions — the only place transcription behaviour is defined.
- `extension-kind-gate.mjs`: All CI validation logic — `validateAgent`, `validateWorkflow`, `validateBpmnSanity`, `findWorkflowSidecars`, `runGate`.

**Testing:**
- No test files present. The `extension-kind-gate.mjs` exports pure functions (`validateAgent`, `validateWorkflowPackageShape`, `validateBpmnSanity`, `findWorkflowSidecars`, `runGate`, `parseArgs`) suited for unit testing, but no test suite exists in this repo. CI runs `pnpm test --if-present` and skips gracefully.

## Naming Conventions

**Files:**
- Cinatra artefacts: lowercase with extension matching the artefact type (`oas.json`, `workflow.bpmn`).
- Skills: kebab-case directory name matching the skill slug (`transcribe-media/`), uppercase `SKILL.md` filename.
- Gate script: kebab-case with `.mjs` extension (`extension-kind-gate.mjs`).
- GitHub Actions: lowercase kebab-case (`ci.yml`, `release.yml`).

**Directories:**
- Cinatra platform artefacts: `cinatra/` (reserved name, all lowercase).
- Skills: `skills/<skill-slug>/` (plural `skills/`, kebab-case slug).

**Package naming:**
- Pattern: `@<scope>/<slug>-agent` for agent kind (e.g., `@cinatra-ai/media-transcript-agent`).
- Workflow kind would use `@<scope>/<slug>-workflow`.

**Node IDs in OAS:**
- Snake-case short identifiers: `start`, `call_bridge`, `end`.
- DataFlowEdge names: `<source>_<output>_to_<dest>_<input>` (e.g., `call_bridge_text_to_end_transcript`).
- ControlFlowEdge names: `<from>_to_<to>` (e.g., `start_to_call_bridge`).

## Where to Add New Code

**New flow node (processing step):**
- Add a new component under `cinatra/oas.json` `$referenced_components`.
- Add a `$component_ref` entry to `cinatra/oas.json` `nodes`.
- Wire it with `ControlFlowEdge` entries in `control_flow_connections` and `DataFlowEdge` entries in `data_flow_connections`.

**New skill:**
- Create `skills/<new-skill-slug>/SKILL.md` following the same Markdown rule-list structure as `skills/transcribe-media/SKILL.md`.

**New validation rule for CI gate:**
- Add banned tokens to `BANNED_PRIMITIVES` or `BANNED_TYPEHINTS` in `extension-kind-gate.mjs`.
- Add new validation logic as a pure exported function and call it from `validateAgent` or `validateWorkflow`.

**TypeScript sources (if this repo ever ships code):**
- Place under `src/` — `tsconfig.json` is already configured for `src/**/*.ts` and `src/**/*.tsx`.
- Output goes to `dist/` (declared in `tsconfig.json`).

## Special Directories

**`cinatra/`:**
- Purpose: Consumed by the Cinatra marketplace/runtime at publish and invoke time.
- Generated: `oas.json` is compiled by the platform's `oas-compiler` from a source template (`sourceTemplateId: "media-transcript-flow"`). In this extracted repo it is committed as a static artefact.
- Committed: Yes.

**`skills/`:**
- Purpose: Skill Markdown definitions referenced by `agent_id` at bridge invocation time.
- Generated: No — hand-authored.
- Committed: Yes.

**`dist/`:**
- Purpose: TypeScript compilation output (declared in `tsconfig.json`).
- Generated: Yes (by `tsc`).
- Committed: No (not present; no `src/` exists today).

---

*Structure analysis: 2026-06-09*
