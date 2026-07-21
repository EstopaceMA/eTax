"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getTaxpayerCategoryLabel,
  taxpayerCategories,
} from "@/lib/taxpayer-categories";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = stringValue(formData, "email");
  const password = stringValue(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = stringValue(formData, "email");
  const password = stringValue(formData, "password");
  const fullName = stringValue(formData, "full_name");
  const taxpayerCategory = stringValue(formData, "taxpayer_category");
  const validCategory = taxpayerCategories.some(
    (category) => category.key === taxpayerCategory,
  )
    ? taxpayerCategory
    : "self_employed_professional";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        taxpayer_category: validCategory,
        taxpayer_category_label: getTaxpayerCategoryLabel(validCategory),
      },
    },
  });

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/sign-in?message=${encodeURIComponent(
      "Check your email or sign in if confirmations are disabled.",
    )}`,
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
