import assert from "node:assert/strict";
import test from "node:test";

import { computeQuarterly1701Q } from "../lib/tax/1701q-compute";
import type { EightPercentRuleConfig } from "../lib/tax/rule-sets";

const config: EightPercentRuleConfig = {
  kind: "eight_percent_gross",
  currency: "PHP",
  rate: "0.08",
  annualReduction: "250000",
  vatThreshold: "3000000",
  reductionEligibleCategories: [
    "self_employed_professional",
    "single_proprietor",
  ],
  rounding: "whole_peso",
};

function base(overrides: Partial<Parameters<typeof computeQuarterly1701Q>[0]> = {}) {
  return computeQuarterly1701Q(
    {
      quarter: 1,
      grossThisQuarter: 0,
      grossPriorQuarters: 0,
      taxPaidPriorQuarters: 0,
      taxpayerCategory: "self_employed_professional",
      eightPercentElected: true,
      ...overrides,
    },
    config,
  );
}

test("Q1 taxes only the excess over the annual reduction", () => {
  const result = base({ grossThisQuarter: 300_000 });

  assert.equal(result.cumulativeTaxableIncome, 300_000);
  assert.equal(result.allowableReduction, 250_000);
  assert.equal(result.taxableIncomeToDate, 50_000);
  assert.equal(result.taxDue, 4_000);
  assert.equal(result.taxPayable, 4_000);
});

test("Q2 is cumulative and credits the tax already paid", () => {
  const result = base({
    quarter: 2,
    grossThisQuarter: 300_000,
    grossPriorQuarters: 300_000,
    taxPaidPriorQuarters: 4_000,
  });

  assert.equal(result.cumulativeTaxableIncome, 600_000);
  assert.equal(result.taxableIncomeToDate, 350_000);
  assert.equal(result.taxDue, 28_000);
  assert.equal(result.taxPaymentsPreviousQuarters, 4_000);
  assert.equal(result.taxPayable, 24_000);
});

test("Q3 keeps the reduction to once per year", () => {
  const result = base({
    quarter: 3,
    grossThisQuarter: 300_000,
    grossPriorQuarters: 600_000,
    taxPaidPriorQuarters: 28_000,
  });

  assert.equal(result.taxableIncomeToDate, 650_000);
  assert.equal(result.taxDue, 52_000);
  assert.equal(result.taxPayable, 24_000);
});

test("income below the annual reduction owes nothing and never goes negative", () => {
  const result = base({ grossThisQuarter: 120_000 });

  assert.equal(result.taxableIncomeToDate, 0);
  assert.equal(result.taxDue, 0);
});

test("a quarter with no income still produces a nil return", () => {
  const result = base({ grossThisQuarter: 0 });

  assert.equal(result.totalIncomeThisQuarter, 0);
  assert.equal(result.taxDue, 0);
  assert.equal(result.taxPayable, 0);
});

test("credits beyond the tax due leave an overpayment rather than an error", () => {
  const result = base({
    quarter: 2,
    grossThisQuarter: 10_000,
    grossPriorQuarters: 300_000,
    taxPaidPriorQuarters: 4_000,
  });

  assert.equal(result.taxDue, 4_800);
  assert.equal(result.taxPayable, 800);

  const overpaid = base({
    quarter: 2,
    grossThisQuarter: 0,
    grossPriorQuarters: 300_000,
    taxPaidPriorQuarters: 10_000,
  });

  assert.ok(overpaid.taxPayable < 0);
  assert.ok(
    overpaid.assumptions.some((note) => note.includes("overpayment")),
    "an overpayment should be called out",
  );
});

test("mixed-income earners get no annual reduction", () => {
  const result = base({
    grossThisQuarter: 300_000,
    taxpayerCategory: "mixed_income",
  });

  assert.equal(result.allowableReduction, 0);
  assert.equal(result.taxableIncomeToDate, 300_000);
  assert.equal(result.taxDue, 24_000);
});

test("crossing the VAT threshold warns that the election is void", () => {
  const result = base({
    quarter: 3,
    grossThisQuarter: 1_000_000,
    grossPriorQuarters: 2_500_000,
  });

  assert.ok(
    result.warnings.some((warning) => warning.includes("VAT threshold")),
    "breaching the threshold must warn",
  );
  assert.ok(
    result.warnings.some((warning) => warning.includes("not valid for filing")),
    "the warning must say the return cannot be filed as computed",
  );
});

test("not electing the 8% option is flagged", () => {
  const result = base({ grossThisQuarter: 300_000, eightPercentElected: false });

  assert.ok(
    result.warnings.some((warning) => warning.includes("graduated rates")),
    "an unelected 8% computation must warn",
  );
});

test("2307 withholding is credited", () => {
  const result = base({
    grossThisQuarter: 300_000,
    creditableTaxWithheldThisQuarter: 1_500,
  });

  assert.equal(result.creditableTaxWithheld2307ThisQuarter, 1_500);
  assert.equal(result.totalTaxCreditsPayments, 1_500);
  assert.equal(result.taxPayable, 2_500);
});

test("amounts are rounded to whole pesos", () => {
  const result = base({ grossThisQuarter: 250_012.5 });

  assert.equal(result.salesRevenuesReceiptsFees, 250_013);
  assert.equal(result.taxableIncomeToDate, 13);
  assert.equal(result.taxDue, 1);
  assert.ok(Number.isInteger(result.taxDue));
});

test("rounding follows the rule set rather than being assumed", () => {
  const twoDp = computeQuarterly1701Q(
    {
      quarter: 1,
      grossThisQuarter: 300_000.55,
      grossPriorQuarters: 0,
      taxPaidPriorQuarters: 0,
      taxpayerCategory: "self_employed_professional",
      eightPercentElected: true,
    },
    { ...config, rounding: "2dp" },
  );

  assert.equal(twoDp.salesRevenuesReceiptsFees, 300_000.55);
  assert.equal(twoDp.taxDue, 4_000.04);
});
