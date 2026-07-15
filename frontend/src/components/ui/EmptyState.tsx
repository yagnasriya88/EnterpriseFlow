import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-0 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="font-display text-heading-md text-neutral-900">{title}</p>
      {description && <p className="max-w-sm text-body-sm text-neutral-500">{description}</p>}
      {action}
    </div>
  );
}
