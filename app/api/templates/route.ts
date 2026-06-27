import { NextResponse } from "next/server";

import { getPublicDanceTemplates } from "@/lib/dance/templates";

export function GET() {
  return NextResponse.json({
    templates: getPublicDanceTemplates(),
  });
}
