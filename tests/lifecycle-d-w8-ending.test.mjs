// Lifecycle D W8 — the media transcript agent's ending (cinatra#3096 items 15
// and 19).
//
// (19) A run closes with a plain sentence — that the transcript was written,
// or, when nothing usable came back, that no speech came back or that the
// speech could not be understood — never with an empty transcript or the bare
// marker the transcription step answers for unintelligible audio.
//
// (15) The manifest claims no gate, and the flow has none: no pause, no screen.
//
// The last two arms re-state the runtime loader's two mount rules over this
// flow, as cinatra-ai/email-recipient-selection-agent holds them in its own
// suite: (A) every input a step requires has a source on every path that
// reaches it, and (B) an OutputMessageNode declares only inputs its template
// reads.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => JSON.parse(readFileSync(path.join(root, rel), "utf8"));
const oas = read("cinatra/oas.json");
const pkg = read("package.json");

const refs = oas.$referenced_components;
const nodesOfType = (type) => Object.values(refs).filter((n) => n.component_type === type);
const controlEdges = (oas.control_flow_connections ?? []).map((e) => ({
  from: e.from_node.$component_ref,
  to: e.to_node.$component_ref,
  branch: e.from_branch,
}));
const hasEdge = (from, to) => controlEdges.some((e) => e.from === from && e.to === to);
const dataEdges = (oas.data_flow_connections ?? []).map((e) => [
  e.source_node.$component_ref + "." + e.source_output,
  e.destination_node.$component_ref + "." + e.destination_input,
]);
const feedsOf = (to) => dataEdges.filter(([, t]) => t === to).map(([f]) => f);
const outsideComment = (message) => String(message ?? "").replace(/\{#[\s\S]*?#\}/g, "");

const ENDING =
  "{# pyagentspec-input-hint (do not remove): {{ transcript }} {{ title }} {{ mediaUrl }} #}" +
  "{% if not (transcript | trim) %}No transcript came back for the media at {{ mediaUrl }}: no speech was found in it." +
  "{% elif '[unclear: entire audio is unintelligible]' in transcript %}No transcript could be written: " +
  "the speech in the media at {{ mediaUrl }} could not be understood." +
  "{% elif title %}The transcript of {{ title }} was written from the media at {{ mediaUrl }}." +
  "{% else %}The transcript of the media at {{ mediaUrl }} was written.{% endif %}";

// ---------------------------------------------------------------------------
// (19) a plain-language ending on an empty or failed transcript
// ---------------------------------------------------------------------------

test("(19) the run ends in plain language, never in the bare transcript", () => {
  const summary = refs.transcript_summary;
  assert.ok(summary, "the run has no closing statement");
  assert.equal(summary.component_type, "OutputMessageNode");
  assert.ok(oas.nodes.some((n) => n.$component_ref === "transcript_summary"), "the closing statement is not a step of the flow");
  assert.ok(hasEdge("call_bridge", "transcript_summary"), "the transcription step does not pass the closing statement");
  assert.ok(hasEdge("transcript_summary", "end"), "the closing statement does not lead to the end");
  assert.ok(!hasEdge("call_bridge", "end"), "the run still jumps straight to its end");
  assert.deepEqual(
    refs.end.outputs.map((o) => o.title),
    ["transcript", "kind", "mediaUrl", "title"],
    "the end node no longer carries the values the run hands on",
  );
});

test("(19) an empty, unintelligible or transcribed run ends in plain language", () => {
  const summary = refs.transcript_summary;
  assert.ok(summary, "the run has no closing statement");
  const message = String(summary.message ?? "");
  assert.equal(message, ENDING, "each outcome does not reach its own sentence: empty, unintelligible, transcribed");
  assert.match(message, /no transcript came back/i, "an empty transcript has no plain-language ending");
  assert.match(message, /no transcript could be written/i, "unintelligible audio has no plain-language ending");
  assert.match(message, /the transcript of/i, "a written transcript has no plain-language ending");
  const rendered = outsideComment(message);
  assert.match(rendered, /\btranscript\b/, "the sentence never reads the transcript");
  assert.match(rendered, /\btitle\b/, "the sentence never reads the title");
  assert.match(rendered, /\bmediaUrl\b/, "the sentence never reads the media address");
  assert.equal(summary.metadata?.cinatra?.purpose, "plain-language-transcript-ending");
  assert.deepEqual(summary.inputs, [
    { title: "transcript", type: "string", default: "" },
    { title: "title", type: "string", default: "" },
    { title: "mediaUrl", type: "string", default: "" },
  ]);
  assert.deepEqual(feedsOf("transcript_summary.transcript"), ["call_bridge.text"], "the transcript is not fed once, from the transcription step alone");
  assert.deepEqual(feedsOf("transcript_summary.title"), ["start.title"], "the title is not fed once, from the start alone");
  assert.deepEqual(feedsOf("transcript_summary.mediaUrl"), ["start.mediaUrl"], "the media address is not fed once, from the start alone");
});

test("(19) every whole-response marker the transcription step names reaches a plain sentence", () => {
  const summary = refs.transcript_summary;
  assert.ok(summary, "the run has no closing statement");
  const system = String(refs.call_bridge.data?.system ?? "");
  const markers = [...system.matchAll(/respond\s+with\s+the\s+single\s+string\s+`([^`]+)`/g)].map((m) => m[1]);
  assert.deepEqual(
    markers,
    ["[unclear: entire audio is unintelligible]"],
    "the transcription step names a whole-response marker the ending has not been checked against",
  );
  const message = String(summary.message ?? "");
  const emptyAt = message.indexOf("{% if not (transcript | trim) %}");
  assert.ok(emptyAt >= 0, "an empty or white-space transcript has no branch of its own");
  for (const marker of markers) {
    const at = message.indexOf(`'${marker}' in transcript`);
    assert.ok(at >= 0, `the marker ${marker} never reaches a plain sentence`);
    assert.ok(emptyAt < at, "the empty branch does not stand before the marker test");
  }
  assert.doesNotMatch(outsideComment(message), /\{\{-?\s*transcript\b/, "the ending prints the transcript itself");
});

// ---------------------------------------------------------------------------
// (15) the manifest's gate claim agrees with the flow
// ---------------------------------------------------------------------------

function approvalNodes(value, found = []) {
  if (Array.isArray(value)) {
    for (const v of value) approvalNodes(v, found);
  } else if (value && typeof value === "object") {
    if (value.metadata?.cinatra?.requiresApproval === true) found.push(value.id ?? "(anonymous)");
    for (const v of Object.values(value)) approvalNodes(v, found);
  }
  return found;
}

test("(15) the manifest claims no gate and the flow has none", () => {
  assert.equal(pkg.cinatra.hasApprovalGates, false, "the manifest claims a gate");
  assert.deepEqual(oas.metadata.cinatra.hitlScreens, [], "the flow names a screen for a pause");
  assert.deepEqual(approvalNodes(oas), [], "a step of the flow asks for approval");
});

// ---------------------------------------------------------------------------
// (A) every required step input has a source on every path that reaches it
// ---------------------------------------------------------------------------

/** The inputs a node CONSUMES: an EndNode names them under `outputs`, every
 *  other node declares `inputs`. */
function consumedInputs(node) {
  if (node.component_type === "EndNode") return node.outputs ?? [];
  return node.inputs ?? [];
}

/** Walk the flow the way the runtime loader does, returning each input it
 *  would demand from the StartStep. */
function unsourcedInputs() {
  const steps = new Map();
  for (const ref of oas.nodes ?? []) steps.set(ref.$component_ref, refs[ref.$component_ref]);
  const beginId = oas.start_node.$component_ref;
  const startTitles = new Set((steps.get(beginId)?.inputs ?? []).map((i) => i.title));
  const flowDataEdges = (oas.data_flow_connections ?? []).map((e) => ({
    from: e.source_node.$component_ref,
    key: `${e.destination_node.$component_ref}.${e.destination_input}`,
  }));
  const successors = (id) => controlEdges.filter((e) => e.from === id).map((e) => e.to);

  const violations = [];
  const visited = new Map();
  const queue = [[beginId, new Set()]];
  while (queue.length > 0) {
    const [id, incoming] = queue.pop();
    let produced = incoming;
    if (visited.has(id)) {
      const seen = visited.get(id);
      if ([...seen].every((k) => produced.has(k))) continue;
      produced = new Set([...produced].filter((k) => seen.has(k)));
    }
    visited.set(id, produced);

    const node = steps.get(id);
    if (!node) continue;
    if (id !== beginId) {
      for (const descriptor of consumedInputs(node)) {
        const key = `${id}.${descriptor.title}`;
        if (produced.has(key)) continue;
        if (Object.hasOwn(descriptor, "default")) continue;
        if (startTitles.has(descriptor.title)) continue;
        violations.push(key);
      }
    }

    const next = new Set(produced);
    for (const edge of flowDataEdges) if (edge.from === id) next.add(edge.key);
    for (const child of successors(id)) queue.push([child, new Set(next)]);
  }
  return violations;
}

test("every required step input has a source on every path that reaches it", () => {
  const found = unsourcedInputs();
  assert.deepEqual(
    found,
    [],
    "the runtime refuses to mount a flow whose step requires an input the StartStep does not carry: " + found.join(", "),
  );
});

// ---------------------------------------------------------------------------
// (B) an OutputMessageNode declares only inputs its template reads
// ---------------------------------------------------------------------------

test("an output message declares only inputs its template reads", () => {
  const offenders = [];
  for (const node of nodesOfType("OutputMessageNode")) {
    const rendered = outsideComment(node.message);
    for (const { title } of node.inputs ?? []) {
      if (!new RegExp(`\\b${title}\\b`).test(rendered)) offenders.push(`${node.id}.${title}`);
    }
  }
  assert.deepEqual(offenders, [], "the runtime rejects an input the template never reads: " + offenders.join(", "));
});
