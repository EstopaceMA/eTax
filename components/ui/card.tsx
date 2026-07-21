import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[rgba(145,158,171,0.16)] bg-white p-5 shadow-[0_8px_24px_rgba(20,26,33,0.04)] md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
