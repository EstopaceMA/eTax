"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { ChatbotIcon } from "@/components/chatbot-icon";

const itemClass =
  "flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-bold text-grey-800 transition hover:bg-primary-50 hover:text-primary-900 focus-visible:bg-primary-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500";

/**
 * Account menu behind the header avatar. The assistant lives here because
 * AssistantShell's floating trigger is desktop-only and the centre tab belongs
 * to capture, so a phone had no other way in.
 */
export function ProfileMenu({ name }: { name: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function openAssistant() {
    setIsOpen(false);
    window.dispatchEvent(new Event("etax:open-assistant"));
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className="grid size-12 place-items-center rounded-full bg-grey-300 text-grey-600 transition hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:size-16"
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
        type="button"
      >
        <UserRound aria-hidden className="size-8 sm:size-10" strokeWidth={1.8} />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-grey-300 bg-white py-1 shadow-[0_18px_44px_rgba(20,26,33,0.18)]"
          role="menu"
        >
          <p className="px-3 pb-2 pt-1.5 text-xs font-bold uppercase text-grey-600">
            {name}
          </p>

          <button className={itemClass} onClick={openAssistant} role="menuitem" type="button">
            <ChatbotIcon size={22} />
            eTax AI Assistant
          </button>

          <Link
            className={itemClass}
            href="/profile"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            <UserRound aria-hidden size={18} strokeWidth={1.9} />
            Tax profile
          </Link>

          <div className="mt-1 border-t border-grey-300 pt-1">
            <form action={signOut}>
              <button className={itemClass} role="menuitem" type="submit">
                <LogOut aria-hidden size={18} strokeWidth={1.9} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
