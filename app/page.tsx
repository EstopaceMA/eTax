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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-grey-100">
      <section className="mx-auto grid min-h-screen max-w-6xl content-start gap-6 px-4 pb-8 pt-5 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-8 md:py-8">
        <div className="pt-2 md:pt-0">
          <BrandLogo className="mb-6" size="lg" priority />
          <div className="mb-5 inline-flex rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase text-primary-900">
            Category-first tax guidance
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-normal text-grey-900 md:text-6xl">
            Know what to prepare before you file.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-grey-600 md:text-lg md:leading-8">
            eTax gives Filipino taxpayers a guided workspace for documents,
            deadlines, readiness, and filing status.
          </p>
          <div className="mt-7 grid gap-3 sm:flex-row md:flex md:items-center">
            <Link className={`${buttonClass("primary")} w-full sm:w-auto`} href="/sign-up">
              Create workspace <ArrowRight size={18} aria-hidden />
            </Link>
            <Link className={`${buttonClass("secondary")} w-full sm:w-auto`} href="/sign-in">
              Sign in
            </Link>
          </div>
        </div>

        <Card className="relative overflow-hidden border-primary-200 bg-grey-50">
          <div className="absolute inset-y-0 left-0 w-1 bg-primary-500" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-grey-500">Readiness</p>
              <p className="font-display text-6xl font-black text-grey-900">
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
          <div className="mt-8 space-y-4">
            {[
              "Confirm registered profile",
              "Prepare income records",
              "Update filing status",
            ].map((item, index) => (
              <div
                className="flex items-center justify-between rounded-lg bg-grey-100 px-4 py-3"
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
      </section>
    </main>
  );
}
