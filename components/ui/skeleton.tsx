import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn(
        "rounded-md bg-grey-200 motion-safe:animate-pulse motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function SkeletonRegion({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className={className}
      role="status"
    >
      <span className="sr-only">{label}</span>
      {children}
    </section>
  );
}
