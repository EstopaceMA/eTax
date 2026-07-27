/**
 * Data contract for filling BIR Form 1701Q (January 2018 ENCS).
 *
 * Phase 1 scope: single filer, purely self-employed / professional,
 * 8% flat-rate option (Part V Schedule II). No spouse, no graduated
 * schedule, no penalties.
 *
 * All peso amounts are whole pesos (the form forbids centavos:
 * "49 Centavos or Less drop down; 50 or more round up"). Rounding is
 * the caller's responsibility — this module only renders.
 */

export type Quarter = 1 | 2 | 3;

export type TaxpayerType = "single_proprietor" | "professional";

/** ATC codes relevant to the 8% path. */
export type Atc8Percent = "II015" | "II017";

export type Form1701QIdentity = {
  /** 9-digit TIN, digits only (branch code 00000 is preprinted). */
  tin: string;
  /** 3-digit RDO code, e.g. "039". */
  rdoCode: string;
  taxpayerType: TaxpayerType;
  atc: Atc8Percent;
  /** "Last Name, First Name, Middle Name" — CAPITAL LETTERS per form. */
  registeredName: string;
  registeredAddress: string;
  /** Optional continuation. When omitted, the address is wrapped across both lines. */
  registeredAddressLine2?: string;
  zipCode: string;
  /** MM/DD/YYYY */
  dateOfBirth: string;
  email: string;
  citizenship: string;
  claimingForeignTaxCredits: boolean;
};

/** Part V Schedule II — 8% IT rate computation, whole pesos. */
export type ScheduleII8Percent = {
  /** 47 — Sales/Revenues/Receipts/Fees (net). */
  salesRevenuesReceiptsFees: number;
  /** 48 — Non-operating income. */
  nonOperatingIncome: number;
  /** 49 — Total income for the quarter (47 + 48). */
  totalIncomeThisQuarter: number;
  /** 50 — Total taxable income previous quarter(s). */
  taxableIncomePreviousQuarters: number;
  /** 51 — Cumulative taxable income (49 + 50). */
  cumulativeTaxableIncome: number;
  /** 52 — Allowable reduction (₱250,000 for purely self-employed). */
  allowableReduction: number;
  /** 53 — Taxable income to date (51 − 52, floor 0). */
  taxableIncomeToDate: number;
  /** 54 — TAX DUE (53 × 8%). */
  taxDue: number;
};

/** Part V Schedule III — Tax credits/payments, whole pesos. */
export type ScheduleIIICredits = {
  /** 55 */ priorYearsExcessCredits: number;
  /** 56 */ taxPaymentsPreviousQuarters: number;
  /** 57 */ creditableTaxWithheldPreviousQuarters: number;
  /** 58 */ creditableTaxWithheld2307ThisQuarter: number;
  /** 59 */ taxPaidReturnPreviouslyFiled: number;
  /** 60 */ foreignTaxCredits: number;
  /** 61 */ otherTaxCreditsPayments: number;
  /** 62 — Total (55..61). */ totalTaxCreditsPayments: number;
};

export type Form1701QData = {
  year: string;
  quarter: Quarter;
  amendedReturn: boolean;
  identity: Form1701QIdentity;
  scheduleII: ScheduleII8Percent;
  scheduleIII: ScheduleIIICredits;
  /** 63 — Tax payable (54 − 62). */
  taxPayable: number;
  /** 68 / Part III 30 — Total amount payable (63 + penalties, none in scope). */
  totalAmountPayable: number;
  /** Signature line: printed name of taxpayer. */
  signatureName: string;
};

export type Render1701QOptions = {
  /** Keep the AcroForm editable unless the user explicitly requests flattening. */
  flatten?: boolean;
};
