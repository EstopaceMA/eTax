/**
 * Fills the approved BIR Form 1701Q AcroForm with dummy data.
 *
 * Usage: npx tsx scripts/generate-1701q-preview.ts [outputPath] [--flatten]
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import { DUMMY_1701Q } from "../lib/pdf/1701q/dummy-data";
import { render1701Q } from "../lib/pdf/1701q/render";

async function main(): Promise<void> {
  const outPath =
    process.argv[2] ?? path.join("out", "1701Q-filled-preview.pdf");
  const bytes = await render1701Q(DUMMY_1701Q, {
    flatten: process.argv.includes("--flatten"),
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, bytes);
  console.log(`Wrote ${bytes.length} bytes to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
