import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary-500 text-white hover:bg-primary-700",
  secondary:
    "border border-[rgba(145,158,171,0.24)] bg-white text-grey-800 hover:border-primary-500 hover:text-primary-700",
  soft: "bg-primary-50 text-primary-900 hover:bg-primary-300/30",
};

export function buttonClass(variant: keyof typeof variants = "primary") {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button className={cn(buttonClass(variant), className)} {...props}>
      {children}
    </button>
  );
}
