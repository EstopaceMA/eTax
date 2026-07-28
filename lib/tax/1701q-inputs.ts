import { createAdminClient } from "@/lib/supabase/admin";
import { filingQuarters } from "@/lib/filing-periods";
import { taxpayerCategories } from "@/lib/taxpayer-categories";
import type { QuarterlyComputationInput } from "@/lib/tax/1701q-compute";

/** Payment states that count as tax actually paid for a quarter. */
const SETTLED_PAYMENT_STATES = ["handed_off", "pending_verification", "verified"];

/**
 * taxpayer_profiles.taxpayer_type stores the human label, so map it back to the
 * category key the rule set is written against.
 */
export function resolveTaxpayerCategory(taxpayerType: string | null | undefined) {
  const match = taxpayerCategories.find(
    (category) => category.label === taxpayerType,
  );

  return match?.key ?? "self_employed_professional";
}

/** Every period string for quarters earlier than the given one, same year. */
function priorPeriods(quarter: 1 | 2 | 3) {
  return filingQuarters
    .filter((meta) => meta.quarter < quarter)
    .flatMap((meta) => [meta.period, ...(meta.periodAliases ?? [])]);
}

function currentPeriods(quarter: 1 | 2 | 3) {
  const meta = filingQuarters.find((entry) => entry.quarter === quarter);
  return meta ? [meta.period, ...(meta.periodAliases ?? [])] : [];
}

/**
 * Gathers everything the 1701Q computation needs for one taxpayer and quarter.
 *
 * Only confirmed income records are counted — provisional extractions are OCR
 * estimates and must not reach a tax return.
 */
export async function gather1701QInputs({
  userId,
  quarter,
  taxpayerType,
  eightPercentElectedYear,
  taxYear,
}: {
  userId: string;
  quarter: 1 | 2 | 3;
  taxpayerType: string | null | undefined;
  eightPercentElectedYear: number | null | undefined;
  taxYear: number;
}): Promise<QuarterlyComputationInput> {
  const supabase = createAdminClient();

  const { data: records } = await supabase
    .from("income_record_uploads")
    .select("period, total_income, confirmed_at")
    .eq("user_id", userId)
    .not("confirmed_at", "is", null)
    .not("total_income", "is", null);

  const rows = (records ?? []) as Array<{
    period: string;
    total_income: number | string | null;
  }>;

  const prior = new Set(priorPeriods(quarter));
  const current = new Set(currentPeriods(quarter));

  let grossThisQuarter = 0;
  let grossPriorQuarters = 0;

  for (const row of rows) {
    const amount = Number(row.total_income ?? 0);

    if (current.has(row.period)) {
      grossThisQuarter += amount;
    } else if (prior.has(row.period)) {
      grossPriorQuarters += amount;
    }
  }

  // Tax already settled on earlier quarters of the same year (line 56).
  const priorObligationPeriods = priorPeriods(quarter);
  let taxPaidPriorQuarters = 0;

  if (priorObligationPeriods.length > 0) {
    const { data: obligations } = await supabase
      .from("filing_obligations")
      .select("id")
      .eq("user_id", userId)
      .in("period", priorObligationPeriods);

    const obligationIds = (obligations ?? []).map((row) => row.id as string);

    if (obligationIds.length > 0) {
      const { data: payments } = await supabase
        .from("payment_intents")
        .select("amount, state")
        .eq("user_id", userId)
        .in("filing_obligation_id", obligationIds)
        .in("state", SETTLED_PAYMENT_STATES);

      taxPaidPriorQuarters = (payments ?? []).reduce(
        (sum, row) => sum + Number((row as { amount: number | string }).amount ?? 0),
        0,
      );
    }
  }

  return {
    quarter,
    grossThisQuarter,
    grossPriorQuarters,
    taxPaidPriorQuarters,
    taxpayerCategory: resolveTaxpayerCategory(taxpayerType),
    eightPercentElected: eightPercentElectedYear === taxYear,
  };
}
