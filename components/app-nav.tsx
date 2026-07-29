"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Camera,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ChatbotIcon } from "@/components/chatbot-icon";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  desktopLabel: string;
  icon: LucideIcon | "chatbot";
};

const desktopNavItems: NavigationItem[] = [
  { href: "/dashboard", label: "Home", desktopLabel: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Docs", desktopLabel: "Documents", icon: ClipboardCheck },
  { href: "/deadlines", label: "Dates", desktopLabel: "Deadlines", icon: CalendarDays },
  { href: "/filing", label: "File", desktopLabel: "Filing tracker", icon: FileCheck2 },
  { href: "/agentic", label: "Agent", desktopLabel: "Agentic filing", icon: "chatbot" },
];

/**
 * The centre slot is a verb, not a destination: capturing an income record is
 * step one of the filing pipeline (agenticSteps[0]) and nothing downstream can
 * compute, file, or pay without it. Deadlines is absent because the dashboard
 * hero already leads with the quarter's due date.
 */
const mobileNavItems = [
  desktopNavItems[0], // Home
  desktopNavItems[3], // Filing
  "capture" as const,
  desktopNavItems[1], // Docs
  desktopNavItems[4], // Agent
];

const captureHref = "/capture";

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

function openAssistant() {
  window.dispatchEvent(new Event("etax:open-assistant"));
}

/**
 * Mobile entry point to the general assistant. AssistantShell's floating
 * trigger is desktop-only and the centre tab now belongs to capture, so
 * without this the assistant would be unreachable on a phone.
 */
export function AssistantHeaderButton() {
  return (
    <button
      aria-label="Open eTax AI Assistant"
      className="grid size-12 shrink-0 place-items-center rounded-full bg-grey-300 text-grey-600 transition hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:size-16"
      onClick={openAssistant}
      type="button"
    >
      <ChatbotIcon size={34} />
    </button>
  );
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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[64px] grid-cols-5 gap-1 border-t border-grey-300 bg-grey-50/95 px-2 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1 shadow-[0_-12px_32px_rgba(20,26,33,0.12)] backdrop-blur lg:hidden">
      {mobileNavItems.map((item) => {
        if (item === "capture") {
          const active = isActive(pathname, captureHref);

          return (
            <div className="relative flex min-h-11 items-end justify-center" key="capture">
              <Link
                aria-label="Capture an income record"
                className="group relative -top-5 flex flex-col items-center rounded-lg text-[10px] font-bold text-grey-800 transition focus-visible:outline-2 focus-visible:outline-offset-2"
                href={captureHref}
              >
                <span
                  className={cn(
                    "grid size-14 place-items-center rounded-full text-white shadow-[0_8px_20px_rgba(7,92,247,0.3)] ring-4 ring-grey-50 transition active:scale-95 motion-reduce:transform-none",
                    active ? "bg-primary-700" : "bg-primary-500",
                  )}
                >
                  <Camera aria-hidden size={26} strokeWidth={2} />
                </span>
                <span className="mt-1">Capture</span>
              </Link>
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
