const turnstileVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const turnstileResponseFieldName = "cf-turnstile-response";
export const turnstileRegisterCookieName = "danceclip_turnstile_register";
export const turnstileRegisterCookieMaxAge = 10 * 60;

type TurnstileEnv = Record<string, string | undefined>;
type FetchLike = typeof fetch;

type TurnstileVerifyInput = {
  token: string | undefined;
  remoteIp?: string;
  env?: TurnstileEnv;
  fetchImpl?: FetchLike;
};

type TurnstileVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export class TurnstileConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurnstileConfigError";
  }
}

export class TurnstileVerificationError extends Error {
  readonly errorCodes: readonly string[];

  constructor(message: string, errorCodes: readonly string[] = []) {
    super(message);
    this.name = "TurnstileVerificationError";
    this.errorCodes = errorCodes;
  }
}

export function getTurnstileSiteKey(env: TurnstileEnv = process.env) {
  return env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export function getTurnstileSecretKey(env: TurnstileEnv = process.env) {
  return env.TURNSTILE_SECRET_KEY?.trim() ?? "";
}

export async function verifyTurnstileToken({
  token,
  remoteIp,
  env = process.env,
  fetchImpl = fetch,
}: TurnstileVerifyInput) {
  const secret = getTurnstileSecretKey(env);

  if (!secret) {
    throw new TurnstileConfigError("TURNSTILE_SECRET_KEY is required to verify registrations.");
  }

  if (!token) {
    throw new TurnstileVerificationError("Turnstile token is required.", ["missing-input-response"]);
  }

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);

  if (remoteIp) {
    body.append("remoteip", remoteIp);
  }

  const response = await fetchImpl(turnstileVerifyUrl, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new TurnstileVerificationError("Turnstile verification request failed.");
  }

  const result = (await response.json().catch(() => null)) as TurnstileVerifyResponse | null;

  if (result?.success !== true) {
    throw new TurnstileVerificationError(
      "Turnstile challenge was not accepted.",
      Array.isArray(result?.["error-codes"]) ? result["error-codes"] : [],
    );
  }

  return result;
}

export function getTurnstileRegisterCookieOptions(maxAge = turnstileRegisterCookieMaxAge) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
