import { importCustomTemplate } from "@/lib/custom-templates/route-operations";
import {
  creatorGuardErrorResponse,
  customTemplateErrorResponse,
  customTemplateJsonResponse,
  requireCustomTemplateCreator,
} from "@/lib/custom-templates/route-guards";
import {
  customTemplateImportSchema,
  getCustomTemplateRequestErrorCode,
} from "@/lib/custom-templates/route-schemas";

export async function POST(request: Request) {
  const guard = await requireCustomTemplateCreator(request);
  if (!guard.ok) {
    return creatorGuardErrorResponse(guard);
  }

  const payload = customTemplateImportSchema.safeParse(await readJson(request));
  if (!payload.success) {
    return customTemplateErrorResponse({
      code: getCustomTemplateRequestErrorCode(payload.error),
    });
  }

  try {
    const state = await importCustomTemplate({
      userId: guard.userId,
      idempotencyKey: payload.data.idempotencyKey,
      url: payload.data.url,
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
