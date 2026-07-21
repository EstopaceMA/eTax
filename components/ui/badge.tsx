import { cn } from "@/lib/utils";

const styles = {
  grey: "bg-grey-200 text-grey-700",
  primary: "bg-primary-50 text-primary-900",
  info: "bg-blue-100 text-blue-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
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
        "inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize",
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}
