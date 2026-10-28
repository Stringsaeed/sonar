import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn-arcade inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full whitespace-nowrap select-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "",
        secondary: "[--btn-edge:#1f7c93] [--btn-face:var(--color-sonar-cyan)] [--btn-ink:#03202a]",
        destructive:
          "[--btn-edge:#9b1f2b] [--btn-face:var(--color-sonar-coral)] [--btn-ink:#2a0307]",
        outline:
          "[--btn-depth:5px] [--btn-edge:#06152f] [--btn-face:var(--color-sonar-navy)] [--btn-ink:var(--color-sonar-ink)] border-sonar-green/35",
      },
      size: {
        sm: "h-10 px-4 text-xs",
        default: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        xl: "h-20 px-10 text-[1.75rem] [--btn-depth:9px] sm:h-24 sm:text-4xl",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
