import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type InputProps = React.ComponentPropsWithoutRef<"input"> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-sm border bg-white px-3.5 py-2.5 text-body text-neutral-800 placeholder:text-neutral-400 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
        invalid
          ? "border-danger-500 focus:border-danger-500"
          : "border-neutral-200 focus:border-primary-400",
        className
      )}
      {...props}
    />
  );
});

type TextareaProps = React.ComponentPropsWithoutRef<"textarea"> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-sm border bg-white px-3.5 py-2.5 text-body text-neutral-800 placeholder:text-neutral-400 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
        invalid
          ? "border-danger-500 focus:border-danger-500"
          : "border-neutral-200 focus:border-primary-400",
        className
      )}
      {...props}
    />
  );
});
