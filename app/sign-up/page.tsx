import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { taxpayerCategories } from "@/lib/taxpayer-categories";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-grey-100 px-3 py-4 md:grid md:place-items-center md:px-4 md:py-8">
      <Card className="mx-auto w-full max-w-3xl">
        <BrandLogo size="sm" priority />
        <h1 className="mt-4 text-3xl font-black leading-tight text-grey-900">
          Create workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-grey-600">
          First, choose the taxpayer category closest to your situation. This
          sets the starting profile for your checklist and filing tracker.
        </p>
        {params.error ? (
          <p className="mt-4 rounded-lg bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
            {params.error}
          </p>
        ) : null}
        <form action={signUp} className="mt-6 space-y-4">
          <fieldset>
            <legend className="text-sm font-bold text-grey-700">
              Which taxpayer category are you?
            </legend>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {taxpayerCategories.map((category) => (
                <label
                  className="group block cursor-pointer rounded-lg border border-grey-300 bg-white p-4 transition hover:border-primary-500 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
                  key={category.key}
                >
                  <div className="flex items-start gap-3">
                    <input
                      className="mt-1 h-4 w-4 accent-primary-500"
                      defaultChecked={category.key === "self_employed_professional"}
                      name="taxpayer_category"
                      required
                      type="radio"
                      value={category.key}
                    />
                    <div>
                      <span className="block font-bold text-grey-900">
                        {category.label}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-grey-600">
                        {category.plainLanguage}
                      </span>
                      <span className="mt-3 inline-flex rounded-full bg-grey-200 px-3 py-1 text-xs font-bold text-grey-700 group-has-[:checked]:bg-white">
                        Usually {category.usualForm}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-grey-500">
              Based on the taxpayer category reference from BetterGov Tax
              Directory and common registration paths. This is guidance, not
              tax advice.
            </p>
          </fieldset>
          <label className="block">
            <span className="text-sm font-bold text-grey-700">Full name</span>
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-grey-300 bg-white px-3 text-grey-900 focus:border-primary-500 focus:outline-2 focus:outline-offset-2"
              name="full_name"
              required
              type="text"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-grey-700">Email</span>
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-grey-300 bg-white px-3 text-grey-900 focus:border-primary-500 focus:outline-2 focus:outline-offset-2"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-grey-700">Password</span>
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-grey-300 bg-white px-3 text-grey-900 focus:border-primary-500 focus:outline-2 focus:outline-offset-2"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>
          <button className={`${buttonClass("primary")} w-full`} type="submit">
            Create workspace
          </button>
        </form>
        <p className="mt-6 text-sm text-grey-600">
          Already have access?{" "}
          <Link className="font-bold text-primary-700" href="/sign-in">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
