import { cn } from "@/lib/cn";

type CardProps = React.ComponentPropsWithoutRef<"div"> & { interactive?: boolean };

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm",
        interactive &&
          "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}
