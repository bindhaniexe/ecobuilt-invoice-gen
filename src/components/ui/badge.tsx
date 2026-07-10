import * as React from "react";

import { cn } from "@/lib/utils";

const badgeStyles = {
  draft: "border-hairline bg-surface-soft text-muted",
  pending: "border-[#f7c948] bg-[#fff8db] text-[#5c4813]",
  paid: "border-[#b7e4c7] bg-[#edf7ed] text-[#245536]",
  overdue: "border-[#f3b4a2] bg-[#fff4f1] text-[#c13515]",
  neutral: "border-hairline bg-white text-ink",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof badgeStyles;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        badgeStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
