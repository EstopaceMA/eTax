import { createAdminClient } from "@/lib/supabase/admin";

/** Configuration for the 8% income tax option, as stored in tax_rule_sets. */
export type EightPercentRuleConfig = {
  kind: "eight_percent_gross";
  currency: string;
  /** Fraction, e.g. "0.08". */
  rate: string;
  /** Annual reduction under Sec. 24(A)(2)(b), e.g. "250000". */
  annualReduction: string;
  /** Gross ceiling above which the election is void, e.g. "3000000". */
  vatThreshold: string;
  /** eTax taxpayer category keys entitled to the annual reduction. */
  reductionEligibleCategories: string[];
  rounding: "whole_peso" | "2dp";
};

export type TaxRuleSet<TConfig> = {
  id: string;
  version: string;
  title: string;
  sourceTitle: string;
  sourceUrl: string | null;
  configuration: TConfig;
};

export const EIGHT_PERCENT_RULE_ID = "bir-1701q-eight-percent";

/**
 * Loads the rule set in force on the given date.
 *
 * Rules are date-ranged so a change in the law is a new row rather than a code
 * change, and a filing recomputed later still uses the rule that applied to its
 * period.
 */
export async function getEightPercentRule(
  onDate: string,
): Promise<TaxRuleSet<EightPercentRuleConfig>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tax_rule_sets")
    .select("id, version, title, source_title, source_url, configuration")
    .eq("id", EIGHT_PERCENT_RULE_ID)
    .eq("status", "active")
    .lte("effective_from", onDate)
    .or(`effective_to.is.null,effective_to.gte.${onDate}`)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `No active 8% tax rule set in force on ${onDate}${error ? `: ${error.message}` : ""}`,
    );
  }

  const configuration = data.configuration as EightPercentRuleConfig;

  if (configuration.kind !== "eight_percent_gross") {
    throw new Error(
      `Rule ${data.id} is "${configuration.kind}", expected "eight_percent_gross"`,
    );
  }

  return {
    id: data.id as string,
    version: data.version as string,
    title: data.title as string,
    sourceTitle: data.source_title as string,
    sourceUrl: (data.source_url as string | null) ?? null,
    configuration,
  };
}
