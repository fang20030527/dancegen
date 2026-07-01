import { NextResponse } from "next/server";

import { getDanceVideoStatusProvider } from "@/lib/providers/dance-provider";
import { EvolinkConfigError } from "@/lib/providers/evolink-config";
import { EvolinkProviderError } from "@/lib/providers/evolink-seedance";

type Params = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { taskId } = await params;

  try {
    const provider = getDanceVideoStatusProvider(taskId);
    const task = await provider.getDanceVideoStatus(taskId);

    return NextResponse.json({ task });
  } catch (error) {
    const status = error instanceof EvolinkConfigError ? 503 : 502;
    const message =
      error instanceof EvolinkConfigError || error instanceof EvolinkProviderError
        ? error.message
        : "Generation status could not be loaded.";

    return NextResponse.json(
      {
        code: "MODEL_STATUS_FAILED",
        message,
      },
      { status },
    );
  }
}
