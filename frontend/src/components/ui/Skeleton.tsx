import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-neutral-200/70", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
