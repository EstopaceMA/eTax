import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-grey-100 px-4 py-8">
      <Card className="w-full max-w-md">
        <p className="text-sm font-bold text-primary-700">eTax</p>
        <h1 className="mt-3 text-3xl font-extrabold text-grey-900">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-grey-600">
          Open your taxpayer compliance workspace.
        </p>
        {params.error ? (
          <p className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
            {params.error}
          </p>
        ) : null}
        {params.message ? (
          <p className="mt-4 rounded-xl bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-900">
            {params.message}
          </p>
        ) : null}
        <form action={signIn} className="mt-6 space-y-4">
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
              name="password"
              required
              type="password"
            />
          </label>
          <button className={buttonClass("primary")} type="submit">
            Sign in
          </button>
        </form>
        <p className="mt-6 text-sm text-grey-600">
          Need a workspace?{" "}
          <Link className="font-bold text-primary-700" href="/sign-up">
            Create one
          </Link>
        </p>
      </Card>
    </main>
  );
}
