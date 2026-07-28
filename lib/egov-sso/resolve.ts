import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForToken, fetchSsoProfile } from "@/lib/egov-sso/client";
import { saveSsoProfile } from "@/lib/egov-sso/store";

export type SsoResolutionSource = "sso" | "stored";

export interface SsoResolution {
  profile: Record<string, unknown>;
  source: SsoResolutionSource;
  /** Set when a code was present but the live SSO call did not succeed. */
  ssoError?: string;
}

/**
 * Whether a spent or missing exchange code may fall back to the profile stored
 * on a previous login.
 *
 * On (the default) keeps sign-in working without an admin pasting a fresh code
 * every time. Off makes a valid, unused exchange code mandatory, so an admin
 * gates every sign-in rather than the email alone being enough.
 */
function storedFallbackAllowed() {
  const raw = process.env.EGOV_SSO_ALLOW_STORED_FALLBACK?.trim().toLowerCase();

  if (!raw) {
    return true;
  }

  return !["false", "0", "off", "no"].includes(raw);
}

async function getStoredProfile(email: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("egov_sso_profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  return data;
}

/**
 * Resolves an eGov SSO profile for the given email.
 *
 * Dev/staging flow: an admin pastes a freshly generated exchange code into
 * public.egov_sso_exchange_codes. Codes are single-use, so when one is absent
 * or already spent the stored profile is used instead — unless
 * EGOV_SSO_ALLOW_STORED_FALLBACK is off, which makes a valid code mandatory.
 */
export async function resolveSsoLogin(email: string): Promise<SsoResolution> {
  const supabase = createAdminClient();

  const { data: codeRow } = await supabase
    .from("egov_sso_exchange_codes")
    .select("exchange_code")
    .eq("email", email)
    .maybeSingle();

  const exchangeCode = codeRow?.exchange_code?.trim();
  let ssoError: string | undefined;

  if (exchangeCode) {
    try {
      const accessToken = await exchangeCodeForToken(exchangeCode);
      const profile = await fetchSsoProfile(accessToken);
      const saved = await saveSsoProfile(profile);

      return { profile: saved, source: "sso" };
    } catch (error) {
      ssoError = error instanceof Error ? error.message : String(error);
    }
  }

  if (!storedFallbackAllowed()) {
    throw new Error(
      ssoError
        ? `That exchange code did not work. Add a fresh one for ${email} in egov_sso_exchange_codes. (${ssoError})`
        : `A valid exchange code is required for ${email}. Add one in egov_sso_exchange_codes.`,
    );
  }

  const stored = await getStoredProfile(email);

  if (!stored) {
    throw new Error(
      ssoError
        ? `eGov SSO failed and no stored profile exists for ${email}. ${ssoError}`
        : `No exchange code and no stored profile for ${email}. Add a code in egov_sso_exchange_codes.`,
    );
  }

  return { profile: stored, source: "stored", ssoError };
}
