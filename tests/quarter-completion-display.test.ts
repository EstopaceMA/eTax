import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  filingQuarters,
  getQuarterlyFilingSeeds,
  parseFilingQuarter,
} from "../lib/filing-periods";

const root = process.cwd();

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("Q1 has a fixed presentation-only done state", () => {
  const q1 = filingQuarters.find(({ quarter }) => quarter === 1);
  const q1Seed = getQuarterlyFilingSeeds().find(({ period }) => period === q1?.period);

  assert.equal(q1?.displayStatus, "done");
  assert.equal(q1Seed?.status, "draft");
  assert.equal(q1Seed?.payment_status, "unpaid");
});

test("quarter parsing can fall back to the next active quarter", () => {
  assert.equal(parseFilingQuarter(null, 2), 2);
  assert.equal(parseFilingQuarter("invalid", 2), 2);
  assert.equal(parseFilingQuarter("1", 2), 1);
});

test("all quarter selectors render the shared done state", async () => {
  const selectors = await Promise.all([
    source("app/(protected)/filing/page.tsx"),
    source("app/(protected)/records/page.tsx"),
    source("components/agentic-chat.tsx"),
  ]);

  for (const selector of selectors) {
    assert.match(selector, /displayStatus/);
    assert.match(selector, /Done/);
    assert.match(selector, /success-500/);
  }

  for (const selector of selectors.slice(0, 2)) {
    assert.match(
      selector,
      /parseFilingQuarter\([\s\S]*?getLatestOpenQuarter\(\),[\s\S]*?\)/,
    );
  }
});
