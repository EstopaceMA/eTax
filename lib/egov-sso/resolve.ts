import { createAdminClient } from "@/lib/supabase/admin";
import {
  EgovSsoHttpError,
  exchangeCodeForToken,
  fetchSsoProfile,
} from "@/lib/egov-sso/client";
import { saveSsoProfile } from "@/lib/egov-sso/store";
import { decryptEgovSsoRow, hashEmail } from "@/lib/egov-sso/pii-fields";

/**
 * A sign-in failure with a message safe to show the person signing in.
 *
 * This is a staging/testing environment where whoever is testing needs to know
 * which step failed — a rejected code, an unreachable eGovPH, or no saved
 * profile are very different problems with different fixes. Messages describe
 * the mechanism rather than confirming whether an account exists, so this
 * stays a poor account-enumeration oracle even while being specific.
 */
export class SsoSignInError extends Error {
  constructor(
    /** Safe to render in the UI. */
    readonly userMessage: string,
    /** Full detail for server logs only. */
    logMessage?: string,
  ) {
    super(logMessage ?? userMessage);
    this.name = "SsoSignInError";
  }
}

/** Turns an eGov failure into something a tester can act on. */
function describeSsoFailure(error: unknown): string {
  if (error instanceof EgovSsoHttpError) {
    if (error.stage === "token_exchange") {
      if (error.status === 422) {
        return "eGovPH rejected that exchange code. Codes are single-use and expire quickly — please generate a fresh one and try again.";
      }

      if (error.status === 403) {
        return "eGovPH rejected this app's partner credentials. Check EGOV_SSO_PARTNER_CODE and EGOV_SSO_PARTNER_SECRET.";
      }
    }

    if (error.stage === "profile_fetch" && error.status === 401) {
      return "The exchange code worked, but eGovPH rejected the access token when fetching the profile.";
    }

    if (error.status >= 500) {
      return `eGovPH SSO returned a server error (HTTP ${error.status}). This is on their side — please retry shortly.`;
    }

    return `eGovPH SSO returned HTTP ${error.status}. Please generate a fresh exchange code and try again.`;
  }

  if (error instanceof Error && /fetch failed|ENOTFOUND|ECONNREFUSED|timeout/i.test(error.message)) {
    return "Could not reach the configured eGovPH SSO service. Check the Developer Portal endpoint and network access.";
  }

  if (error instanceof Error && /Missing required environment variable/i.test(error.message)) {
    return `This app is misconfigured: ${error.message}`;
  }

  return "eGovPH SSO could not be reached or returned an unexpected response.";
}

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
export function storedFallbackAllowed() {
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
    .eq("email_hash", hashEmail(email))
    .maybeSingle();

  return data ? decryptEgovSsoRow(data) : null;
}

/**
 * Resolves an eGov SSO profile for the given email.
 *
 * Two ways to supply a code: an admin pastes one into
 * public.egov_sso_exchange_codes ahead of time, or it's typed directly on the
 * sign-in form for that one attempt — the latter takes priority when present,
 * since typing a code is the more deliberate, freshest signal. Codes are
 * single-use, so when neither is present or valid, the stored profile is used
 * instead — unless EGOV_SSO_ALLOW_STORED_FALLBACK is off, which makes a valid
 * code mandatory.
 */
export async function resolveSsoLogin(
  email: string,
  explicitExchangeCode?: string,
): Promise<SsoResolution> {
  const supabase = createAdminClient();

  let exchangeCode = explicitExchangeCode?.trim();

  if (!exchangeCode) {
    const { data: codeRow } = await supabase
      .from("egov_sso_exchange_codes")
      .select("exchange_code")
      .eq("email", email)
      .maybeSingle();

    exchangeCode = codeRow?.exchange_code?.trim();
  }

  let ssoError: string | undefined;
  let ssoFailureMessage: string | undefined;

  if (exchangeCode) {
    // Exchange codes are single-use. Verify that this deployment can read
    // existing encrypted profiles before spending a fresh code and attempting
    // to update the matching SSO row.
    const { data: encryptionProbe, error: encryptionProbeError } = await supabase
      .from("egov_sso_profiles")
      .select("email")
      .not("email", "is", null)
      .limit(1)
      .maybeSingle();

    if (encryptionProbeError) {
      throw new SsoSignInError(
        "eTax could not verify its secure profile storage. Please ask the administrator to check the database configuration before trying another eGovPH code.",
        `PII storage preflight failed: ${encryptionProbeError.message}`,
      );
    }

    if (encryptionProbe) {
      try {
        decryptEgovSsoRow(encryptionProbe);
      } catch (error) {
        throw new SsoSignInError(
          "eTax cannot read its saved secure profiles. Please ask the administrator to restore the correct encryption key before trying another eGovPH code.",
          `PII encryption preflight failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    try {
      const accessToken = await exchangeCodeForToken(exchangeCode);
      const profile = await fetchSsoProfile(accessToken);
      const saved = await saveSsoProfile(profile);

      return { profile: saved, source: "sso" };
    } catch (error) {
      ssoError = error instanceof Error ? error.message : String(error);
      ssoFailureMessage = describeSsoFailure(error);
    }
  }

  if (!storedFallbackAllowed()) {
    throw new SsoSignInError(
      ssoFailureMessage ??
        "An exchange code is required to sign in. Generate one from eGovPH and paste it into the exchange code field.",
      ssoError
        ? `Strict mode: code failed for ${email}. ${ssoError}`
        : `Strict mode: no code supplied for ${email}.`,
    );
  }

  const stored = await getStoredProfile(email);

  if (!stored) {
    throw new SsoSignInError(
      ssoFailureMessage
        ? `${ssoFailureMessage} There is also no previously saved profile to fall back on, so a working code is required for this first sign-in.`
        : "No exchange code was supplied and there is no previously saved profile for this email. Paste a freshly generated eGovPH exchange code to sign in for the first time.",
      ssoError
        ? `No stored profile for ${email} and the code failed. ${ssoError}`
        : `No stored profile for ${email} and no code supplied.`,
    );
  }

  return { profile: stored, source: "stored", ssoError };
}
