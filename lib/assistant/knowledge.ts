import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  chunkKnowledgeDocument,
  rankKnowledgeChunks,
} from "@/lib/assistant/retrieval";

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
  "payment-with-egovpay.md",
  "sms-reminders.md",
  "common-questions.md",
] as const;

export type HelpDocument = {
  documentId: string;
  filename: string;
  content: string;
  routes: string[];
  score: number;
  section: string;
  title: string;
};

async function loadHelpDocuments() {
  const directory = path.join(process.cwd(), "docs", "assistant", "etax");

  const documents = await Promise.all(
    helpDocumentFiles.map(async (filename) => ({
      filename,
      source: await readFile(path.join(directory, filename), "utf8"),
    })),
  );

  return documents.flatMap(({ filename, source }) =>
    chunkKnowledgeDocument(source, filename),
  );
}

export async function findEtaxHelpDocuments(query: string, limit = 4) {
  const chunks = await loadHelpDocuments();

  return rankKnowledgeChunks(query, chunks, limit).map(
    ({ content, documentId, filename, routes, score, section, title }) => ({
      content,
      documentId,
      filename,
      routes,
      score,
      section,
      title,
    }),
  ) satisfies HelpDocument[];
}
