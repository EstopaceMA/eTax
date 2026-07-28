import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("the interface self-hosts SF Pro Display from public assets", async () => {
  const [layout, styles] = await Promise.all([
    readFile(path.join(root, "app/layout.tsx"), "utf8"),
    readFile(path.join(root, "app/globals.css"), "utf8"),
  ]);
  const fontDirectory = path.join(root, "public/SF Pro Display Font");

  await Promise.all(
    [
      "SFPRODISPLAYREGULAR.OTF",
      "SFPRODISPLAYMEDIUM.OTF",
      "SFPRODISPLAYBOLD.OTF",
    ].map((file) => access(path.join(fontDirectory, file))),
  );

  assert.doesNotMatch(layout, /next\/font\/google|Inter|font-inter/);
  assert.doesNotMatch(styles, /font-inter/);
  assert.match(styles, /font-family: "SF Pro Display"/);
  assert.match(styles, /SFPRODISPLAYREGULAR\.OTF/);
  assert.match(styles, /SFPRODISPLAYMEDIUM\.OTF/);
  assert.match(styles, /SFPRODISPLAYBOLD\.OTF/);

  for (const weight of [400, 500, 600, 650, 700, 750]) {
    assert.match(styles, new RegExp(`font-weight: ${weight};`));
  }

  assert.equal(styles.match(/font-display: swap;/g)?.length, 6);
});
