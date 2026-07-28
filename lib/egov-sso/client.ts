function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getBaseUrl() {
  return requiredEnv("EGOV_SSO_BASE_URL").replace(/\/+$/, "");
}

interface EgovSsoTokenResponse {
  access_token: string;
}

export interface EgovSsoProfile {
  uniqid: string;
  email: string;
  birth_date: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  gender: string | null;
  nationality: string | null;
  photo: string | null;
  mobile: string | null;
  address: string | null;
  street: string | null;
  barangay: string | null;
  barangay_code: string | null;
  municipality: string | null;
  municipality_code: string | null;
  province: string | null;
  province_code: string | null;
  region: string | null;
  region_code: string | null;
  country: string | null;
  country_alpha_2_code: string | null;
  country_alpha_3_code: string | null;
  country_id: number | null;
  postal: string | null;
  address_line_2: string | null;
  foreign_address: string | null;
  signature: string | null;
  signature_url: string | null;
  tin_id: string | null;
  passport: unknown;
  national_id: unknown;
  additional_information: unknown;
  [key: string]: unknown;
}

interface EgovSsoAuthResponse {
  status: number;
  message: string;
  data: EgovSsoProfile;
}

export async function exchangeCodeForToken(
  exchangeCode: string,
): Promise<string> {
  const response = await fetch(`${getBaseUrl()}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      exchange_code: exchangeCode,
      scope: "SSO_AUTHENTICATION",
      partner_code: requiredEnv("EGOV_SSO_PARTNER_CODE"),
      partner_secret: requiredEnv("EGOV_SSO_PARTNER_SECRET"),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `eGov SSO token exchange failed with HTTP ${response.status}`,
    );
  }

  const payload = (await response.json()) as EgovSsoTokenResponse;
  return payload.access_token;
}

export async function fetchSsoProfile(
  accessToken: string,
): Promise<EgovSsoProfile> {
  const response = await fetch(
    `${getBaseUrl()}/api/partner/sso_authentication`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `eGov SSO profile lookup failed with HTTP ${response.status}`,
    );
  }

  const payload = (await response.json()) as EgovSsoAuthResponse;
  return payload.data;
}
