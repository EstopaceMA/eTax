"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Tax profile", icon: UserRound },
  { href: "/documents", label: "Documents", icon: ClipboardCheck },
  { href: "/deadlines", label: "Deadlines", icon: CalendarDays },
  { href: "/filing", label: "Filing tracker", icon: FileCheck2 },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 space-y-1">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-primary-50 text-primary-900 shadow-[inset_3px_0_0_#00A76F]"
                : "text-grey-600 hover:bg-primary-50 hover:text-primary-900",
            )}
            href={item.href}
            key={item.href}
          >
            <item.icon size={18} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-5 gap-2 border-b border-[rgba(145,158,171,0.16)] bg-white p-2 lg:hidden">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center rounded-lg text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-primary-50 text-primary-900 ring-1 ring-primary-200"
                : "text-grey-600 hover:bg-primary-50 hover:text-primary-900",
            )}
            href={item.href}
            key={item.href}
          >
            <item.icon size={18} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
