import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "h-14 w-full rounded-sm border border-hairline bg-white px-3 text-base text-ink transition-colors placeholder:text-muted focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";
