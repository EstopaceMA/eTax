import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  starterChecklistItems,
  starterDeadlines,
  starterFilingObligations,
  starterRoadmapSteps,
} from "@/lib/demo-data";
import { getTaxpayerCategoryDefaults } from "@/lib/taxpayer-categories";
import type {
  Deadline,
  DocumentChecklistItem,
  FilingObligation,
  MockFilingModule,
  Profile,
  RoadmapStep,
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

    await supabase.from("taxpayer_profiles").insert({
      user_id: user.id,
      taxpayer_type: defaults.taxpayerType,
      work_type: defaults.workType,
      registration_status: "Already registered",
      tin_status: "TIN available",
      rdo: "RDO on record",
      filing_frequency: defaults.filingFrequency,
    });
  }

  const [
    { count: roadmapCount },
    { count: checklistCount },
    { count: deadlineCount },
    { count: filingCount },
  ] = await Promise.all([
    supabase
      .from("roadmap_steps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
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
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  await Promise.all([
    roadmapCount === 0
      ? supabase
          .from("roadmap_steps")
          .insert(starterRoadmapSteps.map((step) => ({ ...step, user_id: user.id })))
      : Promise.resolve(),
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
    filingCount === 0
      ? supabase.from("filing_obligations").insert(
          starterFilingObligations.map((obligation) => ({
            ...obligation,
            user_id: user.id,
          })),
        )
      : Promise.resolve(),
  ]);
}

export const getWorkspaceData = cache(async (): Promise<WorkspaceData> => {
  await ensureWorkspace();
  const user = await requireUser();
  const supabase = await createClient();

  const [
    profileResult,
    taxpayerResult,
    roadmapResult,
    checklistResult,
    deadlinesResult,
    filingResult,
    modulesResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("taxpayer_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("roadmap_steps")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
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
    supabase.from("mock_filing_modules").select("*").order("name", { ascending: true }),
  ]);

  return {
    profile: (profileResult.data as Profile | null) ?? null,
    taxpayerProfile: (taxpayerResult.data as TaxpayerProfile | null) ?? null,
    roadmapSteps: (roadmapResult.data as RoadmapStep[] | null) ?? [],
    checklistItems: (checklistResult.data as DocumentChecklistItem[] | null) ?? [],
    deadlines: (deadlinesResult.data as Deadline[] | null) ?? [],
    filingObligations: (filingResult.data as FilingObligation[] | null) ?? [],
    mockFilingModules: (modulesResult.data as MockFilingModule[] | null) ?? [],
  };
});
