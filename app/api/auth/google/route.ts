import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo") ?? "/ai-dance-generator";
  const response = NextResponse.redirect(new URL(`${redirectTo}?demoSession=1`, url.origin));

  response.cookies.set("dancegen_demo_session", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
