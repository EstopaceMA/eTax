import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/data";
import { buttonClass } from "@/components/ui/button";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { BrandLogo } from "@/components/brand-logo";
import { AssistantChat } from "@/components/assistant-chat";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-grey-200">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] border-r border-[rgba(145,158,171,0.16)] bg-white px-4 py-6 lg:block">
        <Link
          className="block px-3 focus-visible:outline-2 focus-visible:outline-offset-2"
          href="/dashboard"
        >
          <BrandLogo size="sm" priority />
        </Link>
        <DesktopNav />
      </aside>
      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-[rgba(145,158,171,0.16)] bg-white/90 px-4 backdrop-blur md:min-h-20 md:px-8">
          <div>
            <p className="text-sm font-bold text-grey-500">Signed in as</p>
            <p className="font-semibold text-grey-800">{user.email}</p>
          </div>
          <form action={signOut}>
            <button className={buttonClass("secondary")} type="submit">
              Sign out
            </button>
          </form>
        </header>
        <MobileNav />
        <main className="mx-auto max-w-6xl px-3 py-4 md:px-5 md:py-5">
          {children}
        </main>
      </div>
      <AssistantChat />
    </div>
  );
}
