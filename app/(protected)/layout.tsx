import Link from "next/link";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { BrandLogo } from "@/components/brand-logo";
import { AssistantShell } from "@/components/assistant-shell";
import { ProfileMenu } from "@/components/profile-menu";

function getGreetingName({
  profileName,
  user,
}: {
  profileName?: string | null;
  user: Awaited<ReturnType<typeof requireUser>>;
}) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const fallbackName = user.email?.split("@")[0].split(/[._-]/)[0] ?? "there";
  const firstName = (profileName || metadataName || fallbackName)
    .trim()
    .split(/\s+/)[0];

  return firstName.toUpperCase();
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, supabase] = await Promise.all([requireUser(), createClient()]);
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const greetingName = getGreetingName({
    profileName:
      typeof profile?.full_name === "string" ? profile.full_name : null,
    user,
  });

  return (
    <div className="min-h-screen bg-grey-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col border-r border-grey-300 bg-grey-50 px-4 py-6 lg:flex">
        <Link
          className="block px-3 focus-visible:outline-2 focus-visible:outline-offset-2"
          href="/dashboard"
        >
          <BrandLogo size="sm" priority />
        </Link>
        <DesktopNav />
      </aside>
      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-grey-300 bg-white px-4 py-3 backdrop-blur md:min-h-24 md:px-8 lg:hidden">
          <Link
            aria-label="Go to dashboard"
            className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
            href="/dashboard"
          >
            <BrandLogo size="sm" priority />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate font-display text-lg font-black leading-tight tracking-normal text-primary-700 sm:text-2xl">
                Mabuhay, {greetingName}
              </p>
              <p className="truncate text-sm font-semibold text-grey-600 sm:text-lg">
                Welcome to eGovPH
              </p>
            </div>
            <ProfileMenu name={greetingName} />
          </div>
        </header>
        <main className="protected-main mx-auto max-w-6xl px-3 pb-24 pt-4 md:px-5 md:pb-8 md:pt-5">
          {children}
        </main>
      </div>
      <MobileNav />
      <AssistantShell />
    </div>
  );
}
