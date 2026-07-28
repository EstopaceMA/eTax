"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveSsoLogin } from "@/lib/egov-sso/resolve";
import { linkSsoAccount, syncTaxpayerRdo } from "@/lib/egov-sso/account";
import { createSsoSession } from "@/lib/egov-sso/session";
import {
  getTaxpayerCategoryLabel,
  taxpayerCategories,
} from "@/lib/taxpayer-categories";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(formData: FormData) {
  const email = stringValue(formData, "email").toLowerCase();

  if (!email) {
    redirect(`/sign-in?error=${encodeURIComponent("Enter your email.")}`);
  }

  try {
    const { profile } = await resolveSsoLogin(email);

    const ssoUid = profile.sso_uid as string;
    const fullName = [profile.first_name, profile.middle_name, profile.last_name]
      .filter(Boolean)
      .join(" ");

    const userId = await linkSsoAccount({
      ssoUid,
      email: profile.email as string,
      fullName,
      userId: (profile.user_id as string | null) ?? null,
    });

    await syncTaxpayerRdo(userId, {
      municipality: (profile.municipality as string | null) ?? null,
      province: (profile.province as string | null) ?? null,
    });

    await createSsoSession(profile.email as string);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "eGov SSO sign-in failed.";
    redirect(`/sign-in?error=${encodeURIComponent(message)}`);
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
