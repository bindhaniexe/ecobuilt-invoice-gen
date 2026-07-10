import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-rausch text-white hover:bg-rausch-active",
        secondary:
          "border border-ink bg-white text-ink hover:bg-surface-soft",
        tertiary:
          "bg-transparent px-3 text-ink underline-offset-4 hover:underline",
        ghost: "bg-transparent px-3 text-ink hover:bg-surface-soft",
        danger:
          "border border-[#c13515] bg-white text-[#c13515] hover:bg-[#fff4f1]",
      },
      size: {
        default: "h-12",
        sm: "h-10 px-4 text-sm",
        icon: "h-10 w-10 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
