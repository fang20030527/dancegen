import { NextResponse } from "next/server";

import { getDanceVideoStatusProvider } from "@/lib/providers/dance-provider";
import { EvolinkConfigError } from "@/lib/providers/evolink-config";
import { EvolinkProviderError } from "@/lib/providers/evolink-seedance";
import { ViggleConfigError } from "@/lib/providers/viggle-config";
import { ViggleProviderError } from "@/lib/providers/viggle-render";

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
    const status = isProviderConfigError(error) ? 503 : 502;
    const message =
      isKnownProviderError(error)
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

function isProviderConfigError(error: unknown) {
  return error instanceof EvolinkConfigError || error instanceof ViggleConfigError;
}

function isKnownProviderError(error: unknown): error is Error {
  return (
    error instanceof EvolinkConfigError ||
    error instanceof EvolinkProviderError ||
    error instanceof ViggleConfigError ||
    error instanceof ViggleProviderError
  );
}
