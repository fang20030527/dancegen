"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, CreditCard, LogOut, Mail, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type UserStatusMenuProps = {
  accountLabel: string | null;
  creditsLabel: string;
  isSignedIn: boolean;
  planLabel: string;
  statusLabel: "Signed in" | "Signed out";
};

const googleSignInHref = "/register?redirectTo=/ai-dance-generator";

export function UserStatusMenu({
  accountLabel,
  creditsLabel,
  isSignedIn,
  planLabel,
  statusLabel,
}: UserStatusMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuId = useId();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const displayAccount = accountLabel ?? "Not connected";

  async function signOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        credentials: "same-origin",
        method: "POST",
      });
    } finally {
      setIsOpen(false);
      setIsSigningOut(false);
      router.refresh();
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "flex max-w-[190px] items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-2 text-xs font-bold text-paper/78 shadow-sm transition hover:bg-white/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acid sm:max-w-[260px]",
          isOpen && "bg-white/12 text-paper",
        )}
        onClick={() => setIsOpen((current) => !current)}
        title={displayAccount}
        type="button"
      >
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", isSignedIn ? "bg-acid" : "bg-white/32")}
          aria-hidden="true"
        />
        <span className="shrink-0">{statusLabel}</span>
        <span className="hidden truncate text-paper sm:block">{displayAccount}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("shrink-0 transition", isOpen && "rotate-180")}
          size={14}
          strokeWidth={2.4}
        />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[calc(100vw-2rem)] max-w-[21rem] overflow-hidden rounded-[24px] border border-ink/12 bg-[#f8f8f6] p-3 text-ink shadow-[0_24px_80px_rgba(9,9,7,0.24)]"
          id={menuId}
          role="dialog"
        >
          <div className="rounded-[20px] bg-ink p-4 text-paper">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-paper/46">Account status</p>
                <p className="mt-2 truncate text-sm font-black">{isSignedIn ? displayAccount : "Guest"}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
                  isSignedIn ? "bg-acid text-ink" : "bg-white/12 text-paper/68",
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <StatusRow icon={<Mail size={16} />} label="Google account" value={displayAccount} />
            <StatusRow icon={<CreditCard size={16} />} label="Credits remaining" value={creditsLabel} />
            <StatusRow icon={<Sparkles size={16} />} label="Current plan" value={planLabel} />
          </div>

          {isSignedIn ? (
            <div className="mt-3 grid gap-2">
              <Link
                className="flex items-center justify-between rounded-[18px] border border-ink/10 bg-white px-4 py-3 text-sm font-black text-ink transition hover:border-ink/22 hover:bg-acid"
                href="/pricing"
                onClick={() => setIsOpen(false)}
              >
                Manage plan
                <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.4} />
              </Link>
              <button
                className="flex items-center justify-between rounded-[18px] border border-ink/10 bg-white/72 px-4 py-3 text-left text-sm font-black text-ink/72 transition hover:border-ink/22 hover:bg-white hover:text-ink disabled:pointer-events-none disabled:opacity-55"
                disabled={isSigningOut}
                onClick={signOut}
                type="button"
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
                <LogOut aria-hidden="true" size={16} strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <a
              className="mt-3 flex items-center justify-between rounded-[18px] border border-ink/10 bg-acid px-4 py-3 text-sm font-black text-ink transition hover:bg-[#d8ff3b]"
              href={googleSignInHref}
            >
              Connect Google
              <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.4} />
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

type StatusRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function StatusRow({ icon, label, value }: StatusRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-ink/8 bg-white/74 px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-acid" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-ink/42">{label}</p>
        <p className="mt-0.5 truncate text-sm font-black text-ink">{value}</p>
      </div>
    </div>
  );
}
