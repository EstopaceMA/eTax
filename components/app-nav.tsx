"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Camera,
  ClipboardCheck,
  FileCheck2,
  FolderCheck,
  LayoutDashboard,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ChatbotIcon } from "@/components/chatbot-icon";
import { openCapture } from "@/components/capture-shell";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  desktopLabel: string;
  icon: LucideIcon | "chatbot";
};

// Named rather than positional: the lineups below diverge, and indexing one
// array from the other is what previously dropped /filing from mobile.
const dashboard: NavigationItem = {
  href: "/dashboard",
  label: "Home",
  desktopLabel: "Dashboard",
  icon: LayoutDashboard,
};
const records: NavigationItem = {
  href: "/records",
  label: "Records",
  desktopLabel: "Income records",
  icon: ClipboardCheck,
};
const filing: NavigationItem = {
  href: "/filing",
  label: "Filing",
  desktopLabel: "Filing tracker",
  icon: FileCheck2,
};
const documents: NavigationItem = {
  href: "/documents",
  label: "Docs",
  desktopLabel: "Documents",
  icon: FolderCheck,
};
const deadlines: NavigationItem = {
  href: "/deadlines",
  label: "Dates",
  desktopLabel: "Deadlines",
  icon: CalendarDays,
};
const agentic: NavigationItem = {
  href: "/agentic",
  label: "Agent",
  desktopLabel: "Agentic filing",
  icon: "chatbot",
};

const desktopNavItems: NavigationItem[] = [
  dashboard,
  records,
  filing,
  documents,
  deadlines,
  agentic,
];

/**
 * The centre slot is a verb, not a destination: capture opens a modal so an
 * invoice can be recorded from wherever the user already is, several in a row.
 *
 * Deadlines is absent because the dashboard hero leads with the due date, and
 * agentic filing lives in the account menu — both are lower frequency than
 * adding and verifying records.
 */
const mobileNavItems = [
  dashboard,
  records,
  "capture" as const,
  filing,
  documents,
];

function NavigationIcon({
  icon,
  size,
}: {
  icon: LucideIcon | "chatbot";
  size: number;
}) {
  if (icon === "chatbot") {
    return <ChatbotIcon size={size} />;
  }

  const Icon = icon;
  return <Icon aria-hidden size={size} />;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}


function desktopLinkClass(active: boolean) {
  return cn(
    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2",
    active
      ? "bg-primary-50 text-primary-900"
      : "text-grey-600 hover:bg-primary-50 hover:text-primary-900",
  );
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex min-h-0 flex-1 flex-col">
      {/* Capture is a modal everywhere, so the sidebar triggers it rather than
          navigating. The mobile FAB does the same. */}
      <button
        className="mb-3 flex min-h-11 w-full items-center gap-3 rounded-lg bg-primary-500 px-3 text-sm font-bold text-white transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        onClick={openCapture}
        type="button"
      >
        <span className="grid h-6 w-[18px] shrink-0 place-items-center">
          <Camera aria-hidden size={18} />
        </span>
        <span>Add income record</span>
      </button>

      <div className="space-y-1">
        {desktopNavItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={desktopLinkClass(active)}
              href={item.href}
              key={item.href}
            >
              <span className="grid h-6 w-[18px] shrink-0 place-items-center overflow-visible">
                <NavigationIcon
                  icon={item.icon}
                  size={item.icon === "chatbot" ? 24 : 18}
                />
              </span>
              <span>{item.desktopLabel}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto border-t border-grey-300 pt-4">
        <Link
          aria-current={isActive(pathname, "/profile") ? "page" : undefined}
          className={desktopLinkClass(isActive(pathname, "/profile"))}
          href="/profile"
        >
          <span className="grid h-6 w-[18px] shrink-0 place-items-center">
            <UserRound aria-hidden size={18} />
          </span>
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  // min-h rather than h: box-sizing is border-box, so a fixed height would let
  // env(safe-area-inset-bottom) eat into the tabs on a notched phone instead of
  // extending the bar.
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid min-h-[64px] grid-cols-5 gap-1 border-t border-grey-300 bg-grey-50/95 px-2 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1 shadow-[0_-12px_32px_rgba(20,26,33,0.12)] backdrop-blur lg:hidden">
      {mobileNavItems.map((item) => {
        if (item === "capture") {
          return (
            <div className="relative flex min-h-11 items-end justify-center" key="capture">
              {/* Lifted only slightly: a taller lift overlapped the fixed
                  composer on /agentic and pushed the label out of line with
                  the other tabs. */}
              <button
                aria-label="Add an income record"
                className="group relative -top-2 flex flex-col items-center gap-0.5 rounded-lg text-[10px] font-bold text-grey-800 transition focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={openCapture}
                type="button"
              >
                <span className="grid size-12 place-items-center rounded-full bg-primary-500 text-white shadow-[0_6px_16px_rgba(7,92,247,0.3)] ring-4 ring-grey-50 transition active:scale-95 motion-reduce:transform-none group-hover:bg-primary-700">
                  <Camera aria-hidden size={22} strokeWidth={2} />
                </span>
                <span>Capture</span>
              </button>
            </div>
          );
        }

        const active = isActive(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-primary-500 text-white shadow-[0_8px_18px_rgba(7,92,247,0.18)]"
                : "text-grey-600 hover:bg-primary-50 hover:text-primary-900",
            )}
            href={item.href}
            key={item.href}
          >
            <NavigationIcon icon={item.icon} size={item.icon === "chatbot" ? 22 : 17} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
