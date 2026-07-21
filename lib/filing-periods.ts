import type { FilingStatus, PaymentStatus } from "@/lib/types";

export type FilingQuarter = 1 | 2 | 3 | 4;

export type QuarterlyFilingSeed = {
  form_name: string;
  period: string;
  due_date: string;
  status: FilingStatus;
  payment_status: PaymentStatus;
};

export const filingYear = 2026;

export const filingQuarters: Array<{
  quarter: FilingQuarter;
  label: string;
  shortLabel: string;
  period: string;
  periodAliases?: string[];
  dueDate: string;
  formCode: "1701Q" | "1701A";
  formTitle: string;
  pdfFile: string;
}> = [
  {
    quarter: 1,
    label: "1st Quarter",
    shortLabel: "Q1",
    period: `Q1 ${filingYear}`,
    dueDate: `${filingYear}-05-15`,
    formCode: "1701Q",
    formTitle: "Quarterly income tax return",
    pdfFile: "1701Q2018.pdf",
  },
  {
    quarter: 2,
    label: "2nd Quarter",
    shortLabel: "Q2",
    period: `Q2 ${filingYear}`,
    dueDate: `${filingYear}-08-15`,
    formCode: "1701Q",
    formTitle: "Quarterly income tax return",
    pdfFile: "1701Q2018.pdf",
  },
  {
    quarter: 3,
    label: "3rd Quarter",
    shortLabel: "Q3",
    period: `Q3 ${filingYear}`,
    dueDate: `${filingYear}-11-15`,
    formCode: "1701Q",
    formTitle: "Quarterly income tax return",
    pdfFile: "1701Q2018.pdf",
  },
  {
    quarter: 4,
    label: "4th Quarter",
    shortLabel: "Annual",
    period: `Annual ${filingYear}`,
    periodAliases: [`Q4 ${filingYear}`],
    dueDate: `${filingYear + 1}-04-15`,
    formCode: "1701A",
    formTitle: "Annual income tax return",
    pdfFile: "1701A2018.pdf",
  },
];

export function getQuarterlyFilingSeeds(): QuarterlyFilingSeed[] {
  return filingQuarters.map(({ quarter, period, dueDate, formTitle }) => ({
    form_name: formTitle,
    period,
    due_date: dueDate,
    status: quarter === 2 ? "ready" : "draft",
    payment_status: "unpaid",
  }));
}

export function parseFilingQuarter(value: string | null): FilingQuarter {
  const quarter = Number(value);

  if (quarter === 1 || quarter === 2 || quarter === 3 || quarter === 4) {
    return quarter;
  }

  return 1;
}

export function getQuarterMeta(quarter: FilingQuarter) {
  return filingQuarters.find((item) => item.quarter === quarter) ?? filingQuarters[0];
}

export function getPeriodSlug(period: string) {
  return period.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
