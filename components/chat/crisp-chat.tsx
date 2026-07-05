"use client";

import { useEffect } from "react";

const crispScriptId = "crisp-chat-script";
const crispScriptSrc = "https://client.crisp.chat/l.js";

type CrispChatProps = {
  websiteId?: string;
};

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

export function CrispChat({ websiteId }: CrispChatProps) {
  useEffect(() => {
    const normalizedWebsiteId = websiteId?.trim();

    if (!normalizedWebsiteId) {
      return;
    }

    configureCrisp(normalizedWebsiteId);
    injectCrispScript();
  }, [websiteId]);

  return null;
}

function configureCrisp(websiteId: string) {
  window.$crisp = window.$crisp || [];
  window.CRISP_WEBSITE_ID = websiteId;
}

function injectCrispScript() {
  if (document.getElementById(crispScriptId)) {
    return;
  }

  const script = document.createElement("script");
  script.id = crispScriptId;
  script.src = crispScriptSrc;
  script.async = true;
  document.head.appendChild(script);
}
