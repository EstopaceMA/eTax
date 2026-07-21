import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-10 w-32",
  md: "h-12 w-40",
  lg: "h-16 w-56",
};

export function BrandLogo({
  className,
  priority = false,
  size = "md",
}: {
  className?: string;
  priority?: boolean;
  size?: keyof typeof sizes;
}) {
  return (
    <div className={cn("relative overflow-hidden", sizes[size], className)}>
      <Image
        alt="eTax PH"
        className="object-cover"
        fill
        priority={priority}
        sizes={size === "lg" ? "224px" : size === "md" ? "160px" : "128px"}
        src="/eTaxLogo.png"
      />
    </div>
  );
}
