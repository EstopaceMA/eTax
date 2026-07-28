"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateTaxpayerProfile(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const taxpayerType = stringValue(formData, "taxpayer_type");
  const rdo = stringValue(formData, "rdo");

  const { error } = await supabase
    .from("taxpayer_profiles")
    .update({
      taxpayer_type: taxpayerType,
      rdo: rdo || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
  redirect(`/profile?message=${encodeURIComponent("Tax profile updated.")}`);
}
