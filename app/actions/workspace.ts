"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import type { ChecklistStatus, FilingStatus, PaymentStatus } from "@/lib/types";

export async function updateChecklistItem(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as ChecklistStatus;

  await supabase
    .from("document_checklist_items")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

export async function updateFilingStatus(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as FilingStatus;
  const paymentStatus = String(formData.get("payment_status")) as PaymentStatus;

  await supabase
    .from("filing_obligations")
    .update({ status, payment_status: paymentStatus })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/filing");
  revalidatePath("/dashboard");
}
