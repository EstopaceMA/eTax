import type { SsoProfile, TaxpayerProfile } from "@/lib/types";
import type { Form1701QIdentity, TaxpayerType } from "./types";

/** "1990-01-01" -> "01/01/1990"; passes through anything unrecognised. */
function toFormDate(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "";
}

/** The form wants "LAST NAME, FIRST NAME MIDDLE NAME" in capitals. */
function toRegisteredName(sso: SsoProfile | null) {
  if (!sso) {
    return "";
  }

  const given = [sso.first_name, sso.middle_name].filter(Boolean).join(" ");
  return [sso.last_name, given].filter(Boolean).join(", ").toUpperCase();
}

/** eGov appends the country; the BIR address line does not want it. */
function toRegisteredAddress(sso: SsoProfile | null) {
  return (sso?.address ?? "")
    .replace(/,\s*PHILIPPINES\s*$/i, "")
    .trim()
    .toUpperCase();
}

/**
 * The 8% path only distinguishes a single proprietor from a professional, so
 * every other eTax category maps onto "professional".
 */
function toTaxpayerType(taxpayer: TaxpayerProfile | null): TaxpayerType {
  return taxpayer?.taxpayer_type?.toLowerCase().includes("proprietor")
    ? "single_proprietor"
    : "professional";
}

/**
 * Builds the Form 1701Q identity block from the taxpayer's eGov SSO record and
 * their BIR registration details.
 *
 * eGov supplies name, address, birth date, email, citizenship and TIN. RDO and
 * taxpayer type come from taxpayer_profiles, and ATC follows from the type.
 * `claimingForeignTaxCredits` is decided by the filing figures, not here.
 */
export function buildIdentityFromSso({
  ssoProfile,
  taxpayerProfile,
  claimingForeignTaxCredits = false,
}: {
  ssoProfile: SsoProfile | null;
  taxpayerProfile: TaxpayerProfile | null;
  claimingForeignTaxCredits?: boolean;
}): Form1701QIdentity {
  const taxpayerType = toTaxpayerType(taxpayerProfile);

  return {
    tin: (ssoProfile?.tin_id ?? "").replace(/\D/g, "").slice(0, 9),
    rdoCode: taxpayerProfile?.rdo ?? "",
    taxpayerType,
    atc: taxpayerType === "single_proprietor" ? "II015" : "II017",
    registeredName: toRegisteredName(ssoProfile),
    registeredAddress: toRegisteredAddress(ssoProfile),
    registeredAddressLine2: "",
    zipCode: ssoProfile?.postal ?? "",
    dateOfBirth: toFormDate(ssoProfile?.birth_date ?? null),
    email: (ssoProfile?.email ?? "").toUpperCase(),
    citizenship: (ssoProfile?.nationality ?? "").toUpperCase(),
    claimingForeignTaxCredits,
  };
}
