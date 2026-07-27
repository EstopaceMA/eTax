"use client";

import { useEffect, useState } from "react";
import { AssistantChat } from "@/components/assistant-chat";
import { ChatbotIcon } from "@/components/chatbot-icon";

export function AssistantShell() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function openAssistant() {
      setIsOpen(true);
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("etax:open-assistant", openAssistant);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("etax:open-assistant", openAssistant);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        aria-label="Open eTax AI Assistant"
        className="group fixed bottom-7 right-7 z-50 hidden size-16 items-center justify-center overflow-visible rounded-full border border-grey-200 bg-white shadow-[0_14px_35px_rgba(20,26,33,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(20,26,33,0.26)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 motion-reduce:transform-none lg:flex"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <ChatbotIcon className="size-13 object-contain" size={52} />
      </button>
    );
  }

  return (
    <section
      aria-label="eTax AI Assistant"
      aria-modal="false"
      className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden border border-grey-300 bg-white shadow-[0_24px_70px_rgba(20,26,33,0.24)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[600px] sm:w-[390px] sm:rounded-lg"
      role="dialog"
    >
      <AssistantChat onClose={() => setIsOpen(false)} />
    </section>
  );
}
