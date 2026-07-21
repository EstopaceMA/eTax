"use client";

import Image from "next/image";
import {
  Headphones,
  LoaderCircle,
  MessageCircleQuestion,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  mode?: "etax-app" | "ph-tax";
};

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I can help with Philippine tax questions and guide you through using eTax.",
};

const suggestions = [
  "How do I upload an invoice in eTax?",
  "When are Philippine income tax returns generally due?",
];

function cleanAssistantText(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*\*\s+/gm, "- ")
    .trim();
}

function newMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AssistantChat() {
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, isSending, messages]);

  useEffect(() => {
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  async function sendQuestion(value: string) {
    const trimmedQuestion = value.trim();

    if (!trimmedQuestion || isSending) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: newMessageId(), role: "user", content: trimmedQuestion },
    ]);
    setQuestion("");
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const payload = (await response.json()) as {
        answer?: string;
        error?: string;
        mode?: "etax-app" | "ph-tax";
      };

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error ?? "The assistant could not answer.");
      }

      const answer = cleanAssistantText(payload.answer);

      setMessages((current) => [
        ...current,
        {
          id: newMessageId(),
          role: "assistant",
          content: answer,
          mode: payload.mode,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: newMessageId(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The assistant could not answer right now. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(question);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion(question);
    }
  }

  function resetConversation() {
    setMessages([welcomeMessage]);
    setQuestion("");
    inputRef.current?.focus();
  }

  if (!isOpen) {
    return (
      <button
        aria-label="Open eTax AI Assistant"
        className="group fixed bottom-5 right-5 z-50 flex size-16 items-center justify-center overflow-visible rounded-full border border-white/20 bg-grey-900 shadow-[0_14px_35px_rgba(20,26,33,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(20,26,33,0.34)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 md:bottom-7 md:right-7"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Image
          alt=""
          className="size-14 object-contain"
          height={56}
          src="/eTaxLogo.png"
          width={56}
        />
        <span className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full border-2 border-white bg-primary-500 text-white shadow-md transition group-hover:bg-primary-700">
          <Headphones aria-hidden="true" className="size-4" strokeWidth={2.4} />
        </span>
      </button>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      aria-modal="false"
      className="fixed inset-x-3 bottom-3 z-50 flex h-[min(680px,calc(100dvh-24px))] flex-col overflow-hidden rounded-[24px] border border-[rgba(145,158,171,0.24)] bg-white shadow-[0_24px_70px_rgba(20,26,33,0.24)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[390px]"
      role="dialog"
    >
      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[rgba(145,158,171,0.16)] bg-grey-900 px-4 text-white">
        <div className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
          <MessageCircleQuestion aria-hidden="true" className="size-5 text-primary-300" />
          <span className="absolute bottom-1 right-1 size-2 rounded-full border border-grey-900 bg-success-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold" id={titleId}>
            eTax AI Assistant
          </h2>
          <p className="truncate text-xs text-grey-400">Tax answers and app help</p>
        </div>
        <button
          aria-label="Start a new conversation"
          className="grid size-10 shrink-0 place-items-center rounded-full text-grey-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
          onClick={resetConversation}
          title="New conversation"
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label="Close eTax AI Assistant"
          className="grid size-10 shrink-0 place-items-center rounded-full text-grey-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
          onClick={() => setIsOpen(false)}
          title="Close"
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>

      <div
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto bg-grey-100 px-4 py-4"
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              className={
                message.role === "user"
                  ? "ml-auto max-w-[84%]"
                  : "mr-auto max-w-[88%]"
              }
              key={message.id}
            >
              {message.role === "assistant" && message.mode ? (
                <p className="mb-1 px-1 text-[11px] font-bold uppercase text-grey-500">
                  {message.mode === "etax-app" ? "eTax app guide" : "Philippine tax guide"}
                </p>
              ) : null}
              <div
                className={
                  message.role === "user"
                    ? "rounded-2xl rounded-br-sm bg-primary-700 px-3.5 py-3 text-sm leading-6 text-white"
                    : "rounded-2xl rounded-bl-sm border border-[rgba(145,158,171,0.18)] bg-white px-3.5 py-3 text-sm leading-6 text-grey-800 shadow-sm"
                }
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {messages.length === 1 ? (
            <div className="grid gap-2 pt-1">
              {suggestions.map((suggestion) => (
                <button
                  className="min-h-11 rounded-xl border border-primary-500/30 bg-white px-3 py-2 text-left text-xs font-semibold leading-5 text-primary-900 transition hover:border-primary-500 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                  key={suggestion}
                  onClick={() => void sendQuestion(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          {isSending ? (
            <div className="mr-auto flex min-h-11 items-center gap-2 rounded-2xl rounded-bl-sm border border-[rgba(145,158,171,0.18)] bg-white px-3.5 text-sm text-grey-600 shadow-sm">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary-500" />
              Checking your question…
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        className="shrink-0 border-t border-[rgba(145,158,171,0.16)] bg-white p-3"
        onSubmit={handleSubmit}
      >
        <div className="flex min-h-[52px] items-end gap-2 rounded-2xl border border-grey-300 bg-white p-1.5 transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50">
          <textarea
            aria-label="Ask eTax AI Assistant"
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-grey-900 outline-none placeholder:text-grey-500"
            disabled={isSending}
            maxLength={1500}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Ask a tax or eTax question"
            ref={inputRef}
            rows={1}
            value={question}
          />
          <button
            aria-label="Send question"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-500 text-white transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSending || !question.trim()}
            title="Send"
            type="submit"
          >
            <Send aria-hidden="true" className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-grey-500">
          Review important tax decisions with current BIR guidance.
        </p>
      </form>
    </section>
  );
}
