import assert from "node:assert/strict";
import test from "node:test";

import { getBetterAuthBaseURL } from "./auth-url.ts";

test("keeps localhost auth URL during development", () => {
  assert.equal(
    getBetterAuthBaseURL(
      {
        BETTER_AUTH_URL: "http://localhost:3000",
        NEXT_PUBLIC_APP_URL: "https://www.danceclip.org",
      },
      false,
    ),
    "http://localhost:3000",
  );
});

test("uses configured production auth URL when it is public", () => {
  assert.equal(
    getBetterAuthBaseURL(
      {
        BETTER_AUTH_URL: "https://www.danceclip.org/",
        NEXT_PUBLIC_APP_URL: "https://preview.example.com",
      },
      true,
    ),
    "https://www.danceclip.org",
  );
});

test("ignores localhost auth URL in production and falls back to app URL", () => {
  assert.equal(
    getBetterAuthBaseURL(
      {
        BETTER_AUTH_URL: "http://localhost:3000",
        NEXT_PUBLIC_APP_URL: "https://www.danceclip.org",
      },
      true,
    ),
    "https://www.danceclip.org",
  );
});

test("uses site URL when app URL is unavailable", () => {
  assert.equal(
    getBetterAuthBaseURL(
      {
        BETTER_AUTH_URL: "http://localhost:3000",
        NEXT_PUBLIC_SITE_URL: "https://www.danceclip.org/ai-dance-generator",
      },
      true,
    ),
    "https://www.danceclip.org",
  );
});

test("falls back to the canonical production URL", () => {
  assert.equal(getBetterAuthBaseURL({ BETTER_AUTH_URL: "http://localhost:3000" }, true), "https://www.danceclip.org");
});
