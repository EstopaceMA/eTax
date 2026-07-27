"use client";

import Link from "next/link";
import {
  LoaderCircle,
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
import { ChatbotIcon } from "@/components/chatbot-icon";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  mode?: "etax-app" | "ph-tax";
  classification?: "fact" | "assumption" | "estimate" | "recommendation";
  confidence?: number;
  nextAction?: {
    href: string;
    label: string;
    title: string;
  };
  sources?: string[];
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

export function AssistantChat({ onClose }: { onClose?: () => void }) {
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isSending, messages]);

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
        classification?: Message["classification"];
        confidence?: number;
        error?: string;
        mode?: "etax-app" | "ph-tax";
        nextAction?: Message["nextAction"];
        sources?: string[];
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
          classification: payload.classification,
          confidence: payload.confidence,
          mode: payload.mode,
          nextAction: payload.nextAction,
          sources: payload.sources,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-labelledby={titleId}>
      <header className="flex min-h-[68px] shrink-0 items-center gap-3 border-b border-grey-300 bg-surface-inverse px-4 text-white">
        <div className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
          <ChatbotIcon size={34} />
          <span className="absolute bottom-0 right-0 size-2 rounded-full border border-surface-inverse bg-success-500" />
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
        {onClose ? (
          <button
            aria-label="Close eTax AI Assistant"
            className="grid size-10 shrink-0 place-items-center rounded-full text-grey-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : null}
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
                    ? "rounded-lg rounded-br-sm bg-primary-700 px-3.5 py-3 text-sm leading-6 text-white"
                    : "rounded-lg rounded-bl-sm border border-grey-300 bg-white px-3.5 py-3 text-sm leading-6 text-grey-800 shadow-sm"
                }
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "assistant" && message.nextAction ? (
                <div className="mt-2 rounded-lg border border-primary-200 bg-primary-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase text-primary-700">
                      {message.classification ?? "recommendation"}
                    </p>
                    {typeof message.confidence === "number" ? (
                      <span className="text-[11px] font-bold text-grey-500">
                        {Math.round(message.confidence * 100)}%
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-grey-900">
                    {message.nextAction.title}
                  </p>
                  <Link
                    className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-primary-500 px-3 text-xs font-bold text-white transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                    href={message.nextAction.href}
                    onClick={onClose}
                  >
                    {message.nextAction.label}
                  </Link>
                  {message.sources && message.sources.length > 0 ? (
                    <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-grey-500">
                      Source: {message.sources.join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}

          {messages.length === 1 ? (
            <div className="grid gap-2 pt-1">
              {suggestions.map((suggestion) => (
                <button
                  className="min-h-11 rounded-lg border border-primary-500/30 bg-white px-3 py-2 text-left text-xs font-semibold leading-5 text-primary-900 transition hover:border-primary-500 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
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
            <div className="mr-auto flex min-h-11 items-center gap-2 rounded-lg rounded-bl-sm border border-grey-300 bg-white px-3.5 text-sm text-grey-600 shadow-sm">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary-500" />
              Checking your question…
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        className="shrink-0 border-t border-grey-300 bg-white p-3"
        onSubmit={handleSubmit}
      >
        <div className="flex min-h-[52px] items-end gap-2 rounded-lg border border-grey-300 bg-white p-1.5 transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50">
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
    </div>
  );
}
