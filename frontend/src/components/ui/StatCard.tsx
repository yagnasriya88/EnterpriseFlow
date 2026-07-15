import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

export type StatTone = "primary" | "accent" | "success" | "warning" | "info";

const toneChip: Record<StatTone, string> = {
  primary: "bg-primary-50 text-primary-600",
  accent: "bg-accent-50 text-accent-600",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  info: "bg-info-50 text-info-600",
};

const toneTopBorder: Record<StatTone, string> = {
  primary: "before:bg-primary-500",
  accent: "before:bg-accent-500",
  success: "before:bg-success-500",
  warning: "before:bg-warning-500",
  info: "before:bg-info-500",
};

function isZero(value: string) {
  return /^(0|0%|0\.0|~0(\.0)? \w*)$/.test(value.trim());
}

export function StatCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  icon: LucideIcon;
  tone?: StatTone;
}) {
  const zero = isZero(value);
  const content = (
    <Card
      interactive={Boolean(href)}
      className={cn(
        "relative overflow-hidden pt-5 before:absolute before:inset-x-0 before:top-0 before:h-1",
        toneTopBorder[tone]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm text-neutral-500">{label}</p>
          <p
            className={cn(
              "mt-1.5 font-display text-display-md tabular-nums",
              zero ? "text-neutral-300" : "text-neutral-900"
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-body-sm text-neutral-400">{hint}</p>}
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            zero ? "bg-neutral-100 text-neutral-400" : toneChip[tone]
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
