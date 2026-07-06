import { NextRequest, NextResponse } from "next/server";

import { getSafeAuthCallbackPath } from "@/lib/auth-oauth";
import {
  getTurnstileRegisterCookieOptions,
  turnstileRegisterCookieName,
  turnstileResponseFieldName,
  verifyTurnstileToken,
  TurnstileConfigError,
  TurnstileVerificationError,
} from "@/lib/turnstile";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const redirectTo = getSafeRedirectPath(request, getFormString(formData, "redirectTo"));
  const token = getFormString(formData, turnstileResponseFieldName);

  try {
    await verifyTurnstileToken({
      token,
      remoteIp: getClientIp(request),
    });
  } catch (error) {
    const errorCode = error instanceof TurnstileConfigError ? "turnstile_not_configured" : "turnstile_failed";

    if (!(error instanceof TurnstileConfigError || error instanceof TurnstileVerificationError)) {
      console.error("Unexpected Turnstile verification error", error);
    }

    return redirectToRegister(request.url, redirectTo, errorCode);
  }

  const response = NextResponse.redirect(getGoogleAuthUrl(request.url, redirectTo), { status: 303 });
  response.cookies.set(turnstileRegisterCookieName, "verified", getTurnstileRegisterCookieOptions());

  return response;
}

function getSafeRedirectPath(request: NextRequest, redirectTo?: string) {
  const url = new URL(request.url);

  if (redirectTo) {
    url.searchParams.set("redirectTo", redirectTo);
  }

  return getSafeAuthCallbackPath(url);
}

function redirectToRegister(requestUrl: string, redirectTo: string, error: string) {
  const registerUrl = new URL("/register", requestUrl);
  registerUrl.searchParams.set("redirectTo", redirectTo);
  registerUrl.searchParams.set("error", error);

  return NextResponse.redirect(registerUrl, { status: 303 });
}

function getGoogleAuthUrl(requestUrl: string, redirectTo: string) {
  const googleUrl = new URL("/api/auth/google", requestUrl);
  googleUrl.searchParams.set("redirectTo", redirectTo);

  return googleUrl;
}

function getFormString(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getClientIp(request: NextRequest) {
  const cloudflareIp = request.headers.get("cf-connecting-ip");

  if (cloudflareIp) {
    return cloudflareIp;
  }

  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
}
