# Handoff: real 1701Q tax computation (8% option)

Branch: `feat/dynamic-actual-computation`, built on top of `chore/add_egov_sso`
(PR [#3](https://github.com/EstopaceMA/eTax/pull/3), 2 commits, already open).

## Why this exists

The 1701Q PDF was rendering fixture money (`DUMMY_1701Q`) even after the
identity block (name, TIN, address, RDO) was wired to real eGov SSO data. The
app also has a separate, unrelated "demo" tax number — `domain.ts`'s
`computeDemoLiability`, a flat 6% of gross with no deductions — that feeds the
agentic dashboard/filing-tracker UI. Neither is the real BIR rule.

Researched the actual rule (verified current for 2026, sources at the bottom):
self-employed/professional taxpayers on the 8% option pay
**`(cumulative gross − ₱250,000) × 8%`**, cumulative year-to-date, crediting
back tax already paid in prior quarters. The user's direction, verbatim:
*"you have to use the correct one regardless... meaning the true computation,
not for demo."* That's what this branch builds.

## What's done and verified

**`lib/tax/rule-sets.ts`** — reads the tax rule from `tax_rule_sets`
(existing table, `supabase/migrations/011_agentic_vertical_slice.sql`) instead
of hardcoding the rate. `getEightPercentRule(onDate)` returns whichever row is
`active` and date-ranged over `onDate`.

**`lib/tax/1701q-compute.ts`** — pure function `computeQuarterly1701Q(input,
config)` producing every 1701Q line 47–63. Rounds per `config.rounding`
(`whole_peso` vs `2dp`) rather than assuming. Handles: income below the
₱250,000 floor (→ ₱0, not negative), a nil quarter, overpayment (negative line
63, not clamped), mixed-income earners getting no ₱250,000, the ₱3,000,000
VAT-threshold breach (warns the return "is not valid for filing" rather than
silently computing at 8% anyway), and 2307 withholding credit. **12/12 tests
pass** — `tests/tax-1701q-compute.test.ts`.

**`lib/tax/1701q-inputs.ts`** — `gather1701QInputs()` pulls real numbers from
the DB: confirmed income records only (`confirmed_at is not null`, guards
against OCR guesses reaching a filing), summed per quarter using
`filing-periods.ts`'s period/alias config; prior-quarter tax paid from
`payment_intents` in states `handed_off | pending_verification | verified`.

**`supabase/migrations/018_1701q_eight_percent_rule.sql`** — applied to the
shared DB (`npx supabase db push`, confirmed in migration history). Adds:
- `tax_rule_sets` row `bir-1701q-eight-percent`, `status: active`,
  `effective_from: 2018-01-01`, citing RA 10963 / RR 8-2018
- `taxpayer_profiles.eight_percent_elected_year` (int, nullable) — real 1701Q
  filing requires electing 8% on the Q1 return, irrevocably for the year; this
  records that. Existing demo accounts backfilled to `2026`.

**`app/api/filing/pdf/route.ts`** — the 1701Q PDF now computes from real data:
`getEightPercentRule` → `gather1701QInputs` → `computeQuarterly1701Q`, feeding
`buildIdentityFromSso` (already real, from the SSO branch) plus the computed
Schedule II/III. **Verified by rendering the actual PDF** for Josie
(`josie@yopmail.com`, real confirmed record: Q2 2026, ₱950,000) — screenshot
sent to the user showing Tax Due ₱56,000 = `(950,000 − 250,000) × 8%`,
correctly on the form, not the fixture.

**`lib/agentic/orchestrator.ts` + `lib/agentic/types.ts`** — this is the part
that's **written but UNVERIFIED at runtime**. `prepareComputation()` now
branches: for `formCode === "1701Q"` it calls the real engine above instead of
`computeDemoLiability`, and stores the full breakdown in
`computation_runs.output_snapshot` (widened type,
`{amountPayable, currency} & Partial<QuarterlyComputation>`) instead of just
`{amountPayable, currency}`. For `formCode === "1701A"` (annual, quarter 4) it
still calls `computeDemoLiability` — **deliberately**, see "Known gaps" below.
The `rule:` block returned to the UI (drives the "AUTHORITY" card) now reflects
the real rule for 1701Q instead of always saying "illustrative six-percent
liability." `npx tsc --noEmit` is clean, and the full suite is
**61/61 passing** (49 pre-existing + 12 new), but note: the pre-existing suite
has **zero runtime tests of `orchestrator.ts`** — the one test that touches it
(`tests/agentic-controls.test.ts`) only does a source-text regex match, not an
actual call. So typecheck + unit tests passing does not mean this code path
has actually run.

## What's NOT done — stop here and read before touching UI

### 1. The 6%/8% conflict inside orchestrator.ts is resolved in code, not confirmed in the browser

I could not verify the filing-tracker UI shows the new number, because
**`/dashboard` and `/filing` are both stuck on their `loading.tsx` skeleton
indefinitely** — and this reproduces on `/dashboard`, which I never touched
this session. Confirmed via `git log`: introduced by
`6080faf2 feat: implement loading skeletons for various components and
optimize data fetching with Promise.all`, part of the 3 commits pulled in from
`main` during the earlier rebase. Confirmed via `fetch('/dashboard').then(r
=> r.text())` in-browser: the response is 200, 79KB, but only contains the
Suspense-boundary replacement script (`$RC("B:0","S:0")`) — the actual
`READINESS`/dashboard content is never in the body. This is a **pre-existing
bug unrelated to this branch**, but it means: **nobody has visually confirmed
the filing tracker shows ₱56,000 instead of the old 6% number.** Fix the
loading-skeleton hang first, then check the Review tab.

### 2. 1701A (annual/Q4) still uses the fake 6% rule — on purpose

I only researched and verified the **quarterly** 8% computation. The annual
return has different mechanics I haven't looked into (reconciliation against
all 4 quarters, OSD vs itemized choice, possibly a different form entirely —
1701A vs the new 1701-MS from RMC 20-2026). Rather than guess, `formCode ===
"1701A"` in `prepareComputation` still calls `computeDemoLiability`, so it
keeps showing "illustrative six-percent liability" — which is now honestly
labeled, not silently wrong. **Someone needs to research 1701A before this
gap closes.**

### 3. `eight_percent_elected_year` is a stub, not a real election flow

The migration adds the column and backfills existing accounts to 2026 so
nothing breaks, but **nothing in the app lets a taxpayer actually elect 8%**.
Real BIR filing requires electing on the Q1 return, irrevocably. Right now
it's assumed true for everyone. Fine for a demo; not fine for production.

### 4. Line 50 semantics unverified against a primary source

All research came from tax-service blogs (Taxify, SweldoPH, MPM, Respicio),
not RR 8-2018 directly. The two possible readings of line 50 (cumulative
*gross* vs cumulative *taxable*, with 250k claimed once vs every quarter) are
mathematically identical — this doesn't change what anyone owes — but they
print different numbers on lines 50/52. I used cumulative-gross-every-quarter,
matching the existing fixture (`lib/pdf/1701q/dummy-data.ts`). Worth a BIR-side
confirmation before this goes anywhere real.

### 5. Non-operating income (48), prior-year credits (55), and 2307 withholding
default to zero

No source exists for any of these in the current schema. Zero is defensible
for a demo. 2307 in particular is likely wrong for a real freelancer with
corporate clients — they'd have withholding certificates to claim.

## Files touched this branch

```
app/api/filing/pdf/route.ts        - real computation feeds the PDF (verified)
lib/agentic/orchestrator.ts        - prepareComputation branches on formCode (unverified in UI)
lib/agentic/types.ts               - widened ComputationRun/AgenticPlan types
lib/types.ts                       - TaxpayerProfile.eight_percent_elected_year
lib/tax/rule-sets.ts               - new
lib/tax/1701q-compute.ts           - new
lib/tax/1701q-inputs.ts            - new
supabase/migrations/018_...sql     - new, applied to shared DB
tests/tax-1701q-compute.test.ts    - new, 12/12 passing
```

Nothing here touches `domain.ts`'s `DEMO_TAX_RATE`/`computeDemoLiability`
directly — they're still there, still used by the 1701A path.

## Suggested next steps, in order

1. Fix the loading-skeleton hang (pre-existing, blocks visually confirming
   anything on `/dashboard` or `/filing`)
2. Sign in, open the Q2 Review tab, confirm the "Amount payable" card shows
   ₱56,000 for Josie, not the old 6% figure
3. Decide whether to research 1701A now or leave it flagged
4. Get RR 8-2018 or a BIR-credentialed reviewer to confirm the line 50
   convention
5. Commit + push this branch, open a PR referencing #3

## Sources used for the 8% computation

- [Taxify — BIR Form 1701Q guide](https://taxify.ph/blog/bir-form-1701q-quarterly-guide/)
- [SweldoPH — 8% tax for freelancers](https://sweldoph.com/guides/freelancer-tax-8-percent)
- [Respicio — 8% registration](https://www.respicio.ph/commentaries/bir-registration-for-self-employed-professionals-under-the-8-income-tax-rate)
- [MPM — BIR Form 1701Q](https://mpm.ph/bir-form-1701q/)
- [Taxify — Philippine Tax Guide 2026](https://taxify.ph/philippine-tax/) (confirms rate/threshold/deadlines unchanged for 2026)
- [Taxify — BIR Form 1701-MS guide](https://taxify.ph/blog/bir-form-1701ms-guide-freelancers-small-business/) (RMC 20-2026, relevant only to the 1701A gap above)
