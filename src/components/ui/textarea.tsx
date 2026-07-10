import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "min-h-28 w-full resize-y rounded-sm border border-hairline bg-white px-3 py-3 text-base text-ink transition-colors placeholder:text-muted focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
