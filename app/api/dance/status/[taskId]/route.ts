import { NextResponse } from "next/server";

import { mockSeedanceProvider } from "@/lib/providers/mock-seedance";

type Params = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { taskId } = await params;
  const task = await mockSeedanceProvider.getDanceVideoStatus(taskId);

  return NextResponse.json({ task });
}
