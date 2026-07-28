import type { EightPercentRuleConfig } from "@/lib/tax/rule-sets";

export type QuarterlyComputationInput = {
  /** 1, 2 or 3. There is no fourth-quarter 1701Q; the year closes on 1701A. */
  quarter: 1 | 2 | 3;
  /** Confirmed gross sales/receipts for this quarter, net of returns and discounts. */
  grossThisQuarter: number;
  /** Confirmed gross for every earlier quarter of the same taxable year. */
  grossPriorQuarters: number;
  /** Income tax already paid on earlier quarters of the same year. */
  taxPaidPriorQuarters: number;
  /** Creditable tax withheld per BIR Form 2307 for this quarter. */
  creditableTaxWithheldThisQuarter?: number;
  nonOperatingIncome?: number;
  priorYearsExcessCredits?: number;
  /** eTax taxpayer category key, decides entitlement to the annual reduction. */
  taxpayerCategory: string;
  /** True when the taxpayer elected the 8% option for this taxable year. */
  eightPercentElected: boolean;
};

export type QuarterlyComputation = {
  /** 47 */ salesRevenuesReceiptsFees: number;
  /** 48 */ nonOperatingIncome: number;
  /** 49 */ totalIncomeThisQuarter: number;
  /** 50 */ taxableIncomePreviousQuarters: number;
  /** 51 */ cumulativeTaxableIncome: number;
  /** 52 */ allowableReduction: number;
  /** 53 */ taxableIncomeToDate: number;
  /** 54 */ taxDue: number;
  /** 55 */ priorYearsExcessCredits: number;
  /** 56 */ taxPaymentsPreviousQuarters: number;
  /** 57 */ creditableTaxWithheldPreviousQuarters: number;
  /** 58 */ creditableTaxWithheld2307ThisQuarter: number;
  /** 59 */ taxPaidReturnPreviouslyFiled: number;
  /** 60 */ foreignTaxCredits: number;
  /** 61 */ otherTaxCreditsPayments: number;
  /** 62 */ totalTaxCreditsPayments: number;
  /** 63 — negative means an overpayment carried forward, not an error. */
  taxPayable: number;
  totalAmountPayable: number;
  warnings: string[];
  assumptions: string[];
};

/**
 * The form forbids centavos: "49 Centavos or Less drop down; 50 or more round
 * up". Rounding follows the rule set so a rule with different precision does
 * not need a code change.
 */
function applyRounding(value: number, rounding: EightPercentRuleConfig["rounding"]) {
  return rounding === "whole_peso"
    ? Math.round(value)
    : Math.round(value * 100) / 100;
}

/**
 * Computes BIR Form 1701Q Part V Schedules II and III for the 8% income tax
 * option.
 *
 * The return is cumulative year to date: each quarter restates income from
 * January, taxes the running total, then credits back tax already paid. Line 50
 * therefore carries cumulative gross from earlier quarters while line 52 applies
 * the annual reduction on every return — arithmetically identical to carrying
 * post-reduction taxable income and claiming the reduction once.
 */
export function computeQuarterly1701Q(
  input: QuarterlyComputationInput,
  config: EightPercentRuleConfig,
): QuarterlyComputation {
  const warnings: string[] = [];
  const assumptions: string[] = [];

  const rate = Number(config.rate);
  const annualReduction = Number(config.annualReduction);
  const vatThreshold = Number(config.vatThreshold);
  const round = (value: number) => applyRounding(value, config.rounding);

  if (!input.eightPercentElected) {
    warnings.push(
      "The 8% option was not elected for this taxable year, so graduated rates apply. This computation assumes the 8% option.",
    );
  }

  const salesRevenuesReceiptsFees = round(input.grossThisQuarter);
  const nonOperatingIncome = round(input.nonOperatingIncome ?? 0);
  const totalIncomeThisQuarter = salesRevenuesReceiptsFees + nonOperatingIncome;
  const taxableIncomePreviousQuarters = round(input.grossPriorQuarters);
  const cumulativeTaxableIncome =
    totalIncomeThisQuarter + taxableIncomePreviousQuarters;

  if (cumulativeTaxableIncome > vatThreshold) {
    warnings.push(
      `Cumulative gross of ${cumulativeTaxableIncome.toLocaleString("en-PH")} exceeds the ${vatThreshold.toLocaleString("en-PH")} VAT threshold. The 8% election is void for the entire taxable year and graduated rates apply, with 8% already paid treated as a credit. This computation is not valid for filing.`,
    );
  }

  // Mixed-income earners already used the zero bracket against their
  // compensation, so the annual reduction is not available to them.
  const reductionApplies = config.reductionEligibleCategories.includes(
    input.taxpayerCategory,
  );
  const allowableReduction = reductionApplies ? round(annualReduction) : 0;

  if (!reductionApplies) {
    assumptions.push(
      `No ${annualReduction.toLocaleString("en-PH")} annual reduction: it is available only to taxpayers earning purely from business or profession.`,
    );
  }

  const taxableIncomeToDate = Math.max(
    0,
    cumulativeTaxableIncome - allowableReduction,
  );
  const taxDue = round(taxableIncomeToDate * rate);

  const priorYearsExcessCredits = round(input.priorYearsExcessCredits ?? 0);
  const taxPaymentsPreviousQuarters = round(input.taxPaidPriorQuarters);
  const creditableTaxWithheld2307ThisQuarter = round(
    input.creditableTaxWithheldThisQuarter ?? 0,
  );

  if (!input.creditableTaxWithheldThisQuarter) {
    assumptions.push(
      "No creditable tax withheld (BIR Form 2307) recorded for this quarter.",
    );
  }

  const totalTaxCreditsPayments =
    priorYearsExcessCredits +
    taxPaymentsPreviousQuarters +
    creditableTaxWithheld2307ThisQuarter;

  const taxPayable = taxDue - totalTaxCreditsPayments;

  if (taxPayable < 0) {
    assumptions.push(
      "Credits exceed the tax due, so this quarter shows an overpayment to carry forward.",
    );
  }

  assumptions.push(
    `Computed at ${(rate * 100).toFixed(0)}% of cumulative gross less the annual reduction, per ${config.kind}.`,
  );

  return {
    salesRevenuesReceiptsFees,
    nonOperatingIncome,
    totalIncomeThisQuarter,
    taxableIncomePreviousQuarters,
    cumulativeTaxableIncome,
    allowableReduction,
    taxableIncomeToDate,
    taxDue,
    priorYearsExcessCredits,
    taxPaymentsPreviousQuarters,
    creditableTaxWithheldPreviousQuarters: 0,
    creditableTaxWithheld2307ThisQuarter,
    taxPaidReturnPreviouslyFiled: 0,
    foreignTaxCredits: 0,
    otherTaxCreditsPayments: 0,
    totalTaxCreditsPayments,
    taxPayable,
    totalAmountPayable: taxPayable,
    warnings,
    assumptions,
  };
}
