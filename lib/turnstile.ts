const turnstileVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const knownTurnstileErrorCodes = new Set([
  "bad-request",
  "internal-error",
  "invalid-input-response",
  "invalid-input-secret",
  "missing-input-response",
  "missing-input-secret",
  "timeout-or-duplicate",
]);

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

export class TurnstileUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurnstileUnavailableError";
  }
}

export type TurnstileRegisterErrorCode =
  | "turnstile_expired"
  | "turnstile_failed"
  | "turnstile_not_configured"
  | "turnstile_required"
  | "turnstile_unavailable";

export function getTurnstileRegisterErrorCode(
  error: unknown,
): TurnstileRegisterErrorCode {
  if (error instanceof TurnstileConfigError) {
    return "turnstile_not_configured";
  }

  if (error instanceof TurnstileUnavailableError) {
    return "turnstile_unavailable";
  }

  if (
    error instanceof TurnstileVerificationError &&
    error.errorCodes.includes("internal-error")
  ) {
    return "turnstile_unavailable";
  }

  if (
    error instanceof TurnstileVerificationError &&
    error.errorCodes.includes("missing-input-response")
  ) {
    return "turnstile_required";
  }

  if (
    error instanceof TurnstileVerificationError &&
    error.errorCodes.includes("timeout-or-duplicate")
  ) {
    return "turnstile_expired";
  }

  return "turnstile_failed";
}

export function getKnownTurnstileErrorCodes(error: unknown) {
  if (!(error instanceof TurnstileVerificationError)) {
    return [];
  }

  return error.errorCodes.filter((code) => knownTurnstileErrorCodes.has(code));
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

  let response: Response;

  try {
    response = await fetchImpl(turnstileVerifyUrl, {
      method: "POST",
      body,
    });
  } catch {
    throw new TurnstileUnavailableError("Turnstile verification is unavailable.");
  }

  if (!response.ok) {
    throw new TurnstileUnavailableError("Turnstile verification is unavailable.");
  }

  let result: TurnstileVerifyResponse | null;

  try {
    result = (await response.json()) as TurnstileVerifyResponse | null;
  } catch {
    throw new TurnstileUnavailableError("Turnstile verification is unavailable.");
  }

  if (!result) {
    throw new TurnstileUnavailableError("Turnstile verification is unavailable.");
  }

  if (result.success !== true) {
    throw new TurnstileVerificationError(
      "Turnstile challenge was not accepted.",
      Array.isArray(result["error-codes"]) ? result["error-codes"] : [],
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
