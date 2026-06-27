import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-acid px-5 py-3 text-ink shadow-acid-ring hover:bg-[#d8ff3b] focus-visible:outline-acid",
        dark: "bg-ink px-5 py-3 text-paper hover:bg-studio focus-visible:outline-ink",
        outline: "border border-ink/15 bg-white/70 px-5 py-3 text-ink hover:bg-white focus-visible:outline-ink",
        ghost: "px-3 py-2 text-ink/72 hover:bg-ink/5 hover:text-ink focus-visible:outline-ink",
        danger: "bg-coral px-5 py-3 text-white hover:bg-[#f25b44] focus-visible:outline-coral",
      },
      size: {
        default: "",
        sm: "px-4 py-2 text-xs",
        icon: "h-10 w-10 p-0",
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

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";
