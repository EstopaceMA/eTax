import { AgenticChat } from "@/components/agentic-chat";

export default function AgenticFilingPage() {
  return (
    <div
      className="flex h-[calc(100dvh-144px)] min-h-0 flex-col overflow-hidden bg-white md:h-[calc(100dvh-160px)] lg:h-dvh"
      data-full-bleed="true"
    >
      <h1 className="sr-only">Agentic filing</h1>
      <AgenticChat />
    </div>
  );
}
