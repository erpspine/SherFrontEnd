import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { stageValues, emptyRow, filterCases, csvValue } from "../src/utils/performanceCase.js";
const schema = JSON.parse(fs.readFileSync(new URL("../../SherERPBackend/resources/performance/stages.json", import.meta.url)));

test("all A–R forms initialize without sample incident data", () => {
  assert.equal(Object.keys(schema).length, 18);
  for (const stage of Object.values(schema)) {
    const values = stageValues(stage.fields);
    assert.equal(Object.keys(values).length, stage.fields.length);
  }
  assert.equal(stageValues(schema.M.fields).reviewDate, "");
  assert.equal(schema.M.fields.find((f) => f.key === "reviewDate").type, "date");
  assert.deepEqual(emptyRow(schema.O.fields[0].columns), { action: "", status: "Open", finding: "" });
  assert.equal(stageValues(schema.R.fields).status, "Open");
});

test("saved checklist, actions, approvals and dates survive form initialization", () => {
  const actions = [{ action: "Review", status: "Closed", finding: "Done" }];
  assert.deepEqual(stageValues(schema.O.fields, { actions }).actions, actions);
  const saved = { approvals: [{ role: "Manager", name: "Alex", approved: true }], closureDate: "2026-09-10", closureNote: "Done", status: "Closed" };
  assert.deepEqual(stageValues(schema.R.fields, saved), saved);
  const a = stageValues(schema.R.fields); a.approvals[0].name = "Changed";
  assert.equal(stageValues(schema.R.fields).approvals[0].name, "");
});

test("register filters combine booking search, status and date", () => {
  const cases = [{ reference: "INC-1", type: "Accident", status: "Open", date: "2026-09-03", booking: { reference: "BOOK-1", driver: "Amina" } }];
  assert.equal(filterCases(cases, { search: "amina", from: "2026-09-01", to: "2026-09-10", status: "Open" }).length, 1);
  assert.equal(filterCases(cases, { status: "Closed" }).length, 0);
  assert.equal(filterCases(cases, { search: "BOOK-1", to: "2026-09-02" }).length, 0);
  assert.equal(csvValue('=SUM(1,2)'), '"\'=SUM(1,2)"');
});
