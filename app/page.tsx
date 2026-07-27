import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { ChatbotIcon } from "@/components/chatbot-icon";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-grey-100">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-8 pt-8 sm:px-6 md:px-8">
        <header className="flex items-center justify-between">
          <BrandLogo size="md" priority />
          <Link
            className="text-sm font-extrabold text-primary-700 transition hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2"
            href="/sign-in"
          >
            Sign in
          </Link>
        </header>

        <div className="grid flex-1 content-center gap-6 py-8 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-10 md:py-12">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase text-primary-900">
              <ChatbotIcon size={22} />
              Guided tax workspace
            </div>
            <h1 className="max-w-xl text-4xl font-black leading-[1.03] tracking-normal text-grey-900 sm:text-5xl md:text-6xl">
              File-ready, one step at a time.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-grey-600 md:text-lg md:leading-8">
              eTax keeps your profile, documents, deadlines, and filing status
              in one clear workspace.
            </p>
            <div className="mt-7 grid gap-3 sm:max-w-sm">
              <Link className={`${buttonClass("primary")} w-full`} href="/sign-in">
                Sign in <ArrowRight size={18} aria-hidden />
              </Link>
              <Link className={`${buttonClass("secondary")} w-full`} href="/sign-up">
                Create workspace
              </Link>
            </div>
          </div>

          <Card className="relative overflow-hidden border-primary-200 bg-grey-50">
            <div className="absolute inset-x-0 top-0 h-1 bg-primary-500" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-grey-500">Readiness</p>
                <p className="font-display text-6xl font-black leading-none text-grey-900">
                  62%
                </p>
              </div>
              <div className="grid size-14 place-items-center rounded-lg bg-primary-50 text-primary-700">
                <ShieldCheck size={34} aria-hidden />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 border-y border-dashed border-grey-300 py-3 text-sm font-bold text-grey-700">
              <ReceiptText size={18} aria-hidden />
              Q2 income tax return
            </div>
            <div className="mt-5 space-y-3">
              {[
                "Confirm registered profile",
                "Prepare income records",
                "Update filing status",
              ].map((item, index) => (
                <div
                  className="flex min-h-12 items-center justify-between rounded-lg bg-grey-100 px-4 py-3"
                  key={item}
                >
                  <span className="font-semibold text-grey-800">{item}</span>
                  {index === 0 ? (
                    <CheckCircle2
                      aria-label="Complete"
                      className="text-success-500"
                      size={20}
                    />
                  ) : (
                    <ExternalLink
                      aria-label="Needs review"
                      className="text-grey-500"
                      size={20}
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
