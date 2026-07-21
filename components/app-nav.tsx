"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const desktopNavItems = [
  { href: "/dashboard", label: "Home", desktopLabel: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Docs", desktopLabel: "Documents", icon: ClipboardCheck },
  { href: "/deadlines", label: "Dates", desktopLabel: "Deadlines", icon: CalendarDays },
  { href: "/filing", label: "File", desktopLabel: "Filing tracker", icon: FileCheck2 },
];

const mobileNavItems = [
  desktopNavItems[0],
  desktopNavItems[1],
  { label: "AI", icon: Bot, type: "assistant" as const },
  desktopNavItems[2],
  desktopNavItems[3],
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function openAssistant() {
  window.dispatchEvent(new Event("etax:open-assistant"));
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 space-y-1">
      {desktopNavItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-primary-50 text-primary-900 shadow-[inset_3px_0_0_#075CF7]"
                : "text-grey-600 hover:bg-primary-50 hover:text-primary-900",
            )}
            href={item.href}
            key={item.href}
          >
            <item.icon size={18} aria-hidden />
            {item.desktopLabel}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-5 gap-1 border-t border-grey-300 bg-grey-50/95 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1 shadow-[0_-12px_32px_rgba(20,26,33,0.12)] backdrop-blur lg:hidden">
      {mobileNavItems.map((item) => {
        if (!("href" in item)) {
          return (
            <div className="relative flex min-h-12 items-end justify-center" key={item.label}>
              <div className="absolute -top-8 grid size-20 place-items-center rounded-full bg-grey-50" />
              <button
                aria-label="Open eTax AI Assistant"
                className="group relative -top-6 flex flex-col items-center rounded-lg text-[11px] font-bold text-grey-800 transition focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={openAssistant}
                type="button"
              >
                <span className="grid size-16 place-items-center rounded-full bg-primary-500 text-white shadow-[0_10px_24px_rgba(7,92,247,0.26)] ring-4 ring-grey-50 transition group-hover:bg-primary-700">
                  <item.icon size={30} aria-hidden strokeWidth={2.2} />
                </span>
              </button>
            </div>
          );
        }

        const active = isActive(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-primary-500 text-white shadow-[0_8px_18px_rgba(7,92,247,0.18)]"
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
