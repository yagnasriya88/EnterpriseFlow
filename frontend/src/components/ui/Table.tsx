import { cn } from "@/lib/cn";

export function Table({ children, className }: React.ComponentPropsWithoutRef<"table">) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm", className)}>
      <table className="w-full text-body-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: React.ComponentPropsWithoutRef<"thead">) {
  return (
    <thead className="bg-primary-50/40">
      <tr className="border-b border-neutral-200 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ className, ...props }: React.ComponentPropsWithoutRef<"th">) {
  return <th className={cn("px-4 py-3", className)} {...props} />;
}

export function Tr({ className, ...props }: React.ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn("border-b border-neutral-100 transition-colors duration-100 last:border-0 hover:bg-primary-50/30", className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.ComponentPropsWithoutRef<"td">) {
  return <td className={cn("px-4 py-3 text-neutral-800", className)} {...props} />;
}
