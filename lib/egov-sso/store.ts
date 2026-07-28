import { createAdminClient } from "@/lib/supabase/admin";
import type { EgovSsoProfile } from "@/lib/egov-sso/client";

export async function saveSsoProfile(profile: EgovSsoProfile) {
  const supabase = createAdminClient();

  // eGov returns tin_id and postal as null for every staging account, but both
  // are required on BIR Form 1701Q (TIN boxes, ZIP Code). Keep whatever is
  // already stored — e.g. seeded test values — unless eGov actually sends one.
  const { data: existing } = await supabase
    .from("egov_sso_profiles")
    .select("tin_id, postal")
    .eq("sso_uid", profile.uniqid)
    .maybeSingle();

  const { data, error } = await supabase
    .from("egov_sso_profiles")
    .upsert(
      {
        sso_uid: profile.uniqid,
        email: profile.email,
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
        postal: profile.postal ?? existing?.postal ?? null,
        address_line_2: profile.address_line_2,
        foreign_address: profile.foreign_address,
        signature: profile.signature,
        signature_url: profile.signature_url,
        tin_id: profile.tin_id ?? existing?.tin_id ?? null,
        passport: profile.passport,
        national_id: profile.national_id,
        additional_information: profile.additional_information,
        raw_payload: profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "sso_uid" },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save eGov SSO profile: ${error.message}`);
  }

  return data;
}
