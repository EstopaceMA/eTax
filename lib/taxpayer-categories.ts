export type TaxpayerCategoryKey =
  | "compensation"
  | "self_employed_professional"
  | "single_proprietor"
  | "mixed_income"
  | "eo98_onett"
  | "non_individual";

export type TaxpayerCategory = {
  key: TaxpayerCategoryKey;
  label: string;
  plainLanguage: string;
  usualForm: string;
  defaultWorkType: string;
  defaultFilingFrequency: string;
};

export const taxpayerCategories: TaxpayerCategory[] = [
  {
    key: "compensation",
    label: "Employee / compensation earner",
    plainLanguage:
      "You earn salary or wages from an employer and do not operate a business or freelance practice.",
    usualForm: "BIR Form 1902",
    defaultWorkType: "Employee",
    defaultFilingFrequency: "Employer withholding and annual record checks",
  },
  {
    key: "self_employed_professional",
    label: "Self-employed professional / freelancer",
    plainLanguage:
      "You earn directly from clients, platforms, commissions, professional practice, or freelance work.",
    usualForm: "BIR Form 1901",
    defaultWorkType: "Self-employed professional",
    defaultFilingFrequency: "Quarterly and monthly checks",
  },
  {
    key: "single_proprietor",
    label: "Single proprietor",
    plainLanguage:
      "You operate a registered business as an individual owner, such as online selling or a small shop.",
    usualForm: "BIR Form 1901",
    defaultWorkType: "Single proprietor",
    defaultFilingFrequency: "Recurring business filing checks",
  },
  {
    key: "mixed_income",
    label: "Mixed-income earner",
    plainLanguage:
      "You have employment income and also earn from business, freelance, or professional work.",
    usualForm: "BIR Form 1901",
    defaultWorkType: "Employee with business or professional income",
    defaultFilingFrequency: "Employment and business filing checks",
  },
  {
    key: "eo98_onett",
    label: "E.O. 98 / one-time transaction",
    plainLanguage:
      "You need a TIN or tax record for a government, bank, estate, donor, or one-time transaction.",
    usualForm: "BIR Form 1904",
    defaultWorkType: "One-time or government transaction",
    defaultFilingFrequency: "Transaction-based checks",
  },
  {
    key: "non_individual",
    label: "Non-individual taxpayer",
    plainLanguage:
      "You are registering a corporation, partnership, cooperative, association, or similar organization.",
    usualForm: "BIR Form 1903",
    defaultWorkType: "Organization",
    defaultFilingFrequency: "Organization compliance checks",
  },
];

export function getTaxpayerCategory(value: string | undefined) {
  return taxpayerCategories.find((category) => category.key === value);
}

export function getTaxpayerCategoryLabel(value: string | undefined) {
  return (
    getTaxpayerCategory(value)?.label ??
    "Self-employed professional / freelancer"
  );
}

export function getTaxpayerCategoryDefaults(value: string | undefined) {
  const category = getTaxpayerCategory(value);

  return {
    taxpayerType: category?.label ?? "Self-employed professional / freelancer",
    workType: category?.defaultWorkType ?? "Self-employed professional",
    filingFrequency:
      category?.defaultFilingFrequency ?? "Quarterly and monthly checks",
  };
}
