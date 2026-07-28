import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Establishes a normal Supabase session for an already-verified SSO user.
 *
 * There is no password to sign in with, so the service-role client mints a
 * one-time magic-link token which is redeemed immediately server-side. Supabase
 * writes its usual auth cookies, so middleware and every getUser() call keep
 * working unchanged.
 */
export async function createSsoSession(email: string) {
  const admin = createAdminClient();

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !link.properties?.hashed_token) {
    throw new Error(
      `Could not start a session for ${email}: ${linkError?.message ?? "no token returned"}`,
    );
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.properties.hashed_token,
  });

  if (verifyError) {
    throw new Error(
      `Could not start a session for ${email}: ${verifyError.message}`,
    );
  }
}
