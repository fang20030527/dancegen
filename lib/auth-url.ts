const defaultDevelopmentAuthURL = "http://localhost:3000";
const defaultProductionAuthURL = "https://www.danceclip.org";

type AuthURLEnv = Record<string, string | undefined>;

export function getBetterAuthBaseURL(env: AuthURLEnv = process.env, isProduction = process.env.NODE_ENV === "production") {
  const authURL = normalizeAuthURL(env.BETTER_AUTH_URL);

  if (authURL && !(isProduction && isLocalAuthURL(authURL))) {
    return authURL;
  }

  const publicURL = [env.NEXT_PUBLIC_APP_URL, env.NEXT_PUBLIC_SITE_URL]
    .map((candidate) => normalizeAuthURL(candidate))
    .find((candidate) => candidate && !(isProduction && isLocalAuthURL(candidate)));

  if (publicURL) {
    return publicURL;
  }

  return isProduction ? defaultProductionAuthURL : defaultDevelopmentAuthURL;
}

function normalizeAuthURL(rawURL: string | undefined) {
  const value = rawURL?.trim().replace(/\/+$/, "");

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function isLocalAuthURL(authURL: string) {
  const { hostname } = new URL(authURL);

  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "::1";
}
