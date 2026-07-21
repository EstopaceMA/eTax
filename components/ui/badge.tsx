import { cn } from "@/lib/utils";

const styles = {
  grey: "bg-grey-200 text-grey-700",
  primary: "bg-primary-50 text-primary-900",
  info: "bg-cyan-100 text-cyan-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-800",
};

export function Badge({
  children,
  tone = "grey",
}: {
  children: React.ReactNode;
  tone?: keyof typeof styles;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-semibold",
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}
