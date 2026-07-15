import { Workflow, FileCheck2, MessagesSquare } from "lucide-react";
import { LoginForm } from "./LoginForm";

const HIGHLIGHTS = [
  { icon: MessagesSquare, text: "Customer messages triaged the moment they arrive" },
  { icon: FileCheck2, text: "Quotes and invoices drafted, priced, and ready to review" },
  { icon: Workflow, text: "Nothing reaches a customer without your sign-off" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-primary-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-primary-400/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 size-[28rem] rounded-full bg-accent-500/30 blur-3xl"
          aria-hidden="true"
        />

        <span className="relative text-body-sm font-medium uppercase tracking-[0.14em] text-primary-100">
          EnterpriseFlow
        </span>

        <div className="relative space-y-8">
          <h1 className="font-display text-display-lg text-white text-balance">
            Let the agents draft it.
            <br />
            You approve what ships.
          </h1>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-body text-primary-50">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-body-sm text-primary-200">Single-tenant · GST 18% · Human-approved delivery</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-neutral-50 px-6 py-16 lg:w-1/2">
        <div className="mb-10 lg:hidden">
          <span className="font-display text-heading-lg text-neutral-900">EnterpriseFlow</span>
        </div>
        <LoginForm error={error} />
      </div>
    </div>
  );
}
