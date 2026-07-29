import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  starterChecklistItems,
  starterDeadlines,
} from "@/lib/demo-data";
import {
  filingQuarters,
  getPeriodSlug,
  getQuarterlyFilingSeeds,
} from "@/lib/filing-periods";
import { getTaxpayerCategoryDefaults } from "@/lib/taxpayer-categories";
import { decryptEgovSsoRow } from "@/lib/egov-sso/pii-fields";
import type {
  Deadline,
  DocumentChecklistItem,
  FilingObligation,
  IncomeRecordUpload,
  Profile,
  SsoProfile,
  TaxpayerProfile,
  WorkspaceData,
} from "@/lib/types";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function ensureWorkspace() {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? "demo@etax.local",
    full_name: user.user_metadata?.full_name ?? "eTax taxpayer",
  });

  const { data: taxpayerProfile } = await supabase
    .from("taxpayer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!taxpayerProfile) {
    const metadataCategory =
      typeof user.user_metadata?.taxpayer_category === "string"
        ? user.user_metadata.taxpayer_category
        : undefined;

    const defaults = getTaxpayerCategoryDefaults(metadataCategory);

    // Name, contact and TIN come from egov_sso_profiles; only BIR registration
    // details live here, and the RDO is set from the taxpayer's SSO address.
    await supabase.from("taxpayer_profiles").insert({
      user_id: user.id,
      taxpayer_type: defaults.taxpayerType,
      work_type: defaults.workType,
      registration_status: "Already registered",
      rdo: null,
      filing_frequency: defaults.filingFrequency,
    });
  }

  const [
    { count: checklistCount },
    { count: deadlineCount },
    existingFilingsResult,
  ] = await Promise.all([
    supabase
      .from("document_checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("deadlines")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("filing_obligations")
      .select("period")
      .eq("user_id", user.id),
  ]);

  const existingFilingPeriods = new Set(
    (existingFilingsResult.data as Array<{ period: string }> | null)?.map(
      ({ period }) => period,
    ) ?? [],
  );
  const quarterlySeeds = getQuarterlyFilingSeeds();
  const missingQuarterlyFilings = quarterlySeeds.filter(({ period }) => {
    const meta = filingQuarters.find((quarter) => quarter.period === period);
    const knownPeriods = [period, ...(meta?.periodAliases ?? [])];

    return knownPeriods.every((knownPeriod) => !existingFilingPeriods.has(knownPeriod));
  });

  await Promise.all([
    checklistCount === 0
      ? supabase.from("document_checklist_items").insert(
          starterChecklistItems.map((item) => ({ ...item, user_id: user.id })),
        )
      : Promise.resolve(),
    deadlineCount === 0
      ? supabase
          .from("deadlines")
          .insert(starterDeadlines.map((deadline) => ({ ...deadline, user_id: user.id })))
      : Promise.resolve(),
    missingQuarterlyFilings.length > 0
      ? supabase.from("filing_obligations").insert(
          missingQuarterlyFilings.map((obligation) => ({
            ...obligation,
            user_id: user.id,
          })),
        )
      : Promise.resolve(),
  ]);
}

async function getStorageIncomeRecordUploads(userId: string): Promise<IncomeRecordUpload[]> {
  const adminSupabase = createAdminClient();
  const uploads = await Promise.all(
    filingQuarters.map(async (quarter) => {
      const folder = `${userId}/${getPeriodSlug(quarter.period)}`;
      const { data } = await adminSupabase.storage.from("income-records").list(folder, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

      const imageFiles = (data ?? []).filter((file) => !file.name.endsWith(".metadata.json"));

      return Promise.all(
        imageFiles.map(async (file) => {
          const storagePath = `${folder}/${file.name}`;
          const [signedResult, metadataResult] = await Promise.all([
            adminSupabase.storage.from("income-records").createSignedUrl(storagePath, 60 * 15),
            adminSupabase.storage.from("income-records").download(`${storagePath}.metadata.json`),
          ]);
          const metadataText = metadataResult.data ? await metadataResult.data.text() : "";
          const metadata = metadataText ? JSON.parse(metadataText) as { total_income?: number | null } : {};

          return {
            id: storagePath,
            user_id: userId,
            quarter: quarter.quarter,
            period: quarter.period,
            original_filename: file.name.replace(/^[0-9a-f-]+-/, ""),
            storage_path: storagePath,
            content_type:
              typeof file.metadata?.mimetype === "string" ? file.metadata.mimetype : null,
            size_bytes:
              typeof file.metadata?.size === "number" ? file.metadata.size : file.metadata?.size
                ? Number(file.metadata.size)
                : null,
            total_income:
              typeof metadata.total_income === "number" ? metadata.total_income : null,
            extraction_status: "provisional",
            extraction_confidence:
              typeof metadata.total_income === "number" ? 0.75 : null,
            extracted_text: null,
            confirmed_at: null,
            created_at: file.created_at ?? file.updated_at ?? new Date().toISOString(),
            signed_url: signedResult.data?.signedUrl,
          } satisfies IncomeRecordUpload;
        }),
      );
    }),
  );

  return uploads.flat();
}

/** Shapes an egov_sso_profiles row, deriving the display name from its parts. */
function toSsoProfile(row: unknown): SsoProfile | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  // The row comes back from Postgres encrypted; decrypt before reading any field.
  const r = decryptEgovSsoRow(row as Record<string, string | null>);
  const fullName = [r.first_name, r.middle_name, r.last_name]
    .filter(Boolean)
    .join(" ");

  return {
    sso_uid: r.sso_uid ?? "",
    email: r.email ?? "",
    first_name: r.first_name ?? null,
    middle_name: r.middle_name ?? null,
    last_name: r.last_name ?? null,
    full_name: fullName,
    mobile: r.mobile ?? null,
    tin_id: r.tin_id ?? null,
    photo_url: r.photo_url ?? null,
    birth_date: r.birth_date ?? null,
    nationality: r.nationality ?? null,
    address: r.address ?? null,
    postal: r.postal ?? null,
  };
}

export const getWorkspaceData = cache(async (): Promise<WorkspaceData> => {
  await ensureWorkspace();
  const user = await requireUser();
  const supabase = await createClient();

  const [
    profileResult,
    taxpayerResult,
    ssoResult,
    checklistResult,
    deadlinesResult,
    filingResult,
    incomeRecordsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("taxpayer_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("egov_sso_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("document_checklist_items")
      .select("*")
      .eq("user_id", user.id)
      .order("required", { ascending: false }),
    supabase
      .from("deadlines")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true }),
    supabase
      .from("filing_obligations")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true }),
    supabase
      .from("income_record_uploads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const incomeRecordUploads = (incomeRecordsResult.data as IncomeRecordUpload[] | null) ?? [];
  const signedIncomeRecordUploads = incomeRecordsResult.error
    ? await getStorageIncomeRecordUploads(user.id)
    : await Promise.all(
        incomeRecordUploads.map(async (upload) => {
          const adminSupabase = createAdminClient();
          const [signedResult, metadataResult] = await Promise.all([
            adminSupabase.storage
              .from("income-records")
              .createSignedUrl(upload.storage_path, 60 * 15),
            adminSupabase.storage
              .from("income-records")
              .download(`${upload.storage_path}.metadata.json`),
          ]);
          const metadataText = metadataResult.data ? await metadataResult.data.text() : "";
          const metadata = metadataText
            ? (JSON.parse(metadataText) as { total_income?: number | null })
            : {};

      return {
        ...upload,
            extraction_status: upload.extraction_status ?? "provisional",
            extraction_confidence: upload.extraction_confidence ?? null,
            extracted_text: upload.extracted_text ?? null,
            confirmed_at: upload.confirmed_at ?? null,
            total_income:
              upload.total_income ??
              (typeof metadata.total_income === "number" ? metadata.total_income : null),
            signed_url: signedResult.data?.signedUrl,
      };
        }),
      );

  return {
    profile: (profileResult.data as Profile | null) ?? null,
    taxpayerProfile: (taxpayerResult.data as TaxpayerProfile | null) ?? null,
    ssoProfile: toSsoProfile(ssoResult.data),
    checklistItems: (checklistResult.data as DocumentChecklistItem[] | null) ?? [],
    deadlines: (deadlinesResult.data as Deadline[] | null) ?? [],
    filingObligations: (filingResult.data as FilingObligation[] | null) ?? [],
    incomeRecordUploads: signedIncomeRecordUploads,
  };
});
