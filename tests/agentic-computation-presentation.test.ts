import assert from "node:assert/strict";
import test from "node:test";
import { computationPresentation } from "../lib/agentic/computation-presentation";

test("active tax rules are presented as tax computations", () => {
  const copy = computationPresentation({
    id: "bir-1701q-eight-percent",
    version: "2018.01",
    title: "Q2 2026 — BIR Form 1701Q - 8% income tax on gross sales/receipts",
    sourceTitle: "RA 10963 (TRAIN) as implemented by RR 8-2018",
    status: "active",
  });

  assert.equal(copy.amountLabel, "Tax payable");
  assert.equal(copy.factAmountLabel, "Tax payable");
  assert.match(copy.ruleLabel, /8% income tax/);
  assert.match(copy.disclosure, /RR 8-2018/);
  assert.doesNotMatch(copy.disclosure, /Illustrative 6%/);
  assert.doesNotMatch(copy.explanation, /controlled pilot/);
});

test("demo tax rules retain an explicit illustrative warning", () => {
  const copy = computationPresentation({
    id: "demo-gross-income-six-percent-2026",
    version: "demo-2026.07.2",
    title: "Q4 2026 illustrative six-percent liability",
    sourceTitle: "eTaxPH controlled pilot fixture - not an official tax authority",
    status: "demo",
  });

  assert.equal(copy.amountLabel, "Demo amount");
  assert.match(copy.ruleLabel, /6%/);
  assert.match(copy.disclosure, /demo rule only/);
  assert.match(copy.explanation, /controlled pilot/);
});
