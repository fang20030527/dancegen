import { finalizeCustomTemplateUpload } from "@/lib/custom-templates/route-operations";
import {
  creatorGuardErrorResponse,
  customTemplateErrorResponse,
  customTemplateJsonResponse,
  requireCustomTemplateCreator,
} from "@/lib/custom-templates/route-guards";
import {
  customTemplateFinalizeSchema,
  customTemplateIngestParamsSchema,
} from "@/lib/custom-templates/route-schemas";

type RouteContext = {
  params: Promise<{ ingestId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const guard = await requireCustomTemplateCreator(request);
  if (!guard.ok) {
    return creatorGuardErrorResponse(guard);
  }

  const [params, json] = await Promise.all([context.params, readJson(request)]);
  const parsedParams = customTemplateIngestParamsSchema.safeParse(params);
  const payload = customTemplateFinalizeSchema.safeParse(json);
  if (!parsedParams.success || !payload.success) {
    return customTemplateErrorResponse({ code: "INVALID_REQUEST" });
  }

  try {
    const state = await finalizeCustomTemplateUpload({
      ingestId: parsedParams.data.ingestId,
      userId: guard.userId,
      idempotencyKey: payload.data.idempotencyKey,
    });
    return customTemplateJsonResponse(state, { status: 202 });
  } catch (error) {
    return customTemplateErrorResponse(error);
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
