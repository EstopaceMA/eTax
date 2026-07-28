import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("skeleton primitives are accessible and respect reduced motion", async () => {
  const skeleton = await source("components/ui/skeleton.tsx");

  assert.match(skeleton, /aria-hidden="true"/);
  assert.match(skeleton, /aria-busy="true"/);
  assert.match(skeleton, /aria-live="polite"/);
  assert.match(skeleton, /role="status"/);
  assert.match(skeleton, /motion-safe:animate-pulse/);
  assert.match(skeleton, /motion-reduce:animate-none/);
});

test("authenticated data routes use layout-matched loading boundaries", async () => {
  const boundaries = [
    ["app/(protected)/dashboard/loading.tsx", "DashboardSkeleton"],
    ["app/(protected)/documents/loading.tsx", "DocumentsSkeleton"],
    ["app/(protected)/deadlines/loading.tsx", "DeadlinesSkeleton"],
    ["app/(protected)/profile/loading.tsx", "ProfileSkeleton"],
    ["app/(protected)/filing/loading.tsx", "FilingSkeleton"],
  ] as const;
  const compositions = await source("components/loading-skeletons.tsx");

  for (const [file, component] of boundaries) {
    const boundary = await source(file);

    assert.ok(boundary.includes(`import { ${component} }`));
    assert.ok(boundary.includes(`<${component} />`));
    assert.ok(compositions.includes(`export function ${component}(`));
  }
});

test("agentic filing skeletons initial and newly selected session content", async () => {
  const agenticChat = await source("components/agentic-chat.tsx");
  const skeletons = await source("components/loading-skeletons.tsx");

  assert.match(
    agenticChat,
    /\{openingSessionId \|\| \(isLoading && !detail\) \? \(/,
  );
  assert.match(agenticChat, /\{!openingSessionId && detail \? \(/);
  assert.match(agenticChat, /aria-busy=\{isLoading\}/);
  assert.doesNotMatch(agenticChat, /Reconciling this period/);
  assert.match(skeletons, /export function AgenticTimelineSkeleton\(\)/);
  assert.match(skeletons, /export function AgenticSessionListSkeleton\(\)/);
});

test("independent server data requests begin in parallel", async () => {
  const dashboard = await source("app/(protected)/dashboard/page.tsx");
  const filing = await source("app/(protected)/filing/page.tsx");

  assert.match(
    dashboard,
    /Promise\.all\(\[\s*getWorkspaceData\(\),\s*getAgenticPlan\(\),\s*\]\)/,
  );
  assert.match(
    filing,
    /Promise\.all\(\[\s*searchParams,\s*getWorkspaceData\(\),\s*\]\)/,
  );
});
