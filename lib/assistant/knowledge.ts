import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import BM25 from "okapibm25";

const helpDocumentFiles = [
  "_index.md",
  "getting-started.md",
  "create-workspace.md",
  "sign-in.md",
  "dashboard.md",
  "tax-profile.md",
  "document-checklist.md",
  "deadlines.md",
  "filing-tracker.md",
  "upload-income-records.md",
  "bir-form-preview.md",
  "sms-reminders.md",
  "common-questions.md",
] as const;

export type HelpDocument = {
  filename: string;
  content: string;
  score: number;
};

function tokenize(value: string) {
  return value
    .toLocaleLowerCase("en")
    .match(/[a-z0-9]+/g)
    ?.filter((term) => term.length > 1) ?? [];
}

async function loadHelpDocuments() {
  const directory = path.join(process.cwd(), "docs", "assistant", "etax");

  return Promise.all(
    helpDocumentFiles.map(async (filename) => ({
      filename,
      content: await readFile(path.join(directory, filename), "utf8"),
    })),
  );
}

export async function findEtaxHelpDocuments(query: string, limit = 2) {
  const documents = await loadHelpDocuments();
  const corpora = documents.map(({ content }) => content.toLocaleLowerCase("en"));
  const scores = BM25(corpora, tokenize(query), { k1: 1.3, b: 0.75 }) as number[];

  return documents
    .map((document, index) => ({ ...document, score: scores[index] ?? 0 }))
    .sort((first, second) => second.score - first.score)
    .slice(0, Math.max(1, limit)) satisfies HelpDocument[];
}
