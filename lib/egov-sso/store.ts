import { createAdminClient } from "@/lib/supabase/admin";
import type { EgovSsoProfile } from "@/lib/egov-sso/client";
import { decryptEgovSsoRow, encryptEgovSsoRow, hashEmail } from "@/lib/egov-sso/pii-fields";
import { decryptPii } from "@/lib/security/pii-crypto";
import type { SsoProfile } from "@/lib/types";

/** Decrypted mobile number for a signed-in user, for SMS sends. Null if unset. */
export async function getSsoMobile(userId: string): Promise<Pick<SsoProfile, "mobile"> | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("egov_sso_profiles")
    .select("mobile")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return { mobile: decryptPii(data.mobile) };
}

export async function saveSsoProfile(profile: EgovSsoProfile) {
  const supabase = createAdminClient();

  // eGov returns tin_id and postal as null for every staging account, but both
  // are required on BIR Form 1701Q (TIN boxes, ZIP Code). Keep whatever is
  // already stored — e.g. seeded test values — unless eGov actually sends one.
  // Both columns are encrypted at rest, so the stored value has to be
  // decrypted before it can be reused as a fallback.
  const { data: existing } = await supabase
    .from("egov_sso_profiles")
    .select("tin_id, postal")
    .eq("sso_uid", profile.uniqid)
    .maybeSingle();

  const existingTinId = decryptPii(existing?.tin_id ?? null);
  const existingPostal = decryptPii(existing?.postal ?? null);

  const plaintextRow = {
    sso_uid: profile.uniqid,
    email: profile.email,
    // Plaintext, deliberately: email above becomes ciphertext once encrypted
    // below, so equality lookups (sign-in resolves by email) go through this
    // deterministic hash instead of the ciphertext itself.
    email_hash: hashEmail(profile.email),
    first_name: profile.first_name,
    middle_name: profile.middle_name,
    last_name: profile.last_name,
    suffix: profile.suffix,
    gender: profile.gender,
    birth_date: profile.birth_date,
    nationality: profile.nationality,
    mobile: profile.mobile,
    photo_url: profile.photo,
    address: profile.address,
    street: profile.street,
    barangay: profile.barangay,
    barangay_code: profile.barangay_code,
    municipality: profile.municipality,
    municipality_code: profile.municipality_code,
    province: profile.province,
    province_code: profile.province_code,
    region: profile.region,
    region_code: profile.region_code,
    country: profile.country,
    country_alpha_2_code: profile.country_alpha_2_code,
    country_alpha_3_code: profile.country_alpha_3_code,
    country_id: profile.country_id,
    postal: profile.postal ?? existingPostal,
    address_line_2: profile.address_line_2,
    foreign_address: profile.foreign_address,
    signature: profile.signature,
    signature_url: profile.signature_url,
    tin_id: profile.tin_id ?? existingTinId,
    passport: profile.passport,
    national_id: profile.national_id,
    additional_information: profile.additional_information,
    raw_payload: profile,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("egov_sso_profiles")
    .upsert(encryptEgovSsoRow(plaintextRow), { onConflict: "sso_uid" })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save eGov SSO profile: ${error.message}`);
  }

  return decryptEgovSsoRow(data);
}
