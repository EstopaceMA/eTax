import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-grey-100">
      <section className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-8">
        <div>
          <div className="mb-6 inline-flex rounded-full bg-primary-50 px-4 py-2 text-sm font-bold text-primary-900">
            Category-first tax guidance
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-normal text-grey-900 md:text-6xl">
            Know what to prepare before you file.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-grey-600">
            eTax gives Filipino taxpayers a guided workspace for documents,
            deadlines, readiness, and filing status.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className={buttonClass("primary")} href="/sign-up">
              Create workspace <ArrowRight size={18} aria-hidden />
            </Link>
            <Link className={buttonClass("secondary")} href="/sign-in">
              Sign in
            </Link>
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-primary-500" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-grey-500">Readiness</p>
              <p className="font-display text-6xl font-black text-grey-900">
                62%
              </p>
            </div>
            <ShieldCheck className="text-primary-500" size={44} aria-hidden />
          </div>
          <div className="mt-8 space-y-4">
            {[
              "Confirm registered profile",
              "Prepare income records",
              "Update filing status",
            ].map((item, index) => (
              <div
                className="flex items-center justify-between rounded-xl bg-grey-100 px-4 py-3"
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
