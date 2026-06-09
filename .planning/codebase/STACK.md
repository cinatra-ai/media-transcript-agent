# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- TypeScript (ES2023 target) - Declared via `tsconfig.json`; `src/` directory is the rootDir (no source files present in this extracted repo snapshot)
- JavaScript (ESM) - `extension-kind-gate.mjs` CI gate script (Node builtins only, zero external deps)

**Secondary:**
- JSON - Agent flow definition (`cinatra/oas.json`), package manifest (`package.json`)
- Markdown - Skill prompt (`skills/transcribe-media/SKILL.md`)
- Jinja2 template strings - Embedded in `cinatra/oas.json` ApiNode `data` fields for dynamic prompt assembly

## Runtime

**Environment:**
- Node.js (ESM, `"type": "module"` in `package.json`)
- Target: ES2023 / ESNext modules

**Package Manager:**
- npm (`.npmrc` present — existence noted, contents not read)
- Lockfile: Not detected in repo root

## Frameworks

**Core:**
- Cinatra Agent Platform (agentspec_version `26.1.0`) — declarative Flow runtime; agent defined in `cinatra/oas.json`

**Testing:**
- Not detected (no test framework config or test files found)

**Build/Dev:**
- TypeScript compiler (`tsc`) — configured via `tsconfig.json`, outputs to `dist/`
- `extension-kind-gate.mjs` — self-contained zero-dependency CI sanity gate (Node builtins only)

## Key Dependencies

**Critical:**
- Cinatra platform runtime (resolved at deploy time via `{{CINATRA_BASE_URL}}`) — provides the `/api/llm-bridge` endpoint that the single ApiNode calls; no npm package dependency declared
- Google Gemini 2.5 Flash — preferred LLM provider declared in `cinatra/oas.json` metadata (`preferredProvider: "gemini"`, `preferredModel: "gemini-2.5-flash"`, `capabilityRequired: "media_input"`)

**Infrastructure:**
- `@cinatra-ai/media-transcript-agent` npm scope — package name from `package.json`; published to the Cinatra private registry (see `.npmrc`)

## Configuration

**Environment:**
- `{{CINATRA_BASE_URL}}` — runtime template variable injected by the Cinatra platform; used as the base URL for the `/api/llm-bridge` POST call in `cinatra/oas.json`
- `.npmrc` present — configures scoped registry auth (contents not read)

**Build:**
- `tsconfig.json` — strict TypeScript, `moduleResolution: bundler`, `jsx: react-jsx`, `outDir: dist`, `rootDir: src`
- `cinatra/oas.json` — the authoritative agent flow spec (agentspec format, not OpenAPI despite the filename)

## Platform Requirements

**Development:**
- Node.js with ESM support
- Access to Cinatra private npm registry (`@cinatra-ai` scope)
- TypeScript compiler for any `src/` code changes

**Production:**
- Cinatra Agent Platform (provides LLM bridge, Gemini routing, media ingest)
- Google Gemini API access (via platform bridge — not called directly by this package)

---

*Stack analysis: 2026-06-09*
