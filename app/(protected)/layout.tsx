import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  Link2,
  Map,
  UserRound,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/data";
import { buttonClass } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Tax profile", icon: UserRound },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/documents", label: "Documents", icon: ClipboardCheck },
  { href: "/deadlines", label: "Deadlines", icon: CalendarDays },
  { href: "/filing", label: "Filing tracker", icon: FileCheck2 },
  { href: "/mock-filing", label: "Mock filing", icon: Link2 },
];

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
          className="block px-3 text-xl font-extrabold text-grey-900"
          href="/dashboard"
        >
          eTax
        </Link>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <Link
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-grey-600 transition hover:bg-primary-50 hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2"
              href={item.href}
              key={item.href}
            >
              <item.icon size={18} aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
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
        <nav className="grid grid-cols-4 gap-2 border-b border-[rgba(145,158,171,0.16)] bg-white p-2 lg:hidden">
          {navItems.map((item) => (
            <Link
              className="flex min-h-12 flex-col items-center justify-center rounded-lg text-xs font-bold text-grey-600 hover:bg-primary-50 hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2"
              href={item.href}
              key={item.href}
            >
              <item.icon size={18} aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
