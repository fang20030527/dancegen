import {
  deleteOwnedCustomTemplate,
  getOwnedCustomTemplateState,
} from "@/lib/custom-templates/route-operations";
import {
  creatorGuardErrorResponse,
  customTemplateErrorResponse,
  customTemplateJsonResponse,
  requireCustomTemplateUser,
} from "@/lib/custom-templates/route-guards";
import { customTemplateIngestParamsSchema } from "@/lib/custom-templates/route-schemas";

type RouteContext = {
  params: Promise<{ ingestId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  return handleOwnedRequest(request, context, getOwnedCustomTemplateState);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleOwnedRequest(request, context, deleteOwnedCustomTemplate);
}

async function handleOwnedRequest(
  request: Request,
  context: RouteContext,
  operation: (input: { ingestId: string; userId: string }) => Promise<unknown>,
): Promise<Response> {
  const guard = await requireCustomTemplateUser(request);
  if (!guard.ok) {
    return creatorGuardErrorResponse(guard);
  }

  const params = customTemplateIngestParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return customTemplateErrorResponse({ code: "INVALID_REQUEST" });
  }

  try {
    return customTemplateJsonResponse(await operation({
      ingestId: params.data.ingestId,
      userId: guard.userId,
    }));
  } catch (error) {
    return customTemplateErrorResponse(error);
  }
}
