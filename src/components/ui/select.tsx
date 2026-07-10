import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative w-full">
    <select
      className={cn(
        "h-14 w-full appearance-none rounded-sm border border-hairline bg-white pl-3 pr-10 text-base text-ink transition-colors focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted",
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-muted"
      aria-hidden="true"
    />
  </div>
));
Select.displayName = "Select";
