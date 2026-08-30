// Lifecycle D W6 — this agent's declared state, asserted on the shipped
// manifest and the shipped service description.
//
// The declaration key: a dependency is a required `kind: "artifact"` entry in
// `cinatra.dependencies`; produces is `cinatra.produces` on the manifest, which
// is the only authority the host compiler reads; a binding is an end-node
// output's `cinatra.artifact` block. A produces mirror carried in the service
// description is optional, and when present must agree entry for entry with the
// manifest — the compiler refuses a mirror that disagrees.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const oas = JSON.parse(readFileSync(join(root, "cinatra/oas.json"), "utf8"));
const cinatra = pkg.cinatra ?? {};
const components = oas.$referenced_components ?? {};

const artifactDependencies = (cinatra.dependencies ?? []).filter(
  (d) => d.kind === "artifact",
);
const bindings = [];
for (const [id, comp] of Object.entries(components)) {
  if (comp?.component_type !== "EndNode") continue;
  for (const out of comp.outputs ?? []) {
    const binding = out?.cinatra?.artifact;
    if (binding) bindings.push({ node: id, output: out.title, binding });
  }
}
function approvalNodes(value, found = []) {
  if (Array.isArray(value)) {
    for (const v of value) approvalNodes(v, found);
  } else if (value && typeof value === "object") {
    if (value.metadata?.cinatra?.requiresApproval === true) found.push(value.id ?? "(anonymous)");
    for (const v of Object.values(value)) approvalNodes(v, found);
  }
  return found;
}
function startMeta() {
  for (const comp of Object.values(components)) {
    if (comp?.component_type === "StartNode") return comp;
  }
  throw new Error("no StartNode");
}

test("the produces mirror agrees with the manifest, entry for entry", () => {
  const mirror = oas.metadata?.cinatra?.produces;
  if (mirror === undefined) return;
  assert.deepEqual(mirror, cinatra.produces ?? []);
});

test("no start-node input is listed as both required and hidden", () => {
  const meta = startMeta().metadata?.cinatra ?? {};
  const hidden = new Set(meta.hidden ?? []);
  assert.deepEqual((meta.required ?? []).filter((t) => hidden.has(t)), []);
});

test("the manifest claims a gate only when the flow has one", () => {
  const claimed = cinatra.hasApprovalGates === true;
  const real = approvalNodes(oas).length > 0;
  if (claimed) assert.equal(real, true);
});

const TEXT = "@cinatra-ai/text-artifact";
const TYPE = "@cinatra-ai/text-artifact:artifact";

test("6b — the produces entry carries the typed id of the text base", () => {
  assert.deepEqual(cinatra.produces, [{ extension: TEXT, objectTypeId: TYPE }]);
});

test("6b — the mirror in the service description carries the same typed id", () => {
  assert.deepEqual(oas.metadata.cinatra.produces, [
    { extension: TEXT, objectTypeId: TYPE },
  ]);
});

test("6b — the binding carries the typed id too", () => {
  const bound = bindings.filter((b) => b.binding.extension === TEXT);
  assert.equal(bound.length, 1);
  assert.equal(bound[0].output, "transcript");
  assert.equal(bound[0].binding.objectTypeId, TYPE);
  assert.equal(bound[0].binding.declaredMime, "text/plain");
  assert.ok(bound[0].binding.titleFrom);
});

test("6b — the text base is a required artifact dependency", () => {
  const edge = artifactDependencies.find((d) => d.packageName === TEXT);
  assert.ok(edge, "no artifact dependency on " + TEXT);
  assert.equal(edge.requirement, "required");
});

test("6b — the manifest no longer claims a gate the flow lacks", () => {
  assert.equal(cinatra.hasApprovalGates, false);
  assert.deepEqual(approvalNodes(oas), []);
});
