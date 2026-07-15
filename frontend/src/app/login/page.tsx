import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        action={login}
        className="w-full max-w-sm space-y-5 rounded-xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950"
      >
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            EnterpriseFlow
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Sign in to the admin dashboard.</p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-black dark:text-zinc-50">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/40 dark:border-white/[.2] dark:text-zinc-50 dark:focus:border-white/40"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-black dark:text-zinc-50">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/40 dark:border-white/[.2] dark:text-zinc-50 dark:focus:border-white/40"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
