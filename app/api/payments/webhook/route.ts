import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const event = await request.json().catch(() => null);

  return NextResponse.json({
    received: true,
    mode: "stub",
    note: "Creem signature verification and entitlement ledger writes belong here.",
    eventType: event?.type ?? "unknown",
  });
}
