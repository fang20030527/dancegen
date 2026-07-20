import {
  customTemplatePrepareSchema,
  getCustomTemplateRequestErrorCode,
} from "@/lib/custom-templates/route-schemas";
import {
  creatorGuardErrorResponse,
  customTemplateErrorResponse,
  customTemplateJsonResponse,
  requireCustomTemplateCreator,
} from "@/lib/custom-templates/route-guards";
import { prepareCustomTemplateUpload } from "@/lib/custom-templates/route-operations";

export async function POST(request: Request) {
  const guard = await requireCustomTemplateCreator(request);
  if (!guard.ok) {
    return creatorGuardErrorResponse(guard);
  }

  const payload = customTemplatePrepareSchema.safeParse(await readJson(request));
  if (!payload.success) {
    return customTemplateErrorResponse({
      code: getCustomTemplateRequestErrorCode(payload.error),
    });
  }

  try {
    const prepared = await prepareCustomTemplateUpload({
      userId: guard.userId,
      idempotencyKey: payload.data.idempotencyKey,
      contentType: payload.data.contentType,
      sizeBytes: payload.data.sizeBytes,
    });

    return customTemplateJsonResponse({
      ingestId: prepared.ingest.id,
      uploadUrl: prepared.uploadUrl,
      uploadHeaders: prepared.uploadHeaders,
      expiresInSeconds: prepared.expiresInSeconds,
    }, { status: 201 });
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
