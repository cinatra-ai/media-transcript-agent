// W8 (cinatra#3096) item 17 — the title as a field carried to a title output its binding names.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const oas = JSON.parse(readFileSync(path.join(root, "cinatra/oas.json"), "utf8"));
const refs = oas.$referenced_components;
const start = refs.start;
const end = refs.end;

test("(17) the title is a field the person sets", () => {
  assert.ok(!(start.metadata.cinatra.hidden ?? []).includes("title"), "the title is hidden from the person");
  assert.ok(start.inputs.some((i) => i.title === "title"));
});

test("(17) the title is carried to a title output the binding names", () => {
  assert.ok(end.outputs.some((o) => o.title === "title"), "the run files no title output");
  const bound = end.outputs.find((o) => o?.cinatra?.artifact);
  assert.equal(bound.cinatra.artifact.titleFrom, "title", "the artifact still titles itself from something else");
  const carried = (oas.data_flow_connections ?? []).some(
    (e) => e.source_node.$component_ref === "start" && e.source_output === "title" &&
      e.destination_node.$component_ref === "end" && e.destination_input === "title",
  );
  assert.ok(carried, "the title the person set never reaches the output");
});
