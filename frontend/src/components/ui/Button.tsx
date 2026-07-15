"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { transitionFast } from "@/lib/motion";

type ButtonVariant = "primary" | "secondary" | "outline" | "destructive" | "ghost";
type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary-300",
  secondary:
    "bg-white text-neutral-800 border border-neutral-200 shadow-xs hover:bg-neutral-50 focus-visible:ring-neutral-300",
  outline:
    "bg-transparent text-neutral-700 border border-neutral-300 hover:bg-neutral-50 focus-visible:ring-neutral-300",
  destructive:
    "bg-danger-500 text-white shadow-sm hover:bg-danger-600 focus-visible:ring-danger-300",
  ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 focus-visible:ring-neutral-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-body-sm gap-1.5",
  md: "h-10 px-4 text-body gap-2",
};

type ButtonProps = Omit<React.ComponentPropsWithoutRef<typeof motion.button>, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  children?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon: Icon,
    iconPosition = "left",
    className,
    disabled,
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      ref={ref}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={transitionFast}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && iconPosition === "left" && <Icon className="size-4" aria-hidden="true" />
      )}
      {children}
      {!loading && Icon && iconPosition === "right" && (
        <Icon className="size-4" aria-hidden="true" />
      )}
    </motion.button>
  );
});
