"use client";

import { useEffect, useRef, useState } from "react";

import { turnstileResponseFieldName } from "@/lib/turnstile";

const turnstileScriptId = "cloudflare-turnstile-script";
const turnstileScriptSrc = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileWidgetProps = {
  disabled?: boolean;
  siteKey: string;
  onTokenChange: (token: string) => void;
};

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
    };
    danceclipTurnstileScript?: Promise<void>;
  }
}

export function TurnstileWidget({ disabled = false, siteKey, onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!siteKey) {
      return;
    }

    loadTurnstileScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.turnstile || widgetIdRef.current) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: "register",
          callback: (nextToken) => {
            setToken(nextToken);
            onTokenChange(nextToken);
          },
          "expired-callback": () => {
            setToken("");
            onTokenChange("");
          },
          "error-callback": () => {
            setToken("");
            onTokenChange("");
          },
        });
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(true);
        }
      });

    return () => {
      isMounted = false;

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onTokenChange, siteKey]);

  return (
    <div
      aria-disabled={disabled}
      className={disabled ? "pointer-events-none grid gap-3 opacity-60" : "grid gap-3"}
    >
      <div className="min-h-[74px]" ref={containerRef} />
      <input name={turnstileResponseFieldName} readOnly type="hidden" value={token} />
      {loadError ? (
        <p className="text-sm font-semibold leading-6 text-coral">
          Human verification could not load. Check your connection and try again.
        </p>
      ) : null}
    </div>
  );
}

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve();
  }

  if (window.danceclipTurnstileScript) {
    return window.danceclipTurnstileScript;
  }

  window.danceclipTurnstileScript = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(turnstileScriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = turnstileScriptId;
    script.src = turnstileScriptSrc;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
    document.head.appendChild(script);
  });

  return window.danceclipTurnstileScript;
}
