import { getOwnedCustomTemplatePreview } from "@/lib/custom-templates/route-operations";
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
  const guard = await requireCustomTemplateUser(request);
  if (!guard.ok) {
    return creatorGuardErrorResponse(guard);
  }

  const params = customTemplateIngestParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return customTemplateErrorResponse({ code: "INVALID_REQUEST" });
  }

  try {
    const preview = await getOwnedCustomTemplatePreview({
      ingestId: params.data.ingestId,
      userId: guard.userId,
    });
    return customTemplateJsonResponse(preview);
  } catch (error) {
    return customTemplateErrorResponse(error);
  }
}
