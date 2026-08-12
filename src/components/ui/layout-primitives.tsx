import * as React from "react";
import { cn } from "@/lib/utils";

/** Gouttières : 16 px mobile, 24 px tablette, 32 px au-delà. Contenu max 1280 px. */
export function Container({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}

/** Rythme vertical : 48 px sur mobile, 96 px à partir de lg. */
export function Section({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("py-12 lg:py-24", className)} {...props} />;
}

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className="max-w-[42rem]">
        <h2 className="text-[1.375rem] font-semibold text-forest-900 lg:text-[1.875rem]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
