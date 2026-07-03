import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  size?: "header" | "footer";
};

const logoSizes = {
  header: {
    className: "h-10 w-[158px]",
    sizes: "158px",
  },
  footer: {
    className: "h-14 w-[220px]",
    sizes: "220px",
  },
} as const;

export function BrandLogo({ className, priority = false, size = "header" }: BrandLogoProps) {
  const logoSize = logoSizes[size];

  return (
    <Link
      aria-label="DanceClip AI home"
      className={cn("relative block shrink-0 overflow-hidden", logoSize.className, className)}
      href="/"
    >
      <Image
        alt="DanceClip AI"
        className="scale-[1.85] object-cover object-center invert"
        fill
        priority={priority}
        sizes={logoSize.sizes}
        src="/DanceClipAI.svg"
      />
    </Link>
  );
}
