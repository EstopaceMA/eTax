import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isEtaxAppQuestion } from "../lib/assistant/prompts";
import {
  chunkKnowledgeDocument,
  rankKnowledgeChunks,
  type KnowledgeChunk,
} from "../lib/assistant/retrieval";

const chunks: KnowledgeChunk[] = [
  {
    content:
      "Open Income records, select an open quarter, then add an image or PDF and confirm the extracted total.",
    documentId: "upload-income-records",
    filename: "upload-income-records.md",
    keywords: ["upload invoice", "capture receipt", "income record"],
    routes: ["/records"],
    section: "Steps",
    title: "Upload income records",
  },
  {
    content:
      "Only confirmed records count toward the filing computation. Review the amount before confirming it.",
    documentId: "upload-income-records",
    filename: "upload-income-records.md",
    keywords: ["extracted total", "confirm record"],
    routes: ["/records"],
    section: "What eTax extracts",
    title: "Upload income records",
  },
  {
    content:
      "Change the taxpayer type and RDO under BIR registration details, then save changes.",
    documentId: "tax-profile",
    filename: "tax-profile.md",
    keywords: ["tax profile", "RDO", "taxpayer details"],
    routes: ["/profile"],
    section: "What you can change",
    title: "Review your tax profile",
  },
  {
    content:
      "The payment step separately approves the exact amount before opening the eGovPay test gateway.",
    documentId: "payment-with-egovpay",
    filename: "payment-with-egovpay.md",
    keywords: ["pay taxes", "eGovPay", "checkout"],
    routes: ["/filing"],
    section: "Steps",
    title: "Pay through eGovPay",
  },
];

test("retrieval expands invoice language and ranks the focused upload section", () => {
  const results = rankKnowledgeChunks("Where can I add my invoice?", chunks, 3);

  assert.equal(results[0]?.documentId, "upload-income-records");
  assert.equal(results[0]?.section, "Steps");
});

test("retrieval uses headings and metadata for profile changes", () => {
  const results = rankKnowledgeChunks("How do I edit my RDO?", chunks, 2);

  assert.equal(results[0]?.documentId, "tax-profile");
  assert.equal(results[0]?.section, "What you can change");
});

test("retrieval returns no more than two sections from one document", () => {
  const repeated = Array.from({ length: 4 }, (_, index) => ({
    ...chunks[0],
    content: `${chunks[0].content} upload invoice ${index}`,
    section: `Upload step ${index}`,
  }));
  const results = rankKnowledgeChunks("upload invoice", repeated, 4);

  assert.equal(results.length, 2);
});

test("the current income-record guide is chunked with its route metadata", async () => {
  const filename = "upload-income-records.md";
  const source = await readFile(
    path.join(process.cwd(), "docs", "assistant", "etax", filename),
    "utf8",
  );
  const documentChunks = chunkKnowledgeDocument(source, filename);
  const results = rankKnowledgeChunks("Where do I upload an invoice?", documentChunks, 2);

  assert.ok(documentChunks.length > 1);
  assert.ok(documentChunks.every(({ routes }) => routes.includes("/records")));
  assert.equal(results[0]?.documentId, "upload-income-records");
  assert.match(results[0]?.content ?? "", /Income records|Add income record/);
});

test("app-question detection does not require the word eTax", () => {
  assert.equal(isEtaxAppQuestion("Where can I upload an invoice?"), true);
  assert.equal(isEtaxAppQuestion("How do I change my tax profile?"), true);
  assert.equal(
    isEtaxAppQuestion("When are Philippine income tax returns generally due?"),
    false,
  );
});
