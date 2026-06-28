const defaultAuthCallbackPath = "/ai-dance-generator";

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

export function getSafeAuthCallbackPath(requestUrl: URL, fallbackPath = defaultAuthCallbackPath) {
  const requestedRedirect = requestUrl.searchParams.get("redirectTo") ?? fallbackPath;

  return normalizeSameOriginPath(requestedRedirect, requestUrl.origin, fallbackPath);
}

export function createGoogleOAuthSignInRequest(request: Request, callbackURL: string) {
  const requestUrl = new URL(request.url);
  const headers = new Headers({
    "content-type": "application/json",
  });

  return new Request(new URL("/api/auth/sign-in/social", requestUrl.origin), {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider: "google",
      callbackURL,
    }),
  });
}

export async function getOAuthProviderRedirectUrl(response: Response) {
  const location = response.headers.get("location");

  if (location) {
    return location;
  }

  const payload = (await response.json().catch(() => null)) as { url?: unknown } | null;

  return typeof payload?.url === "string" ? payload.url : null;
}

export function copySetCookieHeaders(targetHeaders: Headers, sourceHeaders: Headers) {
  const sourceWithSetCookie = sourceHeaders as HeadersWithSetCookie;
  const cookies = sourceWithSetCookie.getSetCookie?.();

  if (cookies?.length) {
    cookies.forEach((cookie) => targetHeaders.append("set-cookie", cookie));
    return;
  }

  const cookie = sourceHeaders.get("set-cookie");

  if (cookie) {
    targetHeaders.append("set-cookie", cookie);
  }
}

function normalizeSameOriginPath(rawPathOrUrl: string, origin: string, fallbackPath: string) {
  try {
    const targetUrl = new URL(rawPathOrUrl, origin);

    if (targetUrl.origin !== origin) {
      return fallbackPath;
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return fallbackPath;
  }
}
