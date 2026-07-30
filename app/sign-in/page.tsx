import { signIn } from "@/app/actions/auth";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { SsoSignInButton } from "@/components/sso-sign-in-button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-grey-100 px-3 py-4 md:grid md:place-items-center md:px-4 md:py-8">
      <Card className="mx-auto w-full max-w-md">
        <BrandLogo size="sm" priority />
        <h1 className="mt-4 text-3xl font-black leading-tight text-grey-900">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-grey-600">
          Sign in with your eGov account to open your taxpayer compliance
          workspace.
        </p>
        {params.error ? (
          <p className="mt-4 rounded-lg bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
            {params.error}
          </p>
        ) : null}
        {params.message ? (
          <p className="mt-4 rounded-lg bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-900">
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
            <span className="text-sm font-bold text-grey-700">
              Exchange code{" "}
              <span className="font-semibold text-grey-500">(optional)</span>
            </span>
            <input
              autoComplete="off"
              className="mt-2 min-h-11 w-full rounded-lg border border-grey-300 bg-white px-3 font-mono text-sm text-grey-900 focus:border-primary-500 focus:outline-2 focus:outline-offset-2"
              name="exchange_code"
              spellCheck={false}
              type="text"
            />
            <span className="mt-2 block text-xs leading-5 text-grey-600">
              For testing only. eGovPH SSO requires a single-use exchange code
              to return your profile, and this environment has no redirect
              integration to obtain one automatically. Paste a freshly generated
              code to sign in with live eGovPH data. Leave this blank to use the
              profile saved from a previous sign-in.
            </span>
          </label>
          <SsoSignInButton />
        </form>
        <p className="mt-6 text-sm text-grey-600">
          No eGov account yet? Register in the eGov app first, then sign in
          here.
        </p>
      </Card>
    </main>
  );
}
