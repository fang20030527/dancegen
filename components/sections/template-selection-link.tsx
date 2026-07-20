"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { trackProductEvent } from "@/lib/analytics/client";

type TemplateSelectionLinkProps = {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  href: string;
};

export function TemplateSelectionLink({
  ariaLabel,
  children,
  className,
  href,
}: TemplateSelectionLinkProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className={className}
      href={href}
      onClick={() => trackProductEvent("select_template", { source: "platform" })}
    >
      {children}
    </Link>
  );
}
