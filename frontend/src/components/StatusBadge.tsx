const STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  pending_approval: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
  edited: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-400",
  sent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
  closed: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? STYLES.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
