import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Chaque badge porte toujours un texte : la couleur n'est jamais le seul
 * véhicule de l'information (WCAG 1.4.1).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        ambient: "bg-cream-200 text-forest-900",
        fresh: "bg-forest-50 text-forest-800",
        refrigerated: "bg-ocean-50 text-ocean-700",
        frozen: "bg-ocean-700 text-white",
        inStock: "bg-forest-50 text-success",
        lowStock: "bg-mango-50 text-warning",
        outOfStock: "bg-cream-200 text-muted",
        incoming: "bg-gold-400 text-forest-900",
        promo: "bg-mango-700 text-white",
        new: "bg-forest-800 text-white",
        neutral: "bg-cream-100 text-muted",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
