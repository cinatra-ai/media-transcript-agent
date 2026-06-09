# Testing Patterns

**Analysis Date:** 2026-06-09

## Test Framework

**Runner:**
- Not detected — no test framework is installed or configured in `package.json`
- No `jest.config.*`, `vitest.config.*`, or `mocha` config present
- CI runs `corepack pnpm test --if-present`, which silently skips when no `test` script exists

**Assertion Library:**
- Not applicable

**Run Commands:**
```bash
# No test script defined in package.json
# CI step silently passes via --if-present flag:
corepack pnpm test --if-present
```

## Test File Organization

**Location:**
- No test files detected in the repository

**Naming:**
- Not applicable

**Structure:**
- Not applicable

## Test Structure

**Suite Organization:**
- Not applicable — no tests exist

**Patterns:**
- Not applicable

## Mocking

**Framework:** Not applicable

**Patterns:**
- Not applicable

**What to Mock:**
- Not applicable

**What NOT to Mock:**
- Not applicable

## Fixtures and Factories

**Test Data:**
- Not applicable

**Location:**
- Not applicable

## Coverage

**Requirements:** Not enforced — no coverage tooling configured

**View Coverage:**
```bash
# No coverage command available
```

## Test Types

**Unit Tests:**
- Not present. However, `extension-kind-gate.mjs` is designed with testability in mind: all validator functions (`validateAgent`, `validateWorkflow`, `validateWorkflowPackageShape`, `validateBpmnSanity`, `findWorkflowSidecars`, `runGate`) are pure or near-pure exported functions that take string/object inputs and return `string[]` results, making them trivial to unit test without mocking.

**Integration Tests:**
- Not present

**E2E Tests:**
- Not used

## CI Gate (Functional Substitute for Tests)

This repo relies on CI structural validation rather than automated tests:

**Agent OAS Gate** (`extension-kind-gate.mjs --package-root .`):
- Parses `cinatra/oas.json` and scans all LLM-visible fields (`system`, `user`, `description`) for retired CRM primitives
- Validates that no banned primitive tokens (e.g. `lists_list`, `contacts_get`) appear in prompt strings
- Runs as a zero-dependency Node script in `.github/workflows/ci.yml` under the `kind-gates` job

**Package Shape Gate** (inline Node in CI):
- Validates that first-party `@cinatra-ai/*` packages appear only as optional `peerDependencies`, never in `dependencies`/`devDependencies`
- Exit code 2 triggers a hard CI failure distinct from test failures

**Pack Dry-Run:**
- `npm pack --dry-run` validates publish payload shape without uploading

## Adding Tests

If tests are added to this repo, the recommended approach given the existing code style:

1. Add a `test` script to `package.json` (e.g., `"test": "node --test"` for Node's built-in test runner, which requires no dependencies — matching the zero-dependency philosophy of `extension-kind-gate.mjs`)
2. Place test files as `*.test.mjs` alongside the file under test
3. All exported functions in `extension-kind-gate.mjs` are already pure and ready to test without any mocking

---

*Testing analysis: 2026-06-09*
