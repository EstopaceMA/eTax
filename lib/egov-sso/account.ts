import { createAdminClient } from "@/lib/supabase/admin";
import { getTaxpayerCategoryDefaults } from "@/lib/taxpayer-categories";
import { lookupRdoCode } from "@/lib/bir/rdo-lookup";

interface LinkedAccountInput {
  ssoUid: string;
  email: string;
  fullName: string;
  /** Already-linked auth user id, when the stored profile has one. */
  userId?: string | null;
}

/**
 * Finds (or creates) the auth.users row that belongs to an eGov SSO identity
 * and records the link on public.egov_sso_profiles.user_id.
 *
 * sso_uid is the durable key: the same citizen signing in again resolves to the
 * same auth user rather than a duplicate account.
 */
export async function linkSsoAccount({
  ssoUid,
  email,
  fullName,
  userId,
}: LinkedAccountInput): Promise<string> {
  const supabase = createAdminClient();

  if (userId) {
    return userId;
  }

  // An auth user may already exist for this email from an earlier signup.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Could not look up auth users: ${listError.message}`);
  }

  const existing = list.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  let resolvedUserId = existing?.id;

  if (!resolvedUserId) {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName, sso_uid: ssoUid },
      });

    if (createError || !created.user) {
      throw new Error(
        `Could not create an account for ${email}: ${createError?.message ?? "unknown error"}`,
      );
    }

    resolvedUserId = created.user.id;
  }

  const { error: linkError } = await supabase
    .from("egov_sso_profiles")
    .update({ user_id: resolvedUserId, updated_at: new Date().toISOString() })
    .eq("sso_uid", ssoUid);

  if (linkError) {
    throw new Error(`Could not link SSO profile to account: ${linkError.message}`);
  }

  return resolvedUserId;
}

/**
 * Sets taxpayer_profiles.rdo from the taxpayer's eGov address on first sign-in.
 *
 * Name, mobile and TIN are read straight from egov_sso_profiles, so the only
 * thing worth deriving here is the Revenue District Office — and only when it
 * is still empty, so a taxpayer's own correction is never overwritten.
 */
export async function syncTaxpayerRdo(
  userId: string,
  address: { municipality?: string | null; province?: string | null },
) {
  const suggested = lookupRdoCode(address);

  if (!suggested) {
    return;
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("taxpayer_profiles")
    .select("id, rdo")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (!existing.rdo) {
      await supabase
        .from("taxpayer_profiles")
        .update({ rdo: suggested.code, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }

    return;
  }

  const defaults = getTaxpayerCategoryDefaults(undefined);

  await supabase.from("taxpayer_profiles").insert({
    user_id: userId,
    taxpayer_type: defaults.taxpayerType,
    work_type: defaults.workType,
    registration_status: "Already registered",
    rdo: suggested.code,
    filing_frequency: defaults.filingFrequency,
  });
}
