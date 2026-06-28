import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  copySetCookieHeaders,
  createGoogleOAuthSignInRequest,
  getOAuthProviderRedirectUrl,
  getSafeAuthCallbackPath,
} from "@/lib/auth-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackURL = getSafeAuthCallbackPath(url);
  const signInRequest = createGoogleOAuthSignInRequest(request, callbackURL);
  const authResponse = await auth.handler(signInRequest);
  const providerRedirectUrl = await getOAuthProviderRedirectUrl(authResponse);

  if (!providerRedirectUrl) {
    return NextResponse.json(
      {
        code: "GOOGLE_OAUTH_START_FAILED",
        message: "Google sign-in could not start.",
      },
      { status: 502 },
    );
  }

  const response = NextResponse.redirect(providerRedirectUrl);
  response.cookies.set("dancegen_demo_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  copySetCookieHeaders(response.headers, authResponse.headers);

  return response;
}
