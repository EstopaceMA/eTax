import BM25 from "okapibm25";

export type KnowledgeChunk = {
  content: string;
  documentId: string;
  filename: string;
  keywords: string[];
  routes: string[];
  section: string;
  title: string;
};

export type RankedKnowledgeChunk = KnowledgeChunk & {
  score: number;
};

type KnowledgeDocumentMetadata = {
  id: string;
  keywords: string[];
  routes: string[];
  title: string;
};

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "for",
  "how",
  "i",
  "in",
  "is",
  "it",
  "my",
  "of",
  "on",
  "the",
  "to",
  "what",
  "when",
  "where",
  "why",
  "with",
]);

const relatedTerms: Record<string, string[]> = {
  account: ["profile", "workspace", "sign", "login"],
  add: ["upload", "capture", "record"],
  bill: ["invoice", "receipt", "record", "income"],
  calculate: ["computation", "review", "amount", "payable"],
  camera: ["capture", "image", "invoice", "record"],
  compute: ["computation", "review", "amount", "payable"],
  delete: ["remove", "record", "upload"],
  due: ["deadline", "date", "overdue"],
  edit: ["update", "change", "profile", "record"],
  file: ["filing", "handoff", "form", "acknowledgement"],
  form: ["pdf", "preview", "download", "1701q", "1701a"],
  invoice: ["income", "record", "upload", "capture", "receipt"],
  login: ["sign", "egovph", "exchange", "code"],
  password: ["exchange", "code", "signin", "egovph"],
  pay: ["payment", "egovpay", "checkout", "amount"],
  pdf: ["form", "preview", "download", "1701q", "1701a"],
  receipt: ["invoice", "income", "record", "payment"],
  remove: ["delete", "record", "upload"],
  signin: ["login", "egovph", "exchange", "code"],
  tax: ["filing", "bir", "form", "payment"],
  upload: ["add", "capture", "income", "record", "invoice", "pdf"],
};

function frontmatterList(frontmatter: string, key: string) {
  const lines = frontmatter.split("\n");
  const start = lines.findIndex((line) => line === `${key}:`);

  if (start === -1) {
    return [];
  }

  const values: string[] = [];

  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s{2}-\s+(.+)$/);

    if (!match) {
      break;
    }

    values.push(match[1].trim());
  }

  return values;
}

function frontmatterValue(frontmatter: string, key: string) {
  return frontmatter
    .split("\n")
    .find((line) => line.startsWith(`${key}:`))
    ?.slice(key.length + 1)
    .trim() ?? "";
}

function parseKnowledgeDocument(source: string, filename: string) {
  const closingDelimiter = source.indexOf("\n---\n", 4);
  const hasFrontmatter = source.startsWith("---\n") && closingDelimiter !== -1;
  const frontmatter = hasFrontmatter ? source.slice(4, closingDelimiter) : "";
  const body = hasFrontmatter ? source.slice(closingDelimiter + 5).trim() : source.trim();
  const metadata: KnowledgeDocumentMetadata = {
    id: frontmatterValue(frontmatter, "id") || filename.replace(/\.md$/, ""),
    keywords: frontmatterList(frontmatter, "keywords"),
    routes: frontmatterList(frontmatter, "routes"),
    title: frontmatterValue(frontmatter, "title") || filename,
  };

  return { body, metadata };
}

export function chunkKnowledgeDocument(
  source: string,
  filename: string,
): KnowledgeChunk[] {
  const { body, metadata } = parseKnowledgeDocument(source, filename);
  const lines = body.split("\n");
  const chunks: KnowledgeChunk[] = [];
  let section = "Overview";
  let content: string[] = [];

  function appendChunk() {
    const text = content.join("\n").trim();

    if (text) {
      chunks.push({
        content: text,
        documentId: metadata.id,
        filename,
        keywords: metadata.keywords,
        routes: metadata.routes,
        section,
        title: metadata.title,
      });
    }
  }

  for (const line of lines) {
    const sectionHeading = line.match(/^##\s+(.+)$/);

    if (sectionHeading) {
      appendChunk();
      section = sectionHeading[1].trim();
      content = [];
      continue;
    }

    if (!line.startsWith("# ")) {
      content.push(line);
    }
  }

  appendChunk();
  return chunks;
}

function normalizeToken(token: string) {
  const normalized = token.toLocaleLowerCase("en");

  if (normalized.length > 4 && normalized.endsWith("s") && !normalized.endsWith("ss")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function tokenizeKnowledgeQuery(value: string) {
  return (
    value
      .toLocaleLowerCase("en")
      .match(/[a-z0-9]+/g)
      ?.map(normalizeToken)
      .filter((term) => term.length > 1 && !stopWords.has(term)) ?? []
  );
}

function expandedQueryTerms(query: string) {
  const terms = tokenizeKnowledgeQuery(query);
  const expanded = new Set(terms);

  for (const term of terms) {
    for (const related of relatedTerms[term] ?? []) {
      expanded.add(related);
    }
  }

  return [...expanded];
}

function searchableText(chunk: KnowledgeChunk) {
  return [
    chunk.title,
    chunk.title,
    chunk.section,
    chunk.section,
    ...chunk.keywords,
    ...chunk.routes,
    chunk.content,
  ]
    .join("\n")
    .toLocaleLowerCase("en");
}

function metadataBoost(chunk: KnowledgeChunk, queryTerms: string[]) {
  const headingTerms = new Set(
    tokenizeKnowledgeQuery(`${chunk.title} ${chunk.section} ${chunk.keywords.join(" ")}`),
  );
  const matches = queryTerms.filter((term) => headingTerms.has(term)).length;

  return matches * 0.75;
}

export function rankKnowledgeChunks(
  query: string,
  chunks: KnowledgeChunk[],
  limit = 4,
): RankedKnowledgeChunk[] {
  if (chunks.length === 0 || limit <= 0) {
    return [];
  }

  const queryTerms = expandedQueryTerms(query);

  if (queryTerms.length === 0) {
    return [];
  }

  const corpora = chunks.map(searchableText);
  const bm25Scores = BM25(corpora, queryTerms, { k1: 1.3, b: 0.75 }) as number[];
  const perDocument = new Map<string, number>();

  return chunks
    .map((chunk, index) => ({
      ...chunk,
      score: (bm25Scores[index] ?? 0) + metadataBoost(chunk, queryTerms),
    }))
    .filter(({ score }) => Number.isFinite(score) && score > 0)
    .sort((first, second) => second.score - first.score)
    .filter(({ documentId }) => {
      const count = perDocument.get(documentId) ?? 0;

      if (count >= 2) {
        return false;
      }

      perDocument.set(documentId, count + 1);
      return true;
    })
    .slice(0, limit);
}
