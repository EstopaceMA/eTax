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
        // min-w-0: as a grid or flex item a card defaults to min-width:auto, so
        // one wide descendant grows the card and pushes the page sideways.
        "min-w-0 rounded-lg border border-grey-300 bg-grey-50 p-4 shadow-[0_10px_28px_rgba(20,26,33,0.06)] md:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}
