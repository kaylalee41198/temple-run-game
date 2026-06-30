import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "ghost" | "outline";
type Size = "sm" | "default" | "lg";

const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-90 glow",
  ghost: "bg-transparent hover:bg-muted text-foreground",
  outline: "border bg-transparent hover:bg-muted text-foreground",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-md px-3 text-xs",
  default: "h-11 rounded-lg px-6 text-sm",
  lg: "h-13 rounded-xl px-8 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
