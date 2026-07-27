import type { PDFFont } from "pdf-lib";

import type { Form1701QData } from "./types";

export type Form1701QIssue = {
  field: string;
  message: string;
};

export class Form1701QValidationError extends Error {
  constructor(public readonly issues: Form1701QIssue[]) {
    super(issues.map(({ field, message }) => `${field}: ${message}`).join("; "));
    this.name = "Form1701QValidationError";
  }
}

function text(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function required(value: string, field: string, issues: Form1701QIssue[]) {
  const normalized = text(value);
  if (!normalized) issues.push({ field, message: "is required" });
  return normalized;
}

function normalizeTin(value: string, issues: Form1701QIssue[]) {
  if (!/^[\d\s-]+$/.test(value)) {
    issues.push({ field: "identity.tin", message: "must contain only digits, spaces, or hyphens" });
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) {
    issues.push({ field: "identity.tin", message: "must contain exactly 9 digits" });
  }
  return digits;
}

function normalizeDate(value: string, issues: Form1701QIssue[]) {
  const normalized = text(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  const parts = iso
    ? { year: iso[1], month: iso[2], day: iso[3] }
    : us
      ? { year: us[3], month: us[1], day: us[2] }
      : null;

  if (!parts) {
    issues.push({ field: "identity.dateOfBirth", message: "must use MM/DD/YYYY or YYYY-MM-DD" });
    return normalized;
  }

  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  if (
    date.getUTCFullYear() !== Number(parts.year) ||
    date.getUTCMonth() + 1 !== Number(parts.month) ||
    date.getUTCDate() !== Number(parts.day)
  ) {
    issues.push({ field: "identity.dateOfBirth", message: "must be a valid calendar date" });
  }
  return `${parts.month}/${parts.day}/${parts.year}`;
}

function normalizeAmount(value: number, field: string, issues: Form1701QIssue[]) {
  if (!Number.isFinite(value)) {
    issues.push({ field, message: "must be a finite number" });
    return 0;
  }
  return value < 0 ? -Math.round(Math.abs(value)) : Math.round(value);
}

export function formatPesos(value: number) {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Form1701QValidationError([
      { field: "amount", message: "must be a finite whole-peso value" },
    ]);
  }
  const absolute = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return value < 0 ? `-${absolute}` : absolute;
}

export function normalizeForm1701QData(data: Form1701QData): Form1701QData {
  const issues: Form1701QIssue[] = [];
  const year = text(data.year);
  if (!/^\d{4}$/.test(year)) {
    issues.push({ field: "year", message: "must contain exactly 4 digits" });
  }

  const rdoCode = text(data.identity.rdoCode).toUpperCase();
  if (!/^\d{2,3}[A-Z]?$/.test(rdoCode)) {
    issues.push({ field: "identity.rdoCode", message: "must be a 2-3 digit RDO code with an optional letter" });
  }

  const zipCode = text(data.identity.zipCode);
  if (!/^\d{4}$/.test(zipCode)) {
    issues.push({ field: "identity.zipCode", message: "must contain exactly 4 digits" });
  }

  const registeredName = required(data.identity.registeredName, "identity.registeredName", issues).toUpperCase();
  const signatureName = required(data.signatureName, "signatureName", issues).toUpperCase();
  const registeredAddress = required(
    data.identity.registeredAddress,
    "identity.registeredAddress",
    issues,
  ).toUpperCase();
  const registeredAddressLine2 = data.identity.registeredAddressLine2
    ? text(data.identity.registeredAddressLine2).toUpperCase()
    : undefined;

  const amount = (value: number, field: string) => normalizeAmount(value, field, issues);
  const normalized: Form1701QData = {
    ...data,
    year,
    identity: {
      ...data.identity,
      tin: normalizeTin(data.identity.tin, issues),
      rdoCode,
      registeredName,
      registeredAddress,
      registeredAddressLine2,
      zipCode,
      dateOfBirth: normalizeDate(data.identity.dateOfBirth, issues),
      email: required(data.identity.email, "identity.email", issues),
      citizenship: required(data.identity.citizenship, "identity.citizenship", issues).toUpperCase(),
    },
    scheduleII: {
      salesRevenuesReceiptsFees: amount(data.scheduleII.salesRevenuesReceiptsFees, "scheduleII.salesRevenuesReceiptsFees"),
      nonOperatingIncome: amount(data.scheduleII.nonOperatingIncome, "scheduleII.nonOperatingIncome"),
      totalIncomeThisQuarter: amount(data.scheduleII.totalIncomeThisQuarter, "scheduleII.totalIncomeThisQuarter"),
      taxableIncomePreviousQuarters: amount(data.scheduleII.taxableIncomePreviousQuarters, "scheduleII.taxableIncomePreviousQuarters"),
      cumulativeTaxableIncome: amount(data.scheduleII.cumulativeTaxableIncome, "scheduleII.cumulativeTaxableIncome"),
      allowableReduction: amount(data.scheduleII.allowableReduction, "scheduleII.allowableReduction"),
      taxableIncomeToDate: amount(data.scheduleII.taxableIncomeToDate, "scheduleII.taxableIncomeToDate"),
      taxDue: amount(data.scheduleII.taxDue, "scheduleII.taxDue"),
    },
    scheduleIII: {
      priorYearsExcessCredits: amount(data.scheduleIII.priorYearsExcessCredits, "scheduleIII.priorYearsExcessCredits"),
      taxPaymentsPreviousQuarters: amount(data.scheduleIII.taxPaymentsPreviousQuarters, "scheduleIII.taxPaymentsPreviousQuarters"),
      creditableTaxWithheldPreviousQuarters: amount(data.scheduleIII.creditableTaxWithheldPreviousQuarters, "scheduleIII.creditableTaxWithheldPreviousQuarters"),
      creditableTaxWithheld2307ThisQuarter: amount(data.scheduleIII.creditableTaxWithheld2307ThisQuarter, "scheduleIII.creditableTaxWithheld2307ThisQuarter"),
      taxPaidReturnPreviouslyFiled: amount(data.scheduleIII.taxPaidReturnPreviouslyFiled, "scheduleIII.taxPaidReturnPreviouslyFiled"),
      foreignTaxCredits: amount(data.scheduleIII.foreignTaxCredits, "scheduleIII.foreignTaxCredits"),
      otherTaxCreditsPayments: amount(data.scheduleIII.otherTaxCreditsPayments, "scheduleIII.otherTaxCreditsPayments"),
      totalTaxCreditsPayments: amount(data.scheduleIII.totalTaxCreditsPayments, "scheduleIII.totalTaxCreditsPayments"),
    },
    taxPayable: amount(data.taxPayable, "taxPayable"),
    totalAmountPayable: amount(data.totalAmountPayable, "totalAmountPayable"),
    signatureName,
  };

  if (issues.length) throw new Form1701QValidationError(issues);
  return normalized;
}

export function fitSingleLine(
  value: string,
  font: PDFFont,
  width: number,
  options: { field: string; maxSize?: number; minSize?: number; padding?: number },
) {
  const maxSize = options.maxSize ?? 7;
  const minSize = options.minSize ?? 4;
  const availableWidth = width - (options.padding ?? 3);
  for (let size = maxSize; size >= minSize; size -= 0.25) {
    if (font.widthOfTextAtSize(value, size) <= availableWidth) return size;
  }
  throw new Form1701QValidationError([
    { field: options.field, message: `does not fit its PDF field at the minimum ${minSize}pt font size` },
  ]);
}

function wrapAtSize(value: string, font: PDFFont, widths: number[], size: number) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  for (const width of widths) {
    let line = "";
    while (words.length) {
      const candidate = line ? `${line} ${words[0]}` : words[0];
      if (font.widthOfTextAtSize(candidate, size) > width) break;
      line = candidate;
      words.shift();
    }
    lines.push(line);
  }
  return words.length === 0 && Boolean(lines[0]) ? lines : null;
}

export function fitAddressLines(
  line1: string,
  line2: string | undefined,
  font: PDFFont,
  widths: [number, number],
) {
  const explicit = line2 ? [line1, line2] : null;
  for (let size = 7; size >= 4; size -= 0.25) {
    if (explicit) {
      if (explicit.every((line, index) => font.widthOfTextAtSize(line, size) <= widths[index])) {
        return { lines: explicit as [string, string], size };
      }
      continue;
    }
    const wrapped = wrapAtSize(line1, font, widths, size);
    if (wrapped) return { lines: wrapped as [string, string], size };
  }
  throw new Form1701QValidationError([
    { field: "identity.registeredAddress", message: "does not fit the two available address lines at the minimum 4pt font size" },
  ]);
}
