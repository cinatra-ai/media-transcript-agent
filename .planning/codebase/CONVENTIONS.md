# Coding Conventions

**Analysis Date:** 2026-06-09

## Naming Patterns

**Files:**
- `kebab-case` for all files: `extension-kind-gate.mjs`, `oas.json`
- Skill directories use `kebab-case`: `skills/transcribe-media/`
- Single capital-case for documentation: `SKILL.md`, `README.md`

**Functions:**
- `camelCase` for all exported and internal functions: `parseArgs`, `validateAgent`, `validateWorkflow`, `runGate`, `walkLlmStrings`, `scanOasString`, `findWorkflowSidecars`, `validateBpmnSanity`, `validateWorkflowPackageShape`

**Variables:**
- `camelCase` for local variables and parameters: `packageRoot`, `oasPath`, `findings`, `bpmnPrefixes`
- `SCREAMING_SNAKE_CASE` for module-level constants: `LLM_VISIBLE_FIELDS`, `BANNED_PRIMITIVES`, `BANNED_TYPEHINTS`, `BPMN_MODEL_NS`, `WORKFLOW_PACKAGE_NAME_RE`

**Types:**
- TypeScript strict mode enabled via `tsconfig.json` (`strict: true`), though `noImplicitAny` is relaxed (`false`)
- `verbatimModuleSyntax: true` — import type must use `import type` syntax

## Code Style

**Formatting:**
- Not detected (no `.prettierrc`, `.eslintrc`, or `biome.json` present)
- Indentation is 2 spaces (observed in `extension-kind-gate.mjs`)
- Double quotes for strings throughout

**Linting:**
- Not detected — no ESLint or Biome config present

## Import Organization

**Order (from `extension-kind-gate.mjs`):**
1. Node built-in modules with `node:` protocol prefix: `import { readFileSync, existsSync } from "node:fs"`
2. No third-party or internal imports (by design — the gate file is zero-dependency)

**Path Aliases:**
- None detected (standalone repo, no monorepo path mapping)

**Module System:**
- ESM only (`"type": "module"` in `package.json`)
- Files use `.mjs` extension for scripts to be explicit about ESM format

## Error Handling

**Patterns:**
- Pure functions return `string[]` error arrays rather than throwing: `validateAgent(packageRoot): string[]`, `validateWorkflow(packageRoot): string[]`
- `try/catch` wraps file I/O, converting `Error` objects with `err instanceof Error ? err.message : String(err)`
- Early returns when a fatal error is encountered (no point continuing if OAS fails to parse)
- The main entry point catches unexpected errors and exits with code 1
- Process exit codes are semantically meaningful: 0 = pass, 1 = violations, 2 = first-party dep shape regression (used in CI shell scripts)

**Example pattern from `extension-kind-gate.mjs`:**
```js
try {
  parsed = JSON.parse(readFileSync(oasPath, "utf8"));
} catch (err) {
  errors.push(`cinatra/oas.json failed to parse: ${err instanceof Error ? err.message : String(err)}`);
  return errors;
}
```

## Logging

**Framework:** Node `console` directly (no logging library)

**Patterns:**
- `console.log` for success/pass messages
- `console.error` for violation output
- Unicode symbols used for visual clarity: `✓` for pass, `✗` for fail
- Bullet points (`•`) used when listing individual violations

## Comments

**When to Comment:**
- Block comments at the top of each logical section using dashed separator lines (`// ----------`)
- JSDoc-style `/** ... */` for exported functions that describe behavior, parameters, and caveats
- Inline comments explain non-obvious decisions (e.g., why `npx` is used instead of `pnpm dlx`)
- File-level header comment documents scope, purpose, usage, and exit codes

**Example from `extension-kind-gate.mjs`:**
```js
/**
 * Light XML well-formedness + BPMN-shape check. Pure (string in → string[] out).
 * Not a full XML parser — a tag-balance walk...
 */
export function validateBpmnSanity(xml) {
```

## Function Design

**Size:** Functions are focused and single-purpose; largest function (`validateBpmnSanity`) is ~80 lines due to inherent XML parsing complexity

**Parameters:** Prefer simple primitives and strings; `packageRoot` string passed rather than objects

**Return Values:** Validators return `string[]` (empty = pass, non-empty = failures). The dispatcher `runGate` returns `{ kind, errors }` object. `main()` side-effects via `process.exit`.

**Purity:** Validation functions are documented and designed as pure (no I/O side effects): `validateWorkflowPackageShape(pkg)`, `validateBpmnSanity(xml)`, `walkLlmStrings(node, onString)`, `scanOasString(field, text, findings)`

## Module Design

**Exports:**
- Named exports only — no default exports
- All public gate functions exported: `parseArgs`, `validateAgent`, `validateWorkflow`, `validateWorkflowPackageShape`, `validateBpmnSanity`, `findWorkflowSidecars`, `runGate`
- `main()` is NOT exported; invoked only when the script is run directly (checked via `import.meta.url`)

**Barrel Files:**
- Not applicable — single-file script repo

## Skill Definition Conventions

**Location:** `skills/<skill-name>/SKILL.md`

**Format:**
- Plain Markdown with numbered output rules
- No code — pure natural language instructions for the LLM
- Sections: output rules (numbered), optional notes channel
- Inline notes use blockquote (`>`) for implementation details that are NOT part of the LLM prompt contract

---

*Convention analysis: 2026-06-09*
