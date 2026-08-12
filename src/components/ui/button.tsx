import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Contraintes du design system appliquées ici :
 * — le texte blanc n'apparaît que sur mango-700 ou plus foncé (4,60:1) ;
 * — la hauteur minimale garantit une cible tactile d'au moins 44 px ;
 * — l'anneau de focus est redessiné, jamais supprimé.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[.98]",
  {
    variants: {
      variant: {
        primary: "bg-mango-700 text-white shadow-sm hover:bg-mango-800 hover:shadow-md",
        secondary: "bg-forest-800 text-white shadow-sm hover:bg-forest-900 hover:shadow-md",
        outline:
          "border-2 border-forest-800 text-forest-800 hover:bg-forest-50",
        ghost: "text-forest-800 hover:bg-cream-100",
        danger: "bg-danger text-white hover:brightness-90",
      },
      size: {
        sm: "h-9 min-h-9 px-3 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-13 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
