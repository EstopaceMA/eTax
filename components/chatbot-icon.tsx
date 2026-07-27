import Image from "next/image";

export function ChatbotIcon({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={size}
      src="/eTaxPHChatbotIcon.svg"
      unoptimized
      width={size}
    />
  );
}
